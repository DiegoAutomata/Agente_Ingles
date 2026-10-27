# Local browser fixture

This suite starts the unchanged Next application on 127.0.0.1:3100 and a deliberately limited local HTTP fixture on 127.0.0.1:54321. It never connects to production Supabase or Groq. Browser requests to other hosts are blocked.

The fixture executes every SQL migration in supabase/migrations, in filename order, against an ephemeral PGlite PostgreSQL database. Account isolation and progress RPCs therefore use the repository SQL and RLS. Its GoTrue and PostgREST HTTP implementations cover only the paths needed here; they are not a Supabase implementation or an auth-provider security audit. The recovery endpoint does not send email.

Accounts: learner-a@test.local and learner-b@test.local. Password: Fixture-Only-123!. They exist only in this in-memory fixture. The vocabulary comes from the repository migration, not a test-only production fallback.

Run in WSL with Node 24 and npm dependencies installed:

    npx playwright install chromium
    npm run test:e2e

The test configuration starts and stops both services, uses its own public fixture JWT, clears Groq and service-role keys, and does not write .env.local. Both ports must be free. Webpack is selected for this harness because the local Turbopack runtime failed to spawn its CSS worker.

Evidence is written under test-results/artifacts, with an HTML report under test-results/report. Passing tests also save screenshots with fixture in their filename. These establish local browser behavior with a fixture backend; they do not establish deployment, real Supabase auth delivery, OAuth callbacks, or live AI responses.
