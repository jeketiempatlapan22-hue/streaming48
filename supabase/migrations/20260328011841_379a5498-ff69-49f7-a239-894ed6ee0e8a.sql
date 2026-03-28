
-- Viewer count table: lightweight heartbeat-based counter
CREATE TABLE public.viewer_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text NOT NULL UNIQUE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_viewer_counts_last_seen ON public.viewer_counts(last_seen_at);

-- Enable RLS
ALTER TABLE public.viewer_counts ENABLE ROW LEVEL SECURITY;

-- Anyone can read viewer counts
CREATE POLICY "Anyone can read viewer counts" ON public.viewer_counts FOR SELECT TO public USING (true);

-- Anyone can upsert their heartbeat
CREATE POLICY "Anyone can upsert heartbeat" ON public.viewer_counts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update heartbeat" ON public.viewer_counts FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete own heartbeat" ON public.viewer_counts FOR DELETE TO public USING (true);

-- Function to get current viewer count (cleanup stale + count)
CREATE OR REPLACE FUNCTION public.get_viewer_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.viewer_counts
  WHERE last_seen_at > now() - interval '90 seconds';
$$;

-- Function to heartbeat (upsert) viewer
CREATE OR REPLACE FUNCTION public.viewer_heartbeat(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.viewer_counts (viewer_key, last_seen_at)
  VALUES (_key, now())
  ON CONFLICT (viewer_key) DO UPDATE SET last_seen_at = now();
END;
$$;

-- Function to remove viewer
CREATE OR REPLACE FUNCTION public.viewer_leave(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.viewer_counts WHERE viewer_key = _key;
END;
$$;

-- Cleanup function for stale viewers (called by existing cleanup_old_logs or cron)
CREATE OR REPLACE FUNCTION public.cleanup_stale_viewers()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.viewer_counts WHERE last_seen_at < now() - interval '2 minutes';
$$;
