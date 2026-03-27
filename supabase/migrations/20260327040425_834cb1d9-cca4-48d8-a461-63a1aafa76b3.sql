
-- FIX #3: Create RPC for chat messages that hides user_id
CREATE OR REPLACE FUNCTION public.get_chat_messages(_limit int DEFAULT 100)
RETURNS TABLE(
  id uuid,
  message text,
  username text,
  is_admin boolean,
  is_pinned boolean,
  is_deleted boolean,
  token_id text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, message, username, is_admin, is_pinned, is_deleted, token_id, created_at
  FROM public.chat_messages
  WHERE is_deleted = false
  ORDER BY created_at DESC
  LIMIT _limit;
$$;
