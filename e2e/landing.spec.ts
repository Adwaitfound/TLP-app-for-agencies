import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
    test('should load and show Get Started button', async ({ page }) => {
        await page.goto('/')

        // Check for Lost Project branding in header (not footer)
        await expect(page.getByRole('link', { name: /Video-first studio/i })).toBeVisible()

        // Check hero heading
        await expect(page.locator('h1').filter({ hasText: /video-first crew/i })).toBeVisible()

        // Check Get Started button exists
        const getStartedBtn = page.getByRole('button', { name: /get started/i }).first()
        await expect(getStartedBtn).toBeVisible()
    })

    test('should open login dialog on Get Started', async ({ page }) => {
        await page.goto('/')

        const getStartedBtn = page.getByRole('button', { name: /get started/i }).first()
        await getStartedBtn.click()

        // Dialog should appear
        await expect(page.locator('text=Choose Your Login Type')).toBeVisible()
        await expect(page.locator('text=Admin')).toBeVisible()
        await expect(page.locator('text=Employee')).toBeVisible()
        await expect(page.locator('text=Client')).toBeVisible()
    })
})
