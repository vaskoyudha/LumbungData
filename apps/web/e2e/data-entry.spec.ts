import { test, expect } from '@playwright/test'

test.describe('Soil data entry', () => {
  test('soil form loads and displays fields', async ({ page }) => {
    await page.goto('/id/soil/new')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('#soil-ph')).toBeVisible()
    await expect(page.locator('#soil-nitrogen')).toBeVisible()
    await expect(page.locator('#soil-location')).toBeVisible()
  })

  test('soil form validates required location', async ({ page }) => {
    await page.goto('/id/soil/new')
    await page.waitForLoadState('networkidle')

    // Wait for hydration to settle
    await page.locator('#soil-location').waitFor({ state: 'visible' })
    await page.waitForTimeout(500)

    const saveButton = page.locator('button', { hasText: /simpan|save/i })
    await saveButton.click()

    await expect(page.locator('span.text-red-600').first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Market data entry', () => {
  test('market form loads and displays fields', async ({ page }) => {
    await page.goto('/id/market/new')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('#market-crop')).toBeVisible()
    await expect(page.locator('#market-price')).toBeVisible()
    await expect(page.locator('#market-location')).toBeVisible()
  })

  test('market form validates required fields', async ({ page }) => {
    await page.goto('/id/market/new')
    await page.waitForLoadState('networkidle')

    // Wait for hydration to settle
    await page.locator('#market-location').waitFor({ state: 'visible' })
    await page.waitForTimeout(500)

    const saveButton = page.locator('button', { hasText: /simpan|save/i })
    await saveButton.click()

    await expect(page.locator('span.text-red-600').first()).toBeVisible({ timeout: 10_000 })
  })
})
