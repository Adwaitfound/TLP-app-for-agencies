import { createBrowserClient } from '@supabase/ssr'

function createFetchWithTimeout(timeoutMs: number): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
        // Respect an existing signal if caller provided one.
        if (init?.signal) {
            return await fetch(input, init)
        }

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)

        try {
            return await fetch(input, { ...init, signal: controller.signal })
        } catch (err) {
            // Useful during dev: helps diagnose "stuck" Supabase calls.
            if (process.env.NODE_ENV === 'development') {
                const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request)?.url
                if (url && url.includes('supabase')) {
                    console.warn('[Supabase] fetch failed/aborted', { url, timeoutMs })
                }
            }
            throw err
        } finally {
            clearTimeout(timer)
        }
    }
}

export function createClient() {
    if (process.env.NODE_ENV === 'development') {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        // Safe debug: log only first 8 chars of key to verify correct key is loaded
        // This helps diagnose Invalid API key issues without exposing secrets.
        console.log('[Supabase] URL:', url, 'ANON key:', anon ? anon.slice(0, 8) + '…' : 'missing')
    }
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                fetch: createFetchWithTimeout(15000),
            },
        }
    )
}

// Legacy export for backward compatibility
export const supabase = createClient()
