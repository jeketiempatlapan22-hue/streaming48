
-- 1. Create show-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('show-images', 'show-images', true);

-- Storage policies for show-images
CREATE POLICY "Anyone can view show images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'show-images');
CREATE POLICY "Admins can upload show images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'show-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete show images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'show-images' AND public.has_role(auth.uid(), 'admin'));

-- 2. Create coin-proofs storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('coin-proofs', 'coin-proofs', true);

CREATE POLICY "Anyone can view coin proofs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'coin-proofs');
CREATE POLICY "Authenticated can upload coin proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'coin-proofs' AND (SELECT auth.uid()) IS NOT NULL);

-- 3. Add missing columns to tokens table
ALTER TABLE public.tokens ADD COLUMN IF NOT EXISTS duration_type text DEFAULT 'daily';
ALTER TABLE public.tokens ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 4. Create confirm_coin_order RPC
CREATE OR REPLACE FUNCTION public.confirm_coin_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  new_bal INTEGER;
BEGIN
  SELECT * INTO o FROM public.coin_orders WHERE id = _order_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order tidak ditemukan atau sudah diproses');
  END IF;

  -- Update order status
  UPDATE public.coin_orders SET status = 'confirmed' WHERE id = _order_id;

  -- Upsert coin balance
  INSERT INTO public.coin_balances (user_id, balance)
  VALUES (o.user_id, o.coin_amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = coin_balances.balance + o.coin_amount, updated_at = now();

  SELECT balance INTO new_bal FROM public.coin_balances WHERE user_id = o.user_id;

  RETURN jsonb_build_object('success', true, 'new_balance', new_bal);
END;
$$;

-- 5. Add unique constraint on coin_balances.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coin_balances_user_id_key') THEN
    ALTER TABLE public.coin_balances ADD CONSTRAINT coin_balances_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 6. Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
