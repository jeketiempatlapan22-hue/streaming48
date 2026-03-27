
-- Update request_password_reset to store hashed secure_token
CREATE OR REPLACE FUNCTION public.request_password_reset(_identifier text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid; _phone text; _username text; _short_id text;
  _normalized text; _email_lookup text; _allowed boolean;
  _secure_token text;
BEGIN
  _normalized := trim(_identifier);
  IF _normalized = '' THEN RETURN json_build_object('success', false, 'error', 'Masukkan nomor HP atau email'); END IF;

  SELECT public.check_rate_limit('pw_reset:' || _normalized, 3, 600) INTO _allowed;
  IF NOT _allowed THEN
    RETURN json_build_object('success', false, 'error', 'Terlalu banyak percobaan. Tunggu beberapa menit.');
  END IF;

  IF _normalized ~ '^[0-9]' THEN
    _email_lookup := regexp_replace(_normalized, '[^0-9]', '', 'g') || '@rt48.user';
  ELSE
    _email_lookup := _normalized;
  END IF;

  SELECT id INTO _user_id FROM auth.users WHERE email = _email_lookup;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Akun tidak ditemukan');
  END IF;

  IF EXISTS (SELECT 1 FROM public.password_reset_requests WHERE user_id = _user_id AND status = 'pending' AND created_at > now() - interval '1 hour') THEN
    RETURN json_build_object('success', false, 'error', 'Sudah ada permintaan reset yang belum diproses. Tunggu admin mengkonfirmasi.');
  END IF;

  SELECT username INTO _username FROM public.profiles WHERE id = _user_id;

  IF _normalized ~ '^[0-9]' THEN
    _phone := regexp_replace(_normalized, '[^0-9]', '', 'g');
  ELSE
    _phone := '';
  END IF;

  -- Generate plaintext token (returned to user) and store HASHED version
  _secure_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.password_reset_requests (user_id, identifier, phone, secure_token)
  VALUES (_user_id, _normalized, _phone, public.hash_token(_secure_token))
  RETURNING short_id INTO _short_id;

  RETURN json_build_object('success', true, 'short_id', _short_id, 'username', COALESCE(_username, ''), 'secure_token', _secure_token);
END;
$function$;
