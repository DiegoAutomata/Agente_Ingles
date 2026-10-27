/**
 * LOCAL TEST FIXTURE ONLY. It is not Supabase and must never serve production.
 * Auth users use @test.local. PostgreSQL migrations and RLS run in PGlite.
 * Implements only the GoTrue/PostgREST surface needed by the browser tests.
 */
import { createServer } from 'node:http'
import { readFileSync, readdirSync } from 'node:fs'
import { createHmac, randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

const port = Number(process.env.E2E_BACKEND_PORT ?? 54321)
const origin = 'http://127.0.0.1:3100'
const db = new PGlite()
const users = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'learner-a@test.local' },
  { id: '22222222-2222-4222-8222-222222222222', email: 'learner-b@test.local' },
]
const password = 'Fixture-Only-123!'
const access = new Map()
const refresh = new Map()

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to authenticated,anon;
`)
for (const file of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
}
await db.exec('grant select on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated;')
async function reset() {
  access.clear(); refresh.clear()
  await db.exec('delete from auth.users')
  for (const user of users) await db.query('insert into auth.users(id,email) values($1,$2)', [user.id,user.email])
}
await reset()

function publicUser(user) {
  return {
    ...user, aud: 'authenticated', role: 'authenticated',
    email_confirmed_at: '2026-01-01T00:00:00Z', confirmed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'], fixture: true },
    user_metadata: { fixture: true }, identities: [],
  }
}
function session(user) {
  const now = Math.floor(Date.now()/1000)
  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')
  const payload = Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600,iss:`http://127.0.0.1:${port}/auth/v1`,jti:randomUUID()})).toString('base64url')
  const signature = createHmac('sha256','local-e2e-fixture-secret-never-use-in-production').update(`${header}.${payload}`).digest('base64url')
  const token = `${header}.${payload}.${signature}`
  const refreshToken = randomUUID()
  access.set(token,user); refresh.set(refreshToken,user)
  return { access_token:token, token_type:'bearer', expires_in:3600, expires_at:now+3600, refresh_token:refreshToken, user:publicUser(user) }
}
function identifier(value) {
  if (!/^[a-z_][a-z_0-9]*$/.test(value)) throw new Error('Unsupported fixture SQL identifier')
  return `"${value}"`
}
function columns(select = '*') {
  return select === '*' ? '*' : select.split(',').map(identifier).join(',')
}
const tables = new Set(['user_profiles','learner_profile','vocabulary','user_vocabulary','lessons','conversations','session_analysis','error_log','activity_completions','push_subscriptions'])
const functions = new Set(['complete_activity','get_leaderboard','save_session_analysis','review_vocabulary'])
async function body(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  return raw ? JSON.parse(raw) : {}
}
function respond(res,status,data) {
  res.writeHead(status,{'Content-Type':'application/json','X-Test-Fixture':'local-only'})
  res.end(data === undefined ? undefined : JSON.stringify(data))
}
async function actorQuery(actor, work) {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${actor ? 'authenticated' : 'anon'}`)
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor?.id ?? ''])
    return work(tx)
  })
}

const server = createServer(async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin',origin)
  res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers'] ?? 'authorization,apikey,content-type,x-client-info,prefer,accept')
  res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Expose-Headers','Content-Range')
  if (req.method === 'OPTIONS') return respond(res,204)
  const url = new URL(req.url,`http://127.0.0.1:${port}`)
  const token = req.headers.authorization?.replace(/^Bearer /i,'')
  const actor = access.get(token)
  try {
    if (url.pathname === '/__fixture/health') return respond(res,200,{fixture:true,ready:true})
    if (url.pathname === '/__fixture/reset' && req.method === 'POST') {
      await reset(); return respond(res,200,{fixture:true,reset:true})
    }
    if (url.pathname === '/auth/v1/token') {
      const input = await body(req)
      const user = url.searchParams.get('grant_type') === 'refresh_token'
        ? refresh.get(input.refresh_token)
        : users.find(u => u.email === input.email && input.password === password)
      return user ? respond(res,200,session(user)) : respond(res,400,{error:'invalid_grant',error_description:'Invalid fixture credentials',msg:'Invalid fixture credentials'})
    }
    if (url.pathname === '/auth/v1/user') {
      return actor ? respond(res,200,publicUser(actor)) : respond(res,401,{code:'bad_jwt',msg:'Fixture session expired'})
    }
    if (url.pathname === '/auth/v1/logout') {
      if (token) access.delete(token)
      return respond(res,204)
    }
    if (url.pathname === '/auth/v1/recover') return respond(res,200,{fixture:true})
    if (url.pathname === '/auth/v1/signup') {
      const input = await body(req)
      if (!input.email?.endsWith('@test.local')) return respond(res,400,{msg:'Only @test.local fixture users are allowed'})
      const user = {id:randomUUID(),email:input.email}
      users.push(user)
      await db.query('insert into auth.users(id,email) values($1,$2)',[user.id,user.email])
      return respond(res,200,session(user))
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').pop()
      if (!functions.has(name)) return respond(res,404,{message:'RPC outside local fixture scope'})
      const input = await body(req)
      const keys = Object.keys(input)
      const sql = `select public.${identifier(name)}(${keys.map((k,i) => `${identifier(k)} => $${i+1}`).join(',')}) as result`
      const result = await actorQuery(actor,tx => tx.query(sql,keys.map(k => typeof input[k] === 'object' ? JSON.stringify(input[k]) : input[k])))
      return respond(res,200,result.rows[0]?.result)
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').pop()
      if (!tables.has(table)) return respond(res,404,{message:'Table outside local fixture scope'})
      const values = []
      const filters = []
      for (const [key,value] of url.searchParams) {
        if (['select','order','limit','on_conflict'].includes(key)) continue
        const dot = value.indexOf('.')
        const operator = value.slice(0,dot)
        const operand = value.slice(dot+1)
        const ops = {eq:'=',lt:'<',lte:'<=',gt:'>',gte:'>='}
        if (!(operator in ops)) throw new Error('Filter outside local fixture scope')
        values.push(operand)
        filters.push(`${identifier(key)} ${ops[operator]} $${values.length}`)
      }
      const where = filters.length ? ' where '+filters.join(' and ') : ''
      const select = columns(url.searchParams.get('select') ?? '*')
      let result
      if (req.method === 'GET' || req.method === 'HEAD') {
        let sql = `select ${select} from public.${identifier(table)}${where}`
        if (url.searchParams.has('order')) sql += ' order by '+url.searchParams.get('order').split(',').map(x => { const [c,dir] = x.split('.'); return identifier(c)+(dir === 'desc' ? ' desc' : ' asc') }).join(',')
        if (url.searchParams.has('limit')) sql += ' limit '+Math.min(1000,Math.max(0,Number(url.searchParams.get('limit'))||0))
        result = await actorQuery(actor,tx => tx.query(sql,values))
      } else if (req.method === 'POST') {
        const row = await body(req)
        const keys = Object.keys(row)
        let sql = `insert into public.${identifier(table)}(${keys.map(identifier).join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`
        const conflict = url.searchParams.get('on_conflict')
        if (conflict && req.headers.prefer?.includes('resolution=merge-duplicates')) {
          sql += ` on conflict(${conflict.split(',').map(identifier).join(',')}) do update set ${keys.map(k=>`${identifier(k)}=excluded.${identifier(k)}`).join(',')}`
        }
        sql += ` returning ${select}`
        result = await actorQuery(actor,tx => tx.query(sql,keys.map(k => typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k])))
      } else {
        return respond(res,405,{message:'Method outside local fixture scope'})
      }
      const rows = result.rows
      res.setHeader('Content-Range',`0-${Math.max(0,rows.length-1)}/${rows.length}`)
      if (req.method === 'HEAD') return respond(res,200)
      if (req.headers.accept?.includes('application/vnd.pgrst.object+json')) {
        if (rows.length !== 1) return respond(res,406,{code:'PGRST116',details:`The result contains ${rows.length} rows`,message:'Cannot coerce the result to a single JSON object'})
        return respond(res,200,rows[0])
      }
      return respond(res,200,rows)
    }
    return respond(res,404,{fixture:true,message:'Endpoint outside local fixture scope'})
  } catch (error) {
    console.error('[local fixture]',req.method,url.pathname,error.message)
    return respond(res,error.code === '42501' ? 403 : 400,{code:error.code ?? 'FIXTURE_ERROR',message:error.message})
  }
})
server.listen(port,'127.0.0.1',() => console.log(`LOCAL E2E FIXTURE ONLY: http://127.0.0.1:${port} (migrations + RLS in PGlite)`))
async function close() { server.close(); await db.close(); process.exit(0) }
process.once('SIGTERM',close); process.once('SIGINT',close)
