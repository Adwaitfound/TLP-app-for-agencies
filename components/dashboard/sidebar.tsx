"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  BarChart3,
  Settings,
  UserCheck,
  MessageSquare,
  Bell,
  Wallet,
  Files,
  MessagesSquare,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const adminRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Projects",
    icon: FolderKanban,
    href: "/dashboard/projects",
  },
  {
    label: "Comments",
    icon: MessageSquare,
    href: "/dashboard/comments",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/dashboard/notifications",
  },
  {
    label: "All Clients",
    icon: Users,
    href: "/dashboard/clients",
  },
  {
    label: "Team Members",
    icon: UserCheck,
    href: "/dashboard/team",
  },
  {
    label: "All Files",
    icon: Files,
    href: "/dashboard/files",
  },
  {
    label: "Payments & Vendors",
    icon: Wallet,
    href: "/dashboard/payments",
  },
  {
    label: "Invoices",
    icon: FileText,
    href: "/dashboard/invoices",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
  },
  {
    label: "Advertisements",
    icon: Megaphone,
    href: "/dashboard/advertisements",
  },
  {
    label: "Agency Onboarding",
    icon: Users,
    href: "/dashboard/agency-onboarding",
  },
  {
    label: "Ad Analytics",
    icon: BarChart3,
    href: "/dashboard/ad-analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

const employeeRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard/employee",
  },
  {
    label: "My Projects",
    icon: FolderKanban,
    href: "/dashboard/projects",
  },
  {
    label: "All Files",
    icon: Files,
    href: "/dashboard/files",
  },
  {
    label: "Comments",
    icon: MessageSquare,
    href: "/dashboard/comments",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/dashboard/notifications",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

const clientRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard/client",
  },
  {
    label: "My Projects",
    icon: FolderKanban,
    href: "/dashboard/client/projects",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/dashboard/notifications",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isSystemAdmin = user?.email?.toLowerCase() === "adwait@thelostproject.in";

  // Determine routes based on user role
  let routes = adminRoutes;
  if (user?.role === "client") {
    routes = clientRoutes;
  } else if (user?.role === "project_manager") {
    routes = employeeRoutes;
  }

  return (
    <div className="flex h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 flex items-center">
            <img
              src="https://www.thelostproject.in/cdn/shop/files/TLP_logo_for_Backlit-01-white.png?height=72&v=1760209067"
              alt="The Lost Project"
              className="h-8 w-auto"
              loading="eager"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight">
              The Lost Project
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.organization_name || (
                isSystemAdmin
                  ? "System Admin"
                  : user?.role === "admin"
                    ? "Admin"
                    : user?.role === "project_manager"
                      ? "Employee Portal"
                      : "Client Portal"
              )}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === route.href && "bg-muted text-primary",
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t px-2 py-4 lg:px-4">
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logged in as</p>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{user?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ') : 'Unknown'}
            </p>
            {user?.organization_name && (
              <p className="text-xs font-medium text-primary">{user.organization_name}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
