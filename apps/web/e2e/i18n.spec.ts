import { test, expect } from '@playwright/test'

test.describe('Internationalization', () => {
  test('default locale page loads successfully', async ({ page }) => {
    const response = await page.goto('/id')
    expect(response?.status()).toBeLessThan(400)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/id')
  })

  test('Indonesian locale shows Indonesian text', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=Data Pertanian Desa Anda')).toBeVisible()
  })

  test('English locale shows English text', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=Your Village Farm Data')).toBeVisible()
  })
})
