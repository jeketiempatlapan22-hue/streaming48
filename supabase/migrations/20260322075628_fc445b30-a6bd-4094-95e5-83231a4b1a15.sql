
CREATE TABLE public.live_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage polls" ON public.live_polls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active polls" ON public.live_polls FOR SELECT TO public
  USING (is_active = true);

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.poll_votes FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can vote" ON public.poll_votes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can change vote" ON public.poll_votes FOR DELETE TO public USING (true);
CREATE POLICY "Admins can manage votes" ON public.poll_votes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
