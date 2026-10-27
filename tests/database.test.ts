import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { beforeAll, afterAll, expect, it } from 'vitest'

let db: PGlite
const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    alter default privileges in schema public grant all on tables to authenticated,anon;`)
  for (const file of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
  await db.exec(`insert into auth.users values ('${a}','a@test.local'),('${b}','b@test.local');
    grant select on all tables in schema public to authenticated;
    set role authenticated; set request.jwt.claim.sub = '${a}';`)
}, 30000)
afterAll(async () => db?.close())
it('does not expose arbitrary XP and advancement RPCs', async () => {
  const result = await db.query<{ allowed: boolean }>(`select has_function_privilege('authenticated','public.increment_xp(integer,uuid)','execute') as allowed`)
  expect(result.rows[0].allowed).toBe(false)
})
it('rejects direct profile edits', async () => {
  await expect(db.exec(`update public.user_profiles set xp=999 where id='${a}'`)).rejects.toThrow(/permission denied/i)
})
it('completes a lesson once and returns the persisted reward on retry', async () => {
  const first = await db.query<{ result: { xp_awarded: number } }>(`select public.complete_activity('lesson','bronce',1) as result`)
  expect(first.rows[0].result.xp_awarded).toBe(100)
  await db.exec(`select public.complete_activity('lesson','bronce',1)`)
  const result = await db.query<{ xp: number; ghio_lesson: number }>(`select xp,ghio_lesson from public.user_profiles`)
  expect(result.rows).toEqual([{ xp: 100, ghio_lesson: 2 }])
})
it('rejects skipped lessons without advancing or granting XP', async () => {
  await expect(db.exec(`select public.complete_activity('lesson','plata',4)`)).rejects.toThrow(/progress_conflict/)
})
it('caps challenge reward at once per UTC day', async () => {
  await db.exec(`select public.complete_activity('challenge','bronce',2); select public.complete_activity('challenge','bronce',2)`)
  expect((await db.query<{xp: number}>(`select xp from public.user_profiles`)).rows[0].xp).toBe(260)
})
it('never modifies another account', async () => {
  await db.exec('reset role')
  expect((await db.query<{xp: number}>(`select xp from public.user_profiles where id='${b}'`)).rows[0].xp).toBe(0)
})
it('promotes at a league boundary and records the final course completion', async () => {
  await db.exec(`update public.user_profiles set ghio_lesson=11 where id='${a}'; set role authenticated; set request.jwt.claim.sub='${a}'; select public.complete_activity('lesson','bronce',11)`)
  expect((await db.query<{league:string;ghio_lesson:number}>(`select league,ghio_lesson from public.user_profiles`)).rows).toEqual([{league:'plata',ghio_lesson:1}])
  await db.exec(`reset role; update public.user_profiles set league='gran_maestro',ghio_lesson=6 where id='${a}'; set role authenticated; select public.complete_activity('lesson','gran_maestro',6); select public.complete_activity('lesson','gran_maestro',6)`)
  expect((await db.query<{xp:number;ghio_lesson_completed:boolean}>(`select xp,ghio_lesson_completed from public.user_profiles`)).rows).toEqual([{xp:460,ghio_lesson_completed:true}])
})
it('saves an analysis once and rolls back a failed analysis completely', async () => {
  const analysis = {errors:[],wins:['Bien'],vocabulary_used:[],vocabulary_struggling:[],updated_weaknesses:[],updated_strengths:[],ai_notes:'',week_summary:'Primera sesión'}
  await db.query(`select public.save_session_analysis($1,$2,$3::jsonb,$4::jsonb)`,['test-session','conversation','[]',JSON.stringify(analysis)])
  await db.query(`select public.save_session_analysis($1,$2,$3::jsonb,$4::jsonb)`,['test-session','conversation','[]',JSON.stringify(analysis)])
  expect((await db.query<{count:number}>(`select count(*)::int as count from public.conversations`)).rows[0].count).toBe(1)
  expect((await db.query<{count:number}>(`select (profile_json->>'session_count')::int as count from public.learner_profile`)).rows[0].count).toBe(1)
  const broken = {...analysis,errors:[{type:'grammar'}]}
  await expect(db.query(`select public.save_session_analysis($1,$2,$3::jsonb,$4::jsonb)`,['failed-session','conversation','[]',JSON.stringify(broken)])).rejects.toThrow()
  expect((await db.query<{count:number}>(`select count(*)::int as count from public.conversations`)).rows[0].count).toBe(1)
})
