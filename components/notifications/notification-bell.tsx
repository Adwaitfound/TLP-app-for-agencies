"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'

export function NotificationBell() {
    const { user } = useAuth()
    const [unread, setUnread] = useState(0)
    const supabase = useMemo(() => createClient(), [])
    const disabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DISABLE_NOTIFICATIONS === 'true'

    useEffect(() => {
        if (!user?.id || disabled) return

        async function fetchUnread() {
            try {
                const { count, error } = await supabase
                    .from('notifications')
                    .select('id', { count: 'exact' })
                    .eq('user_id', user!.id)
                    .eq('read', false)

                if (error) {
                    console.debug('[NotificationBell] Count error:', error.message)
                    setUnread(0)
                    return
                }

                setUnread(count || 0)
            } catch (err: any) {
                console.debug('[NotificationBell] Count fetch failed:', err?.message)
                setUnread(0)
            }
        }

        fetchUnread()

        const channel = supabase
            .channel('notifications-bell')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                payload => {
                    setUnread(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, user?.id, disabled])

    if (!user || disabled) return null

    return (
        <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/dashboard/notifications" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center px-1">
                        {unread}
                    </span>
                )}
            </Link>
        </Button>
    )
}
