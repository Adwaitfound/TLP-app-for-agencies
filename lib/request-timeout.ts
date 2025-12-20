/**
 * Abort controller with timeout for fetch requests
 */
export function createTimeoutAbortSignal(
    timeoutMs: number = 10000
): { signal: AbortSignal; controller: AbortController } {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // Clean up timeout when signal is resolved
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId))

    return { signal: controller.signal, controller }
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout<T>(
    url: string,
    options: RequestInit & { timeout?: number } = {}
): Promise<T> {
    const { timeout = 10000, ...init } = options
    const { signal } = createTimeoutAbortSignal(timeout)

    const response = await fetch(url, { ...init, signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
}

/**
 * Promise with timeout wrapper
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 10000,
    timeoutError: Error = new Error('Operation timeout')
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(timeoutError)
        }, timeoutMs)

        promise
            .then((value) => {
                clearTimeout(timer)
                resolve(value)
            })
            .catch((err) => {
                clearTimeout(timer)
                reject(err)
            })
    })
}
