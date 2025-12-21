import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
    test('should load and show Get Started button', async ({ page }) => {
        await page.goto('/')

        // Header branding
        await expect(page.locator('header').getByRole('img', { name: /the lost project/i })).toBeVisible()

        // Hero heading
        await expect(page.getByRole('heading', { level: 1 })).toContainText(/production/i)

        // Primary CTA exists
        await expect(page.getByRole('button', { name: /^get started$/i }).first()).toBeVisible()
    })

    test('should open login dialog on primary CTA', async ({ page }) => {
        await page.goto('/')

        const primaryCta = page.getByRole('button', { name: /^get started$/i }).first()
        await primaryCta.click()

        // Dialog should appear
        const dialog = page.getByRole('dialog')
        await expect(dialog.getByText('Choose Your Login Type', { exact: true })).toBeVisible()
        await expect(dialog.getByText('Admin', { exact: true })).toBeVisible()
        await expect(dialog.getByText('Employee', { exact: true })).toBeVisible()
        await expect(dialog.getByText('Client', { exact: true })).toBeVisible()
    })
})
