-- Serialize a student's reviews before reading their previous SM-2 state.
-- Lock the existing profile: the first review has no vocabulary row to lock yet.
begin;
create or replace function public.review_vocabulary(word_id_param int, quality_param int)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  progress public.user_vocabulary%rowtype;
  q int;
  next_interval int;
  next_repetitions int;
  next_ease double precision;
  reviewed_at timestamptz := now();
begin
  if actor is null then raise exception 'unauthorized' using errcode='42501'; end if;
  if word_id_param is null or word_id_param < 1 or quality_param is null or quality_param not between 0 and 3 then
    raise exception 'invalid_review' using errcode='22023';
  end if;
  if not exists(select 1 from public.vocabulary where id=word_id_param) then
    raise exception 'word_not_found' using errcode='23503';
  end if;

  perform 1 from public.user_profiles where id=actor for update;
  if not found then raise exception 'profile_not_found' using errcode='42501'; end if;
  select * into progress from public.user_vocabulary where user_id=actor and word_id=word_id_param;
  if not found then
    progress.srs_interval := 1;
    progress.srs_repetitions := 0;
    progress.srs_ease_factor := 2.5;
  end if;

  -- De nuevo / Difícil / Bien / Fácil correspond to SM-2 quality 0 / 2 / 4 / 5.
  q := (array[0,2,4,5])[quality_param+1];
  if q < 3 then
    next_interval := 1;
    next_repetitions := 0;
    next_ease := progress.srs_ease_factor;
  else
    next_interval := case when progress.srs_repetitions=0 then 1
      when progress.srs_repetitions=1 then 6
      else floor(progress.srs_interval*progress.srs_ease_factor+0.5)::int end;
    next_repetitions := progress.srs_repetitions+1;
    next_ease := greatest(1.3,progress.srs_ease_factor+0.1-(5-q)*(0.08+(5-q)*0.02));
  end if;

  insert into public.user_vocabulary(user_id,word_id,srs_interval,srs_repetitions,srs_ease_factor,next_review_at,last_reviewed_at,mastered)
  values(actor,word_id_param,next_interval,next_repetitions,next_ease,reviewed_at+make_interval(days=>next_interval),reviewed_at,next_repetitions>=4 and next_interval>=21)
  on conflict(user_id,word_id) do update set
    srs_interval=excluded.srs_interval,srs_repetitions=excluded.srs_repetitions,
    srs_ease_factor=excluded.srs_ease_factor,next_review_at=excluded.next_review_at,
    last_reviewed_at=excluded.last_reviewed_at,mastered=excluded.mastered
  returning * into progress;

  return jsonb_build_object('word_id',progress.word_id,'srs_interval',progress.srs_interval,
    'srs_repetitions',progress.srs_repetitions,'srs_ease_factor',progress.srs_ease_factor,
    'next_review_at',progress.next_review_at,'mastered',progress.mastered);
end;
$$;
revoke all on function public.review_vocabulary(int,int) from public,anon,authenticated;
grant execute on function public.review_vocabulary(int,int) to authenticated;
revoke insert,update,delete on public.user_vocabulary from public,anon,authenticated;
grant select on public.user_vocabulary to authenticated;
commit;
