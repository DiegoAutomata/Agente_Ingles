import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { POST } from '../src/app/api/srs-review/route'

const actor = '11111111-1111-4111-8111-111111111111'
const otherActor = '22222222-2222-4222-8222-222222222222'
const boundary = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null }) },
    rpc: boundary.rpc,
  }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }))

interface Progress {
  word_id: number
  srs_interval: number
  srs_repetitions: number
  srs_ease_factor: number
  next_review_at: string
  mastered: boolean
}
let db: PGlite
async function review(quality: number, wordId = 3) {
  const result = await db.query<{ progress: Progress }>(
    'select public.review_vocabulary($1,$2) as progress', [wordId, quality],
  )
  return result.rows[0].progress
}
function request() {
  return new Request('http://localhost/api/srs-review', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordId: 3, quality: 2 }),
  })
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    alter default privileges in schema public grant all on tables to authenticated,anon;`)
  for (const file of readdirSync('supabase/migrations').sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
  }
  await db.exec(`insert into auth.users values ('${actor}','a@test.local'),('${otherActor}','b@test.local')`)
  boundary.rpc.mockImplementation(async (_name: string, input: { word_id_param: number; quality_param: number }) => {
    try {
      return { data: await review(input.quality_param, input.word_id_param), error: null }
    } catch (error) {
      return { data: null, error }
    }
  })
}, 30000)
beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
  await db.exec(`reset role; truncate public.user_vocabulary; set role authenticated; set request.jwt.claim.sub = '${actor}';`)
})
afterAll(async () => db?.close())

it('counts both HTTP reviews of the same word without losing either first review', async () => {
  // PGlite queues SQL on one connection; each HTTP request must submit one whole transaction.
  const responses = await Promise.all([POST(request()), POST(request())])
  expect(responses.map(response => response.status)).toEqual([200, 200])
  const bodies = await Promise.all(responses.map(response => response.json()))
  expect(bodies.map(body => body.review.repetitions).sort()).toEqual([1, 2])
  expect(bodies.map(body => body.review.interval).sort((a, b) => a - b)).toEqual([1, 6])
  const saved = await db.query<{ srs_repetitions: number }>('select srs_repetitions from public.user_vocabulary')
  expect(saved.rows).toEqual([{ srs_repetitions: 2 }])
})

it('preserves the SM-2 intervals and mastery threshold through the database operation', async () => {
  const reviews = []
  for (let count = 0; count < 4; count++) reviews.push(await review(2))
  expect(reviews.map(progress => progress.srs_interval)).toEqual([1, 6, 15, 38])
  expect(reviews[3]).toMatchObject({ srs_repetitions: 4, srs_ease_factor: 2.5, mastered: true })
  const reset = await review(0)
  expect(reset).toMatchObject({ srs_repetitions: 0, srs_interval: 1, srs_ease_factor: 2.5, mastered: false })
})

it('maps hard and easy ratings without changing the established scheduling rule', async () => {
  expect(await review(3)).toMatchObject({ srs_repetitions: 1, srs_interval: 1 })
  const hard = await review(1)
  expect(hard).toMatchObject({ srs_repetitions: 0, srs_interval: 1 })
  expect(hard.srs_ease_factor).toBeCloseTo(2.6)
})

it('scopes both progress and visible rows to auth.uid()', async () => {
  await review(2)
  await db.exec(`set request.jwt.claim.sub = '${otherActor}'`)
  expect(await review(2)).toMatchObject({ srs_repetitions: 1 })
  expect((await db.query('select user_id from public.user_vocabulary')).rows).toEqual([{ user_id: otherActor }])
  await db.exec('reset role')
  expect((await db.query('select srs_repetitions from public.user_vocabulary order by user_id')).rows)
    .toEqual([{ srs_repetitions: 1 }, { srs_repetitions: 1 }])
})

it('denies anonymous execution and unauthenticated identities', async () => {
  await db.exec('reset role; set role anon')
  await expect(review(2)).rejects.toThrow(/permission denied/i)
  await db.exec("reset role; set role authenticated; set request.jwt.claim.sub = ''")
  await expect(review(2)).rejects.toThrow(/unauthorized/i)
})

it('rejects direct writes that would bypass the atomic scheduling operation', async () => {
  await expect(db.exec(`insert into public.user_vocabulary(user_id,word_id) values('${actor}',3)`))
    .rejects.toThrow(/permission denied/i)
})

it('validates ratings in SQL and maps a missing word to API 404', async () => {
  await expect(review(4)).rejects.toThrow(/invalid_review/i)
  await expect(review(2, 99999)).rejects.toThrow(/word_not_found/i)
  const response = await POST(new Request('http://localhost/api/srs-review', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordId: 99999, quality: 2 }),
  }))
  expect(response.status).toBe(404)
  expect((await db.query('select * from public.user_vocabulary')).rows).toEqual([])
})
