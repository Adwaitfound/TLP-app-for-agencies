/**
 * Debounce Google Sheets sync to max once per 5 seconds
 */
let lastSyncTime = 0
const SYNC_DEBOUNCE_MS = 5000

export async function debouncedGoogleSheetsSync(
    syncFunction: () => Promise<void>
): Promise<void> {
    const now = Date.now()

    if (now - lastSyncTime < SYNC_DEBOUNCE_MS) {
        // Skip sync if recently done
        return
    }

    lastSyncTime = now

    try {
        await syncFunction()
    } catch (error) {
        console.warn('[Sheets Sync] Deferred to next cycle:', error)
        // Don't throw - sync failures shouldn't block user actions
    }
}

/**
 * Batch queue for audit log syncing
 */
const auditLogQueue: any[] = []
let flushTimeout: NodeJS.Timeout | null = null

const FLUSH_INTERVAL_MS = 2000
const MAX_BATCH_SIZE = 10

export function queueAuditLog(logEntry: any): void {
    auditLogQueue.push(logEntry)

    if (auditLogQueue.length >= MAX_BATCH_SIZE) {
        flushAuditQueue()
    } else if (!flushTimeout) {
        flushTimeout = setTimeout(flushAuditQueue, FLUSH_INTERVAL_MS)
    }
}

async function flushAuditQueue(): Promise<void> {
    if (flushTimeout) {
        clearTimeout(flushTimeout)
        flushTimeout = null
    }

    if (auditLogQueue.length === 0) return

    const batch = auditLogQueue.splice(0, auditLogQueue.length)

    try {
        // Batch insert logs
        const response = await fetch('/api/audit/batch', {
            method: 'POST',
            body: JSON.stringify({ logs: batch }),
        })

        if (!response.ok) {
            console.warn('[Audit] Batch flush failed, will retry next cycle')
            // Return logs to queue for retry
            auditLogQueue.unshift(...batch)
        }
    } catch (error) {
        console.warn('[Audit] Batch flush error:', error)
        auditLogQueue.unshift(...batch)
    }
}
