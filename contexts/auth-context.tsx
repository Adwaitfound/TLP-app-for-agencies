"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { debug } from "@/lib/debug"

type UserRole = "admin" | "employee" | "client" | "project_manager"

interface User {
    id: string
    email: string
    full_name: string
    role: UserRole
    avatar_url?: string
    company_name?: string
    phone?: string
    bio?: string
    website?: string
    industry?: string
    address?: string
    tax_id?: string
    company_size?: string
}

interface AuthContextType {
    user: User | null
    supabaseUser: SupabaseUser | null
    setUser: (user: User | null) => void
    logout: () => Promise<void>
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileCache, setProfileCache] = useState<Map<string, User>>(new Map())
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    // Removed aggressive timeouts to prevent auth loops in slow networks

    const ensureUserProfile = async (sessionUser: SupabaseUser) => {
        // Check cache first
        const cached = profileCache.get(sessionUser.id)
        if (cached) {
            debug.log('AUTH', 'Using cached profile', { email: cached.email, role: cached.role })
            return cached
        }

        // LocalStorage cache (persisted across reloads)
        try {
            const raw = localStorage.getItem('tlp_auth_profile')
            if (raw) {
                const parsed = JSON.parse(raw) as User
                if (parsed?.id === sessionUser.id) {
                    debug.log('AUTH', 'Using persisted profile cache', { email: parsed.email, role: parsed.role })
                    setProfileCache(prev => new Map(prev).set(sessionUser.id, parsed))
                    return parsed
                }
            }
        } catch (e) {
            debug.warn('AUTH', 'Failed to read profile from localStorage', { message: (e as any)?.message })
        }

        const derivedRole = (sessionUser.user_metadata?.role as UserRole) || 'project_manager'
        const derivedName = sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User'

        debug.log('AUTH', 'Fetching user profile from users table...', { userId: sessionUser.id })
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', sessionUser.id)
            .maybeSingle()

        if (error) {
            debug.error('AUTH', 'Failed to fetch user profile', { message: error.message, code: error.code })
            return null
        }

        if (userData) {
            debug.success('AUTH', 'User profile loaded', { email: userData.email, role: userData.role })
            
            setProfileCache(prev => new Map(prev).set(sessionUser.id, userData))
            try {
                localStorage.setItem('tlp_auth_profile', JSON.stringify(userData))
            } catch (e) {
                debug.warn('AUTH', 'Failed to persist profile cache', { message: (e as any)?.message })
            }
            return userData
        }

        debug.warn('AUTH', 'User profile missing, creating default profile', {
            userId: sessionUser.id,
            email: sessionUser.email,
            role: derivedRole,
        })

        const { error: insertError } = await supabase
            .from('users')
            .insert({
                id: sessionUser.id,
                email: sessionUser.email,
                full_name: derivedName,
                role: derivedRole,
            })

        if (insertError) {
            debug.error('AUTH', 'Failed to create user profile', { message: insertError.message, code: insertError.code })
            return null
        }

        const { data: createdProfile, error: refetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', sessionUser.id)
            .maybeSingle()

        if (refetchError) {
            debug.error('AUTH', 'Profile created but refetch failed', { message: refetchError.message, code: refetchError.code })
            return null
        }

        const profile = createdProfile || null
        if (profile) {
            debug.success('AUTH', 'User profile created', { email: profile.email, role: profile.role })
            setProfileCache(prev => new Map(prev).set(sessionUser.id, profile))
            try {
                localStorage.setItem('tlp_auth_profile', JSON.stringify(profile))
            } catch (e) {
                debug.warn('AUTH', 'Failed to persist created profile', { message: (e as any)?.message })
            }
        }
        return profile
    }

    useEffect(() => {
        let mounted = true
        
        // Check active sessions and sets the user
        const initAuth = async () => {
            try {
                debug.log('AUTH', 'Initializing auth context...')
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                
                if (sessionError) {
                    debug.error('AUTH', 'Failed to fetch session', { message: sessionError.message, code: sessionError.code })
                }
                
                console.log('Auth context init: session user:', session?.user?.email)
                debug.log('AUTH', 'Session fetched', { email: session?.user?.email, userId: session?.user?.id })

                if (!mounted) return

                if (session?.user) {
                    setSupabaseUser(session.user)
                    // Save session to localStorage for PWA offline support
                    localStorage.setItem('tlp_auth_session', JSON.stringify(session))
                    
                    const profile = await ensureUserProfile(session.user)
                    if (profile && mounted) {
                        setUser(profile)
                        debug.log('AUTH', 'User authenticated and profile loaded', { email: profile.email })
                    }
                } else {
                    debug.log('AUTH', 'No active session found')
                }
            } catch (err: any) {
                console.error('Auth context init error:', err.message)
                debug.error('AUTH', 'Init error', { message: err.message })
            } finally {
                if (mounted) {
                    setLoading(false)
                    debug.log('AUTH', 'Auth init complete')
                }
            }
        }

        initAuth()

        // Listen for changes on auth state (throttled to prevent multi-tab conflicts)
        let lastEventTime = 0
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Throttle rapid auth changes (can happen with multiple tabs)
            const now = Date.now()
            if (now - lastEventTime < 500 && event !== 'SIGNED_OUT') {
                debug.log('AUTH', 'Throttled duplicate auth event', { event })
                return
            }
            lastEventTime = now

            console.log('Auth state change event:', event, 'user:', session?.user?.email)
            debug.log('AUTH', 'Auth state changed', { event, email: session?.user?.email, userId: session?.user?.id })

            try {
                if (session?.user && mounted) {
                    setSupabaseUser(session.user)
                    
                    const profile = await ensureUserProfile(session.user)
                    if (profile && mounted) {
                        setUser(profile)
                        debug.log('AUTH', 'Profile set after auth state change', { email: profile.email })
                        try {
                            localStorage.setItem('tlp_auth_profile', JSON.stringify(profile))
                        } catch (e) {
                            debug.warn('AUTH', 'Failed to persist profile after fetch', { message: (e as any)?.message })
                        }
                    } else if (mounted) {
                        setUser(null)
                    }
                } else if (event === 'SIGNED_OUT' && mounted) {
                    debug.log('AUTH', 'Session cleared, setting user to null')
                    setSupabaseUser(null)
                    setUser(null)
                    setProfileCache(new Map())
                    localStorage.removeItem('tlp_auth_session')
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        })
        
        return () => {
            mounted = false
            subscription?.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase])

    useEffect(() => {
        if (!supabaseUser?.id) return

        // Keep user profile (including role) in sync with DB changes
        const channel = supabase
            .channel(`user-updates-${supabaseUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${supabaseUser.id}`,
                },
                (payload) => {
                    localStorage.removeItem('tlp_auth_profile')
                    const nextUser = (payload.new as any) || null
                    if (nextUser) {
                        setUser(nextUser)
                        debug.log('AUTH', 'User profile updated from DB change', { role: nextUser.role })
                    }
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, supabaseUser?.id])

    const logout = async () => {
        debug.log('AUTH', 'Logout initiated', { currentUser: user?.email })
        setUser(null)
        setSupabaseUser(null)
        setProfileCache(new Map())
        // Clear saved session from localStorage
        localStorage.removeItem('tlp_auth_session')
        debug.log('AUTH', 'User state cleared')
        try {
            await supabase.auth.signOut({ scope: 'local' })
            debug.success('AUTH', 'Supabase signOut complete (local scope)')
        } catch (err: any) {
            debug.error('AUTH', 'Supabase signOut error', { message: err?.message })
        }
        router.push("/login")
        debug.log('AUTH', 'Redirected to login')
    }

    return (
        <AuthContext.Provider value={{ user, supabaseUser, setUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
