import { test, expect } from '@playwright/test'

test.describe('P2P sync UI', () => {
  test('sync page loads and shows heading', async ({ page }) => {
    await page.goto('/id/sync')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible()
  })

  test('sync page shows start sync option', async ({ page }) => {
    await page.goto('/id/sync')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const startBtn = page.locator('button', { hasText: /mulai|start|sinkron/i }).first()
    await expect(startBtn).toBeVisible()
  })

  test('dashboard quick action links to sync page', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('networkidle')
    const syncAction = page.locator('[data-testid="quick-action"]').nth(2)
    await syncAction.click()
    await expect(page).toHaveURL(/sync/)
  })
})
