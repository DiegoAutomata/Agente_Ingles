import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
export default defineConfig([
  ...nextVitals, ...nextTypescript,
  // Existing UI synchronizes browser APIs in effects. Checked behaviorally in tests.
  { rules: { 'react-hooks/set-state-in-effect': 'off' } },
  globalIgnores(['.next/**', 'node_modules/**', '.claude/**', 'test-results/**', 'playwright-report/**']),
])
