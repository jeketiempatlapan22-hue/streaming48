
-- Block authenticated users from inserting password_reset_requests directly
-- Only the SECURITY DEFINER RPC function should insert
DROP POLICY IF EXISTS "Authenticated can insert reset requests" ON public.password_reset_requests;

-- Ensure no INSERT policy exists for non-admin
CREATE POLICY "Only admins can insert reset requests"
ON public.password_reset_requests
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
