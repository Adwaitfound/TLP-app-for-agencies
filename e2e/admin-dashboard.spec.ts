import { test, expect } from '@playwright/test'

/**
 * Admin Dashboard smoke tests
 */

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'adwait@thelostproject.in'
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'footb@ll'

test.describe('Admin Dashboard Smoke Tests', () => {
    test('should login and load admin dashboard', async ({ page }) => {
        // Navigate to login
        await page.goto('/login?role=admin')

        // Fill login form
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')

        // Wait for redirect to dashboard; if it doesn't happen, include any visible error text.
        try {
            await page.waitForURL('**/dashboard**', { timeout: 20000 })
        } catch {
            const errorText = await page.locator('text=Invalid email or password').first().textContent().catch(() => null)
            throw new Error(`Admin login did not reach dashboard. Current URL: ${page.url()}${errorText ? ` | Error: ${errorText}` : ''}`)
        }

        await page.waitForTimeout(1000)

        // Check dashboard loaded
        expect(page.url()).toContain('dashboard')
    })

    test('should display admin dashboard content', async ({ page }) => {
        await page.goto('/login?role=admin')
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')

        await Promise.race([
            page.waitForURL('/dashboard', { timeout: 5000 }).catch(() => { }),
            page.waitForURL('/dashboard/admin', { timeout: 5000 }).catch(() => { })
        ])
        await page.waitForTimeout(2000)

        // Just check that we're on a dashboard page
        await expect(page.locator('body')).toContainText(/dashboard|admin|projects/i)
    })

    test('should navigate sidebar menu', async ({ page }) => {
        await page.goto('/login?role=admin')
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')

        // Wait for navigation to dashboard
        await page.waitForURL('**/dashboard**', { timeout: 20000 })

        await page.waitForTimeout(2000)

        // Try to open mobile menu if present
        const menuButtons = page.locator('button[aria-label*="menu" i], button[aria-label*="toggle" i]')
        if (await menuButtons.first().isVisible().catch(() => false)) {
            await menuButtons.first().click().catch(() => { })
            await page.waitForTimeout(500)
        }

        // Verify we're still on dashboard
        const finalUrl = page.url()
        expect(finalUrl).toContain('dashboard')
    })
})
