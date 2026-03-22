
-- Tighten poll_votes INSERT policy to require valid fields
DROP POLICY IF EXISTS "Anyone can vote" ON public.poll_votes;
CREATE POLICY "Anyone can vote"
  ON public.poll_votes FOR INSERT TO public
  WITH CHECK (
    poll_id IS NOT NULL AND
    voter_id IS NOT NULL AND
    length(voter_id) > 0 AND
    option_index >= 0 AND
    EXISTS (SELECT 1 FROM public.live_polls WHERE id = poll_id AND is_active = true)
  );
