
-- RPC to create a show order, works for both authenticated and anonymous users
-- Returns the order id and short_id so both get the same treatment
CREATE OR REPLACE FUNCTION public.create_show_order(
  _show_id uuid,
  _phone text,
  _email text DEFAULT NULL,
  _payment_proof_url text DEFAULT NULL,
  _payment_method text DEFAULT 'qris'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _order_id uuid;
  _short_id text;
BEGIN
  -- Get current user if authenticated (NULL for anon)
  _user_id := auth.uid();

  INSERT INTO public.subscription_orders (show_id, user_id, phone, email, payment_proof_url, payment_method)
  VALUES (_show_id, _user_id, _phone, _email, _payment_proof_url, _payment_method)
  RETURNING id, short_id INTO _order_id, _short_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'short_id', _short_id
  );
END;
$$;
