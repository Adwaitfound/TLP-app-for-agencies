"use client"

import { useAuth } from "@/contexts/auth-context"
import ClientDashboardTabs from "@/components/client/client-dashboard-tabs"

export default function ClientDashboard() {
    const { loading: authLoading } = useAuth()

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    return <ClientDashboardTabs />
}
