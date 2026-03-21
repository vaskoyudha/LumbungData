import { test, expect } from '@playwright/test'

test.describe('Subsidy blockchain UI', () => {
  test('subsidy page loads and shows distribution list', async ({ page }) => {
    await page.goto('/id/subsidy')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('subsidy record page shows form', async ({ page }) => {
    await page.goto('/id/subsidy/record')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page.locator('button', { hasText: /simpan|save|submit/i }).first()).toBeVisible()
  })

  test('subsidy verify page loads', async ({ page }) => {
    await page.goto('/id/subsidy/verify')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toBeVisible()
  })
})
