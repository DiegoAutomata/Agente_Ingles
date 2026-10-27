import { test, expect, type Page } from '@playwright/test'
import bronce from '../src/features/lessons/data/content-bronce'

const backend = 'http://127.0.0.1:54321'
const password = 'Fixture-Only-123!'

async function login(page: Page, email = 'learner-a@test.local') {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 45_000 })
  await expect(page.getByRole('heading', { name: /Hola,/ })).toContainText(email.split('@')[0])
  await page.waitForLoadState('networkidle')
}

test.beforeEach(async ({ request, page }) => {
  const reset = await request.post(backend + '/__fixture/reset')
  expect(reset.ok()).toBeTruthy()
  await page.route('**/*', route => {
    const host = new URL(route.request().url()).hostname
    return ['127.0.0.1', 'localhost'].includes(host) ? route.continue() : route.abort()
  })
})

test('real browser: login, complete lesson, persist SRS, logout and isolate next account', async ({ page }, testInfo) => {
  const hydrationErrors: string[] = []
  page.on('pageerror', error => hydrationErrors.push(error.message))
  await login(page)
  await expect(page.getByRole('link', { name: /Continuar L1:/ })).toBeVisible()
  await page.getByRole('link', { name: /Continuar L1:/ }).click()
  await expect(page.getByRole('heading', { name: 'Lección 1', exact: true })).toBeVisible()

  for (const exercise of bronce[1].exercises) {
    if (exercise.type === 'concept') {
      await expect(page.getByRole('heading', { name: exercise.title, exact: true })).toBeVisible()
      if (exercise.flashQuiz) await page.getByRole('button', { name: exercise.flashQuiz.options[exercise.flashQuiz.correct], exact: true }).click()
      await page.getByRole('button', { name: /Entendido|Continuar/ }).click()
    } else if (exercise.type === 'word_match') {
      for (const pair of exercise.pairs) {
        await page.getByRole('button', { name: pair.left, exact: true }).click()
        await page.getByRole('button', { name: pair.right, exact: true }).click()
      }
    } else if (exercise.type === 'sentence_builder') {
      await expect(page.getByText(exercise.instruction, { exact: true })).toBeVisible()
      for (const tile of exercise.answer) await page.getByRole('button', { name: tile, exact: true }).click()
      await page.getByRole('button', { name: 'Verificar', exact: true }).click()
      await page.getByRole('button', { name: /Continuar/ }).click()
    } else {
      await page.getByRole('button', { name: exercise.options[exercise.correct], exact: true }).click()
      await page.getByRole('button', { name: /Continuar/ }).click()
    }
  }
  await expect(page.getByRole('heading', { name: '¡Lección completada!' })).toBeVisible()
  await expect(page.getByText('+100 XP', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('lesson-completed-fixture.png'), fullPage: true })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Lección 2', exact: true })).toBeVisible()
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: /Continuar L2:/ })).toBeVisible()

  await page.goto('/vocabulary')
  await expect(page.getByText('16 tarjetas', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Empezar repaso/ }).click()
  const reveal = page.getByRole('button', { name: 'Revelar traducción de to come', exact: true })
  await reveal.focus()
  await page.keyboard.press('Enter')
  const saved = page.waitForResponse(r => r.url().endsWith('/api/srs-review') && r.request().method() === 'POST')
  await page.getByRole('button', { name: /Bien/ }).click()
  expect((await saved).status()).toBe(200)
  const second = await page.request.post('/api/srs-review', { data: { wordId: 1, quality: 2 } })
  expect(second.status()).toBe(200)
  expect(await second.json()).toMatchObject({ ok: true, review: { wordId: 1, interval: 6, repetitions: 2 } })
  await page.reload()
  await expect(page.getByText('15 tarjetas', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('srs-persisted-fixture.png'), fullPage: true })

  await page.getByRole('button', { name: /Cerrar sesión/ }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/vocabulary')
  await expect(page).toHaveURL(/\/login$/)
  await login(page, 'learner-b@test.local')
  await expect(page.getByRole('link', { name: /Continuar L1:/ })).toBeVisible()
  await page.goto('/vocabulary')
  await expect(page.getByText('16 tarjetas', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('second-account-isolated-fixture.png'), fullPage: true })
  expect(hydrationErrors).toEqual([])
})

test('mobile 390px navigation and puzzle hydrate; missing Groq is visible as an error', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  const menu = page.getByRole('button', { name: 'Menú', exact: true })
  await expect(menu).toBeVisible()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await menu.click()
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  await page.getByRole('link', { name: /Vocabulario/ }).click()
  await expect(page).toHaveURL(/\/vocabulary$/)
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await page.goto('/puzzle')
  await expect(page.getByLabel('Respuesta al puzzle')).toBeVisible()
  await expect(page.getByText('Significa:', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: testInfo.outputPath('mobile-puzzle-fixture.png'), fullPage: true })

  await page.goto('/conversation')
  const response = page.waitForResponse(r => r.url().endsWith('/api/tutor') && r.request().method() === 'POST')
  await page.getByLabel('Mensaje para Alex').fill('Hello, this is a local fixture test.')
  await page.getByLabel('Mensaje para Alex').press('Enter')
  expect((await response).status()).toBe(503)
  await expect(page.getByRole('alert').filter({ hasText: 'Alex no pudo responder.' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('missing-groq-error-fixture.png'), fullPage: true })
  expect(errors.filter(message => /hydration|did not match|server rendered/i.test(message))).toEqual([])
})
