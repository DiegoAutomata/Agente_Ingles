-- ============================================================
-- Liga system: columna league + RPC advance_lesson
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS league text NOT NULL DEFAULT 'bronce';

-- RPC: avanza lección dentro de la liga, promueve de liga si llega al máximo
CREATE OR REPLACE FUNCTION public.advance_lesson(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  curr_lesson  int;
  curr_league  text;
  max_levels   int;
  curr_idx     int;
  league_order text[]  := ARRAY['bronce','plata','oro','diamante','maestro','gran_maestro'];
  league_levels int[]  := ARRAY[11,10,10,8,8,6];
BEGIN
  SELECT ghio_lesson, league
  INTO curr_lesson, curr_league
  FROM public.user_profiles
  WHERE id = user_id_param;

  curr_idx   := array_position(league_order, curr_league);
  max_levels := league_levels[curr_idx];

  IF curr_lesson >= max_levels THEN
    -- Promover de liga si no está en la última
    IF curr_idx < array_length(league_order, 1) THEN
      UPDATE public.user_profiles
      SET ghio_lesson = 1,
          league      = league_order[curr_idx + 1],
          updated_at  = now()
      WHERE id = user_id_param;

      RETURN jsonb_build_object(
        'promoted',   true,
        'new_league', league_order[curr_idx + 1],
        'next_lesson', 1
      );
    ELSE
      -- Ya en Gran Maestro, no avanza más
      RETURN jsonb_build_object('promoted', false, 'maxed', true, 'next_lesson', curr_lesson);
    END IF;
  ELSE
    UPDATE public.user_profiles
    SET ghio_lesson = curr_lesson + 1,
        updated_at  = now()
    WHERE id = user_id_param;

    RETURN jsonb_build_object('promoted', false, 'next_lesson', curr_lesson + 1);
  END IF;
END;
$$;
