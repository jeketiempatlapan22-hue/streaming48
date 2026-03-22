CREATE OR REPLACE FUNCTION public.create_token_session(_token_code text, _fingerprint text, _user_agent text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t RECORD;
  active_count INTEGER;
  existing RECORD;
  effective_max INTEGER;
BEGIN
  SELECT * INTO t FROM public.tokens WHERE code = _token_code AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token tidak valid');
  END IF;

  IF t.expires_at IS NOT NULL AND t.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token telah kedaluwarsa');
  END IF;

  IF COALESCE(t.is_public, false) = true THEN
    RETURN jsonb_build_object('success', true, 'public', true);
  END IF;

  effective_max := GREATEST(COALESCE(t.max_devices, 1), 1);

  -- Serialize session creation per token to avoid race conditions across devices
  PERFORM pg_advisory_xact_lock(hashtextextended(t.id::text, 0));

  -- Cleanup stale sessions so viewers are not blocked forever by abrupt disconnects
  UPDATE public.token_sessions
  SET is_active = false
  WHERE token_id = t.id
    AND is_active = true
    AND last_seen_at < now() - interval '6 hours';

  SELECT * INTO existing
  FROM public.token_sessions
  WHERE token_id = t.id AND fingerprint = _fingerprint AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.token_sessions
    SET last_seen_at = now(), user_agent = _user_agent
    WHERE id = existing.id;
    RETURN jsonb_build_object('success', true);
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.token_sessions
  WHERE token_id = t.id AND is_active = true;

  IF active_count >= effective_max THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_limit',
      'max_devices', effective_max,
      'active_devices', active_count
    );
  END IF;

  INSERT INTO public.token_sessions (token_id, fingerprint, user_agent)
  VALUES (t.id, _fingerprint, _user_agent);

  RETURN jsonb_build_object('success', true);
END;
$function$;