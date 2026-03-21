import { test, expect } from '@playwright/test'

test.describe('PWA capabilities', () => {
  test('home page loads without error', async ({ page }) => {
    const response = await page.goto('/id')
    expect(response?.status()).toBeLessThan(400)
  })

  test('page title is non-empty', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('domcontentloaded')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('web manifest is accessible', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest')
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.name).toBe('LumbungData')
    expect(manifest.display).toBe('standalone')
  })

  test('manifest link is present in HTML', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('domcontentloaded')
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveCount(1)
  })
})
