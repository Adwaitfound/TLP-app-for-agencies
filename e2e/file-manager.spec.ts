import { test, expect } from '@playwright/test'

/**
 * File Manager smoke tests
 * NOTE: Requires admin/employee credentials and a test project
 */

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'adwait@thelostproject.in'
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'footb@ll'

test.describe('File Manager Smoke Tests', () => {
    // Always run these tests now that we have valid credentials
    // test.skip(!TEST_ADMIN_EMAIL.includes('example'), 'Requires test credentials')

    test('should open upload dialog and cancel', async ({ page }) => {
        await page.goto('/login?role=admin')
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')
        await Promise.race([
            page.waitForURL('/dashboard', { timeout: 5000 }).catch(() => { }),
            page.waitForURL('/dashboard/admin', { timeout: 5000 }).catch(() => { })
        ])
        await page.waitForTimeout(2000) // Wait for dashboard to load

        // Try to open sidebar menu on mobile (look for toggle button)
        const menuButtons = page.locator('button[aria-label*="menu" i], button[aria-label*="toggle" i]')
        const firstMenuButton = menuButtons.first()
        if (await firstMenuButton.isVisible().catch(() => false)) {
            try {
                await firstMenuButton.click({ timeout: 3000 })
                await page.waitForTimeout(500)
            } catch (e) {
                // Menu button might not be clickable, continue anyway
            }
        }

        // Navigate to projects - use getByRole for better mobile detection
        const projectsLink = page.getByRole('link', { name: /projects/i }).first()
        if (await projectsLink.isVisible().catch(() => false)) {
            await projectsLink.click()
        } else {
            // Fallback: navigate directly via URL
            await page.goto('/dashboard/projects')
        }
        await page.waitForTimeout(1000)

        // Click first project (if exists)
        const firstProject = page.locator('[data-testid="project-card"]').first()
        if (await firstProject.isVisible()) {
            await firstProject.click()

            // Find Upload File button
            const uploadBtn = page.getByRole('button', { name: /upload file/i })
            await expect(uploadBtn).toBeVisible()

            // Click upload
            await uploadBtn.click()

            // Dialog should open
            await expect(page.locator('text=Upload File')).toBeVisible()

            // Cancel
            await page.click('button:has-text("Cancel")')
            await expect(page.locator('text=Upload File')).not.toBeVisible()
        }
    })

    test('should open Add Drive Link dialog and validate fields', async ({ page }) => {
        await page.goto('/login?role=admin')
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')
        await Promise.race([
            page.waitForURL('/dashboard', { timeout: 5000 }).catch(() => { }),
            page.waitForURL('/dashboard/admin', { timeout: 5000 }).catch(() => { })
        ])
        await page.waitForTimeout(2000) // Wait for dashboard to load

        // Try to open sidebar menu on mobile
        const menuButtons = page.locator('button[aria-label*="menu" i], button[aria-label*="toggle" i]')
        const firstMenuButton = menuButtons.first()
        if (await firstMenuButton.isVisible().catch(() => false)) {
            try {
                await firstMenuButton.click({ timeout: 3000 })
                await page.waitForTimeout(500)
            } catch (e) {
                // Menu button might not be clickable, continue anyway
            }
        }

        // Navigate to projects
        const projectsLink = page.getByRole('link', { name: /projects/i }).first()
        if (await projectsLink.isVisible().catch(() => false)) {
            await projectsLink.click()
        } else {
            // Fallback: navigate directly via URL
            await page.goto('/dashboard/projects')
        }
        await page.waitForTimeout(1000)

        const firstProject = page.locator('[data-testid="project-card"]').first()
        if (await firstProject.isVisible()) {
            await firstProject.click()

            const addLinkBtn = page.getByRole('button', { name: /add drive link/i })
            await expect(addLinkBtn).toBeVisible()

            await addLinkBtn.click()

            // Dialog should open
            await expect(page.locator('text=Add Google Drive Link')).toBeVisible()

            // Check required fields
            await expect(page.locator('input[placeholder*="Final_Edit"]')).toBeVisible()
            await expect(page.locator('input[placeholder*="drive.google.com"]')).toBeVisible()

            // Submit should be disabled without inputs
            const submitBtn = page.getByRole('button', { name: /add link/i })
            await expect(submitBtn).toBeDisabled()

            // Cancel
            await page.click('button:has-text("Cancel")')
        }
    })

    test('should open Drive Folder dialog', async ({ page }) => {
        await page.goto('/login?role=admin')
        await page.fill('#email', TEST_ADMIN_EMAIL)
        await page.fill('#password', TEST_ADMIN_PASSWORD)
        await page.click('button[type="submit"]')
        await Promise.race([
            page.waitForURL('/dashboard', { timeout: 5000 }).catch(() => { }),
            page.waitForURL('/dashboard/admin', { timeout: 5000 }).catch(() => { })
        ])
        await page.waitForTimeout(2000) // Wait for dashboard to load

        // Try to open sidebar menu on mobile
        const menuButtons = page.locator('button[aria-label*="menu" i], button[aria-label*="toggle" i]')
        const firstMenuButton = menuButtons.first()
        if (await firstMenuButton.isVisible().catch(() => false)) {
            try {
                await firstMenuButton.click({ timeout: 3000 })
                await page.waitForTimeout(500)
            } catch (e) {
                // Menu button might not be clickable, continue anyway
            }
        }

        // Navigate to projects
        const projectsLink = page.getByRole('link', { name: /projects/i }).first()
        if (await projectsLink.isVisible().catch(() => false)) {
            await projectsLink.click()
        } else {
            // Fallback: navigate directly via URL
            await page.goto('/dashboard/projects')
        }
        await page.waitForTimeout(1000)

        const firstProject = page.locator('[data-testid="project-card"]').first()
        if (await firstProject.isVisible()) {
            await firstProject.click()

            const driveFolderBtn = page.getByRole('button', { name: /add folder|update folder/i })
            if (await driveFolderBtn.isVisible()) {
                await driveFolderBtn.click()

                await expect(page.locator('text=Set Google Drive Folder')).toBeVisible()
                await expect(page.locator('input[placeholder*="drive.google.com/drive/folders"]')).toBeVisible()

                await page.click('button:has-text("Cancel")')
            }
        }
    })
})
