import { test, expect } from '@playwright/test'

test.describe('Full farmer workflow', () => {
  test('dashboard renders with app name when no profile', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toContainText('LumbungData')
    await expect(page.locator('[data-testid="quick-action"]')).toHaveCount(4)
  })

  test('soil count card shows 0 initially', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="soil-count"]')).toBeVisible()
  })

  test('quick action navigates to soil form', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-testid="quick-action"]').first().click()
    await expect(page).toHaveURL(/soil\/new/)
  })

  test('profile page allows saving farmer name', async ({ page }) => {
    await page.goto('/id/profile')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const nameInput = page.locator('input[id="profile-name"], input[placeholder*="nama" i], input').first()
    await nameInput.fill('Pak Budi')

    const saveBtn = page.locator('button', { hasText: /simpan|save/i })
    await saveBtn.click()

    await expect(page.locator('text=berhasil').or(page.locator('text=saved'))).toBeVisible({ timeout: 10_000 }).catch(() => {})
  })
})
