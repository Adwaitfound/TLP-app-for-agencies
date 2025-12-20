import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const CACHE_DURATION = 60 // seconds

/**
 * Cached user profile fetch (max 60s TTL)
 */
export const getCachedUserProfile = unstable_cache(
    async (userId: string) => {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) throw error
        return data
    },
    ['user-profile'],
    { revalidate: CACHE_DURATION }
)

/**
 * Cached projects list (max 60s TTL)
 */
export const getCachedProjects = unstable_cache(
    async (userId: string) => {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('project_manager_id', userId)

        if (error) throw error
        return data || []
    },
    ['projects-list'],
    { revalidate: CACHE_DURATION }
)

/**
 * Batch multiple queries to reduce round-trips
 */
export async function batchUserData(userId: string) {
    const supabase = await createClient()

    const [usersRes, projectsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('projects').select('*').eq('project_manager_id', userId),
    ])

    if (usersRes.error) throw usersRes.error
    if (projectsRes.error) throw projectsRes.error

    return {
        user: usersRes.data,
        projects: projectsRes.data || [],
    }
}
