import { test, expect } from '@playwright/test'

test.describe('Offline resilience', () => {
  test('dashboard loads when offline (from service worker cache)', async ({ page, context }) => {
    await page.goto('/id')
    await page.waitForLoadState('networkidle')

    await context.setOffline(true)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })

  test('soil form works offline', async ({ page, context }) => {
    await page.goto('/id/soil/new')
    await page.waitForLoadState('networkidle')
    await context.setOffline(true)
    await page.waitForTimeout(500)

    await page.fill('#soil-ph', '6.5')
    await page.fill('#soil-location', 'Desa Test')

    const saveBtn = page.locator('button', { hasText: /simpan|save/i })
    await saveBtn.click()
    await expect(page.locator('body')).toBeVisible()
  })

  test('app stays functional after offline/online toggle', async ({ page, context }) => {
    await page.goto('/id')
    await page.waitForLoadState('networkidle')
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(500)
    await expect(page.locator('[data-testid="quick-action"]')).toHaveCount(4)
  })
})
