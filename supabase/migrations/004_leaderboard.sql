-- ============================================================
-- Leaderboard: columna username + RPC get_leaderboard
-- ============================================================

-- Columna username en user_profiles (derivada del email por defecto)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Poblar username para usuarios existentes (parte antes del @)
UPDATE public.user_profiles up
SET username = split_part(au.email, '@', 1)
FROM auth.users au
WHERE up.id = au.id
  AND up.username IS NULL;

-- Actualizar trigger para guardar username al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username)
  VALUES (new.id, split_part(new.email, '@', 1));

  INSERT INTO public.learner_profile (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$;

-- ============================================================
-- RPC: get_leaderboard — Top 50 por liga, ordenado por XP
-- ============================================================

DROP FUNCTION IF EXISTS public.get_leaderboard(text);

CREATE FUNCTION public.get_leaderboard(league_filter text)
RETURNS TABLE (
  rank    bigint,
  user_id uuid,
  username text,
  xp      int,
  streak  int,
  league  text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY xp DESC)::bigint AS rank,
    id        AS user_id,
    COALESCE(username, 'Anónimo') AS username,
    xp,
    streak,
    league
  FROM public.user_profiles
  WHERE league = league_filter
  ORDER BY xp DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text) TO authenticated;
