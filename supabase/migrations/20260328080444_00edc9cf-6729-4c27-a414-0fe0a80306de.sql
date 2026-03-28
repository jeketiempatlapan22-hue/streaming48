
CREATE OR REPLACE FUNCTION public.confirm_regular_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o RECORD;
  s RECORD;
  new_code TEXT;
  _expires_at TIMESTAMPTZ;
  _show_dt TIMESTAMPTZ;
BEGIN
  -- Get the order
  SELECT * INTO o FROM public.subscription_orders WHERE id = _order_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order tidak ditemukan atau sudah diproses');
  END IF;

  -- Update order status
  UPDATE public.subscription_orders SET status = 'confirmed' WHERE id = _order_id;

  -- Get the show
  SELECT * INTO s FROM public.shows WHERE id = o.show_id;
  IF NOT FOUND OR s.is_subscription = true THEN
    RETURN jsonb_build_object('success', true, 'type', 'subscription');
  END IF;

  -- Always generate a unique token code for regular shows (both logged-in and guest)
  new_code := 'ORD-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  -- Calculate expiry based on show schedule
  IF s.schedule_date IS NOT NULL AND s.schedule_date != '' THEN
    _show_dt := public.parse_show_datetime(s.schedule_date, COALESCE(s.schedule_time, '23.59 WIB'));
    IF _show_dt IS NOT NULL THEN
      _expires_at := date_trunc('day', _show_dt AT TIME ZONE 'Asia/Jakarta') + interval '23 hours 59 minutes 59 seconds';
      _expires_at := _expires_at AT TIME ZONE 'Asia/Jakarta';
      IF _expires_at < now() THEN
        _expires_at := now() + interval '24 hours';
      END IF;
    ELSE
      _expires_at := now() + interval '24 hours';
    END IF;
  ELSE
    _expires_at := now() + interval '24 hours';
  END IF;

  -- Create token linked to user (or NULL for guest) and show
  INSERT INTO public.tokens (code, show_id, user_id, max_devices, expires_at)
  VALUES (new_code, o.show_id, o.user_id, 1, _expires_at);

  RETURN jsonb_build_object(
    'success', true,
    'type', 'regular',
    'token_code', new_code,
    'expires_at', _expires_at
  );
END;
$$;
