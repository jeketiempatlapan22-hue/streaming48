
-- Add index on chat_messages for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Update cleanup function to also clean stale viewers
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < now() - interval '30 days';
  DELETE FROM public.auth_metrics WHERE created_at < now() - interval '30 days';
  DELETE FROM public.security_events WHERE created_at < now() - interval '30 days';
  DELETE FROM public.suspicious_activity_log WHERE created_at < now() - interval '30 days';
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM public.telegram_messages WHERE processed = true AND created_at < now() - interval '7 days';
  -- Clean stale viewer heartbeats
  DELETE FROM public.viewer_counts WHERE last_seen_at < now() - interval '2 minutes';
END;
$function$;
