-- Allow anonymous users to create subscription orders (guest orders with no user_id)
CREATE POLICY "Anon can create guest orders"
ON public.subscription_orders
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Allow anonymous users to upload payment proofs
CREATE POLICY "Anon can upload payment proofs"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow anon to read their uploaded proofs (for signed URL generation)
CREATE POLICY "Anon can read payment proofs"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'payment-proofs');