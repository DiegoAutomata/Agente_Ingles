-- Transactional, account-scoped progress. Apply after 001-004.
begin;
revoke all on function public.increment_xp(int,uuid) from public, anon, authenticated;
revoke all on function public.advance_lesson(uuid) from public, anon, authenticated;
grant execute on function public.increment_xp(int,uuid) to service_role;
revoke insert, update, delete on public.user_profiles from anon, authenticated;
grant select on public.user_profiles to authenticated;
alter function public.increment_xp(int,uuid) set search_path = public;
alter function public.advance_lesson(uuid) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.get_leaderboard(text) set search_path = public;
revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.get_leaderboard(text) to authenticated;

create table public.activity_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_key text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,activity_key)
);
alter table public.activity_completions enable row level security;
create policy activity_read_self on public.activity_completions for select to authenticated using (user_id=auth.uid());
revoke all on public.activity_completions from public,anon,authenticated;
grant select on public.activity_completions to authenticated;

create or replace function public.complete_activity(activity_mode text, expected_league text, expected_lesson int)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  actor uuid := auth.uid(); profile public.user_profiles%rowtype; result jsonb;
  activity_key_value text; reward int; idx int;
  leagues text[] := array['bronce','plata','oro','diamante','maestro','gran_maestro'];
  levels int[] := array[11,10,10,8,8,6];
begin
  if actor is null then raise exception 'unauthorized' using errcode='42501'; end if;
  if activity_mode not in ('lesson','challenge') or expected_lesson is null or expected_league is null then raise exception 'invalid_activity'; end if;
  idx := array_position(leagues,expected_league);
  if idx is null or expected_lesson < 1 or expected_lesson > levels[idx] then raise exception 'invalid_activity'; end if;
  select * into strict profile from public.user_profiles where id=actor for update;
  activity_key_value := case when activity_mode='lesson' then 'lesson:'||expected_league||':'||expected_lesson else 'challenge:'||(now() at time zone 'UTC')::date end;
  select c.result into result from public.activity_completions c where c.user_id=actor and c.activity_key=activity_key_value;
  if found then return result || jsonb_build_object('replayed',true,'xp_awarded',0); end if;
  if profile.league<>expected_league or profile.ghio_lesson<>expected_lesson then raise exception 'progress_conflict' using errcode='P0001'; end if;
  reward := case when activity_mode='lesson' then 100 else 160 end;
  if activity_mode='lesson' then
    if expected_lesson < levels[idx] then
      update public.user_profiles set ghio_lesson=ghio_lesson+1 where id=actor;
    elsif idx < array_length(leagues,1) then
      update public.user_profiles set league=leagues[idx+1],ghio_lesson=1 where id=actor;
    else
      update public.user_profiles set ghio_lesson_completed=true where id=actor;
    end if;
  end if;
  perform public.increment_xp(reward,actor);
  select * into strict profile from public.user_profiles where id=actor;
  result := jsonb_build_object('xp_awarded',reward,'xp_total',profile.xp,'next_lesson',profile.ghio_lesson,'new_league',profile.league,'maxed',profile.ghio_lesson_completed,'replayed',false);
  insert into public.activity_completions values(actor,activity_key_value,result,now());
  return result;
end;
$$;
revoke all on function public.complete_activity(text,text,int) from public,anon;
grant execute on function public.complete_activity(text,text,int) to authenticated;

-- Session persistence is atomic and idempotent. Session analysis never awards XP.
alter table public.conversations add column source_label text;
create unique index conversations_source_unique on public.conversations(user_id,source_label);
create or replace function public.save_session_analysis(session_label text, session_mode text, transcript jsonb, analysis jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor uuid := auth.uid(); conversation_id uuid; existing jsonb; current_profile jsonb;
begin
  if actor is null then raise exception 'unauthorized' using errcode='42501'; end if;
  if length(session_label)>100 or session_label is null or session_mode not in ('conversation','writing','lesson','verb_drill','vocabulary') then raise exception 'invalid_session'; end if;
  select profile_json into strict current_profile from public.learner_profile where user_id=actor for update;
  select sa.errors_json into existing from public.conversations c join public.session_analysis sa on sa.session_id=c.id where c.user_id=actor and c.source_label=session_label;
  if found then return jsonb_build_object('ok',true,'replayed',true); end if;
  insert into public.conversations(user_id,mode,transcript_json,source_label) values(actor,session_mode,transcript,session_label) returning id into conversation_id;
  insert into public.session_analysis(user_id,session_id,errors_json,wins_json,vocabulary_used,ai_notes)
  values(actor,conversation_id,analysis->'errors',analysis->'wins',analysis->'vocabulary_used',analysis->>'ai_notes');
  insert into public.error_log(user_id,session_id,error_type,pattern,context,user_attempt,correct_form)
  select actor,conversation_id,e->>'type',e->>'pattern',e->>'context',e->>'user_attempt',e->>'correct_form' from jsonb_array_elements(analysis->'errors') e;
  update public.learner_profile set updated_at=now(),profile_json=current_profile || jsonb_build_object(
    'strengths',analysis->'updated_strengths','weaknesses',analysis->'updated_weaknesses',
    'focus_areas',analysis->'updated_weaknesses','vocabulary_struggling',analysis->'vocabulary_struggling',
    'error_patterns',analysis->'errors', 'session_count',coalesce((current_profile->>'session_count')::int,0)+1,
    'last_week_summary',analysis->>'week_summary') where user_id=actor;
  return jsonb_build_object('ok',true,'replayed',false);
end;
$$;
revoke all on function public.save_session_analysis(text,text,jsonb,jsonb) from public,anon;
grant execute on function public.save_session_analysis(text,text,jsonb,jsonb) to authenticated;
commit;
