CREATE OR REPLACE FUNCTION public.self_reset_token_session(_token_code text, _fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t RECORD; _allowed boolean;
BEGIN
  SELECT * INTO t FROM public.tokens WHERE code = _token_code AND status = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Token tidak valid'); END IF;

  SELECT public.check_rate_limit('self_reset:' || _token_code, 2, 86400) INTO _allowed;
  IF NOT _allowed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batas reset tercapai (2x per 24 jam). Coba lagi nanti.');
  END IF;

  DELETE FROM public.token_sessions WHERE token_id = t.id AND is_active = true;

  INSERT INTO public.token_sessions (token_id, fingerprint, user_agent)
  VALUES (t.id, _fingerprint, '');

  RETURN jsonb_build_object('success', true);
END; $$;