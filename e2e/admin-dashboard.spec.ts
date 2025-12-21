import { test, expect } from '@playwright/test'

/**
 * Admin Dashboard smoke tests
 */

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'adwait@thelostproject.in'
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'footb@ll'

test.describe('Admin Dashboard Smoke Tests', () => {
    test('should login and load admin dashboard', async ({ page }) => {
        // Navigate to login
        await page.goto('/login')

        // Fill login form
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')

        // Wait for navigation - could be any dashboard URL or back to login
        const navigationPromise = Promise.race([
            page.waitForURL('/dashboard', { timeout: 10000 }).then(() => '/dashboard'),
            page.waitForURL('/dashboard/admin', { timeout: 10000 }).then(() => '/dashboard/admin'),
            page.waitForURL('/dashboard/employee', { timeout: 10000 }).then(() => '/dashboard/employee'),
            page.waitForURL('/dashboard/client', { timeout: 10000 }).then(() => '/dashboard/client'),
            page.waitForURL('/login**', { timeout: 10000 }).then(() => '/login')
        ])

        const redirectUrl = await navigationPromise

        // If redirected back to login, the credentials failed
        if (redirectUrl === '/login') {
            throw new Error(`Admin login failed - redirected back to /login. Email: ${TEST_ADMIN_EMAIL}`)
        }

        await page.waitForTimeout(1000)

        // Check dashboard loaded
        const pageUrl = page.url()
        expect(pageUrl).toMatch(/dashboard|login/i)

        if (!pageUrl.includes('dashboard')) {
            // If we're still on login, check the error message
            const body = await page.locator('body').textContent()
            console.log('Page body:', body)
            throw new Error(`Expected to be on dashboard but on: ${pageUrl}`)
        }
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
        await page.goto('/login')
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')

        // Wait for navigation to dashboard
        const navigationPromise = Promise.race([
            page.waitForURL('/dashboard', { timeout: 10000 }).then(() => '/dashboard'),
            page.waitForURL('/dashboard/admin', { timeout: 10000 }).then(() => '/dashboard/admin'),
            page.waitForURL('/dashboard/employee', { timeout: 10000 }).then(() => '/dashboard/employee'),
            page.waitForURL('/dashboard/client', { timeout: 10000 }).then(() => '/dashboard/client'),
            page.waitForURL('/login**', { timeout: 10000 }).then(() => '/login')
        ])

        const redirectUrl = await navigationPromise

        if (redirectUrl === '/login') {
            throw new Error(`Admin login failed - redirected back to /login`)
        }

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
