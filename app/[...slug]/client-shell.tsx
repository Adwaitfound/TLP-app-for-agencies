"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import ClientProjectPage from "@/components/views/client-project-page"
import EmployeeProjectPage from "@/components/views/employee-project-page"

function parseRoute(pathname: string) {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 4 && segments[0] === "dashboard" && segments[1] === "client" && segments[2] === "projects") {
        return { view: "clientProject" as const, projectId: segments[3] }
    }
    if (segments.length === 4 && segments[0] === "dashboard" && segments[1] === "employee" && segments[2] === "projects") {
        return { view: "employeeProject" as const, projectId: segments[3] }
    }
    return null
}

export default function CatchAllClientShell() {
    const pathname = usePathname() || "/"
    const route = useMemo(() => parseRoute(pathname), [pathname])

    if (route?.view === "clientProject") {
        return <ClientProjectPage projectId={route.projectId} />
    }

    if (route?.view === "employeeProject") {
        return <EmployeeProjectPage projectId={route.projectId} />
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Page not found</p>
                <p className="text-sm text-muted-foreground">This static shell only serves project detail views.</p>
            </div>
        </div>
    )
}
