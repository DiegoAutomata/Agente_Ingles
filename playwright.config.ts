import { defineConfig, devices } from '@playwright/test'
import { createHmac } from 'node:crypto'

const node = process.execPath
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
const token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ role: 'anon', iss: 'local-e2e-fixture', exp: 4102444800 })
const fixtureKey = token + '.' + createHmac('sha256', 'local-e2e-fixture-secret-never-use-in-production').update(token).digest('base64url')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: './test-results/artifacts',
  reporter: [['list'], ['html', { outputFolder: 'test-results/report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: node + ' scripts/e2e-backend.mjs',
      url: 'http://127.0.0.1:54321/__fixture/health',
      reuseExistingServer: false,
      timeout: 45_000,
      env: { PATH: node.slice(0,node.lastIndexOf('/')) + ':/usr/local/bin:/usr/bin:/bin' },
    },
    {
      command: node + ' node_modules/next/dist/bin/next dev --webpack --port 3100 --hostname 127.0.0.1',
      url: 'http://127.0.0.1:3100/login',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PATH: node.slice(0,node.lastIndexOf('/')) + ':/usr/local/bin:/usr/bin:/bin',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: fixtureKey,
        SUPABASE_SERVICE_ROLE_KEY: '',
        GROQ_API_KEY: '',
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: '',
        VAPID_PRIVATE_KEY: '',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
})
