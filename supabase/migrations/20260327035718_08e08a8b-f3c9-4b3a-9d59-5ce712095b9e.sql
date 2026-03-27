
-- ============================================
-- FIX #1: Lock down user_roles table
-- Add explicit admin-only policies for INSERT/UPDATE/DELETE
-- ============================================

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX #2: Remove new_password column from password_reset_requests
-- This column stored plaintext passwords - security risk
-- ============================================

ALTER TABLE public.password_reset_requests DROP COLUMN IF EXISTS new_password;

-- Update the request_password_reset function to remove new_password references
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

  _secure_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.password_reset_requests (user_id, identifier, phone, secure_token)
  VALUES (_user_id, _normalized, _phone, _secure_token)
  RETURNING short_id INTO _short_id;

  RETURN json_build_object('success', true, 'short_id', _short_id, 'username', COALESCE(_username, ''));
END;
$function$;

-- ============================================
-- FIX #3: Filter site_settings - hide sensitive keys from public
-- Only expose non-sensitive settings publicly
-- ============================================

DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  key NOT IN (
    'whatsapp_admin_numbers'
  )
);
