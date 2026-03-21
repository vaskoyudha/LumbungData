import { test, expect } from '@playwright/test'

test.describe('P2P Sync page', () => {
  test('sync page loads with start and join buttons', async ({ page }) => {
    await page.goto('/id/sync')
    await page.waitForLoadState('domcontentloaded')

    const startButton = page.locator('button', { hasText: /mulai sinkronisasi|start sync/i })
    await expect(startButton).toBeVisible()

    const joinButton = page.locator('button', { hasText: /bergabung|join/i })
    await expect(joinButton).toBeVisible()
  })

  test('sync history section is visible', async ({ page }) => {
    await page.goto('/id/sync')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=/riwayat sinkronisasi|sync history/i')).toBeVisible()
  })
})
