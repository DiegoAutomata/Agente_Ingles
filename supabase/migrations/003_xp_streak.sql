-- ============================================================
-- increment_xp: incrementa XP y actualiza racha diaria
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_xp(
  xp_amount     int,
  user_id_param uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_id    uuid := COALESCE(user_id_param, auth.uid());
  last_session timestamptz;
BEGIN
  SELECT last_session_at
    INTO last_session
    FROM public.user_profiles
   WHERE id = target_id;

  UPDATE public.user_profiles
     SET xp              = xp + xp_amount,
         streak          = CASE
           WHEN last_session IS NULL
             THEN 1
           WHEN DATE(last_session AT TIME ZONE 'UTC') = CURRENT_DATE - INTERVAL '1 day'
             THEN streak + 1          -- ayer → incrementar racha
           WHEN DATE(last_session AT TIME ZONE 'UTC') = CURRENT_DATE
             THEN streak              -- misma sesión del día, no duplicar
           ELSE 1                     -- rompió la racha → resetear a 1
         END,
         last_session_at = NOW(),
         updated_at      = NOW()
   WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_xp(int, uuid) TO authenticated;
