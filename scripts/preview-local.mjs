// Manual evaluation against the same isolated fixture used by browser tests.
// No production accounts, email, Groq, or push requests are made.
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { dirname } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const unsigned = encode({alg:'HS256',typ:'JWT'}) + '.' + encode({role:'anon',iss:'local-e2e-fixture',exp:4102444800})
const fixtureKey = unsigned + '.' + createHmac('sha256','local-e2e-fixture-secret-never-use-in-production').update(unsigned).digest('base64url')
const env = {
  ...process.env,
  PATH: dirname(process.execPath) + ':/usr/local/bin:/usr/bin:/bin',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: fixtureKey,
  SUPABASE_SERVICE_ROLE_KEY: '', GROQ_API_KEY: '',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', CRON_SECRET: '',
  NEXT_TELEMETRY_DISABLED: '1', LOCAL_PREVIEW: '1',
}
const children = []
function start(args) {
  const child = spawn(process.execPath,args,{env,stdio:'inherit'})
  children.push(child)
  child.once('exit', code => { if (code && !stopping) { stop(); process.exitCode = code } })
  return child
}
let stopping = false
function stop() { stopping = true; for (const child of children) child.kill('SIGTERM') }
process.on('SIGINT',stop); process.on('SIGTERM',stop)
try {
  start(['scripts/e2e-backend.mjs'])
  let ready = false
  for (let i=0;i<60;i++) {
    try { ready = (await fetch('http://127.0.0.1:54321/__fixture/health',{signal:AbortSignal.timeout(500)})).ok } catch { /* Starting. */ }
    if (ready) break
    await sleep(500)
  }
  if (!ready) throw new Error('The local fixture did not start.')
  start(['node_modules/next/dist/bin/next','dev','--webpack','--port','3100','--hostname','127.0.0.1'])
  console.log('LOCAL EVALUATION ONLY — http://127.0.0.1:3100 — learner-a@test.local / Fixture-Only-123!')
} catch (error) { console.error(error.message); stop(); process.exitCode = 1 }
