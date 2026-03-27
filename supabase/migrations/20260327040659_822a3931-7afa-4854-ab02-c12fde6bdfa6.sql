
-- FIX: Restrict streams table - only admins can read directly
-- Public uses get_stream_status() RPC which only exposes safe fields
DROP POLICY IF EXISTS "Anyone can view streams" ON public.streams;
DROP POLICY IF EXISTS "Anyone can view active streams" ON public.streams;
DROP POLICY IF EXISTS "Public can view active streams" ON public.streams;

-- Check existing policies and add restrictive ones
CREATE POLICY "Only admins can read streams"
ON public.streams
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon cannot read streams"
ON public.streams
FOR SELECT
TO anon
USING (false);

-- FIX: Restrict playlists direct access - use get_safe_playlists() RPC
DROP POLICY IF EXISTS "Anyone can view playlists" ON public.playlists;
DROP POLICY IF EXISTS "Anyone can view active playlists" ON public.playlists;
DROP POLICY IF EXISTS "Public can view active playlists" ON public.playlists;

CREATE POLICY "Only admins can read playlists"
ON public.playlists
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon cannot read playlists"
ON public.playlists
FOR SELECT
TO anon
USING (false);

-- FIX: Restrict chat_messages SELECT to hide token_id and user_id
-- Users should use get_chat_messages() RPC instead
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;

CREATE POLICY "Only admins can read all chat messages"
ON public.chat_messages
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Authenticated read own chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()
);
