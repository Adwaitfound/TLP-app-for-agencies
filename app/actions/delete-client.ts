'use server'

import { createClient } from '@supabase/supabase-js'

type DeleteClientResult = {
    success: boolean
    error?: string
}

export async function deleteClient(clientId: string): Promise<DeleteClientResult> {
    try {
        console.log('[SERVER] deleteClient called for client:', clientId)

        // Validate environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!url) {
            console.error('[SERVER] Missing NEXT_PUBLIC_SUPABASE_URL')
            return { success: false, error: 'NEXT_PUBLIC_SUPABASE_URL is not configured' }
        }

        if (!key) {
            console.error('[SERVER] Missing SUPABASE_SERVICE_ROLE_KEY')
            return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }
        }

        const supabaseAdmin = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Get the client record to find the associated user
        const { data: clientData, error: getClientError } = await supabaseAdmin
            .from('clients')
            .select('user_id')
            .eq('id', clientId)
            .single()

        if (getClientError) {
            console.error('[SERVER] Error fetching client:', getClientError)
            return { success: false, error: 'Client not found' }
        }

        const userId = clientData?.user_id

        // Delete the client record (this will cascade delete related projects, invoices, etc.)
        const { error: deleteClientError } = await supabaseAdmin
            .from('clients')
            .delete()
            .eq('id', clientId)

        if (deleteClientError) {
            console.error('[SERVER] Error deleting client:', deleteClientError)
            return { success: false, error: deleteClientError.message }
        }

        // If there was an associated user account, delete it too
        if (userId) {
            const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
            if (deleteUserError) {
                console.error('[SERVER] Error deleting user account:', deleteUserError)
                // Don't fail if user deletion fails, as the client is already deleted
            }
        }

        console.log('[SERVER] Client deleted successfully:', clientId)
        return { success: true }
    } catch (error: any) {
        console.error('[SERVER] Unexpected error:', error)
        return { success: false, error: error?.message || 'An unexpected error occurred' }
    }
}
