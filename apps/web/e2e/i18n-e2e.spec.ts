import { test, expect } from '@playwright/test'

test.describe('i18n language switching', () => {
  test('/id shows Indonesian text', async ({ page }) => {
    await page.goto('/id')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText('LumbungData')
  })

  test('/en shows English text', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText('LumbungData')
    await expect(page.locator('body')).toContainText('Record Soil')
  })
})
