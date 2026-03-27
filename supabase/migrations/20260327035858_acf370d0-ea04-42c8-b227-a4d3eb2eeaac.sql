
-- ============================================
-- FIX #4: Moderators table - add explicit deny for non-admin
-- Prevent any non-admin from seeing moderator accounts
-- ============================================

-- Add a SELECT policy that blocks non-admin authenticated users
CREATE POLICY "Non-admins cannot view moderators"
ON public.moderators
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Block public/anon access explicitly
CREATE POLICY "Public cannot access moderators"
ON public.moderators
FOR SELECT
TO anon
USING (false);
