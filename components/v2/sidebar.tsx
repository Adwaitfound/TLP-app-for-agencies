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
import { useOrg } from "@/lib/org-context";

const adminRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/v2/dashboard",
  },
  {
    label: "Projects",
    icon: FolderKanban,
    href: "/v2/projects",
  },
  {
    label: "Comments",
    icon: MessageSquare,
    href: "/v2/comments",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/v2/notifications",
  },
  {
    label: "All Clients",
    icon: Users,
    href: "/v2/clients",
  },
  {
    label: "Team Members",
    icon: UserCheck,
    href: "/v2/members",
  },
  {
    label: "All Files",
    icon: Files,
    href: "/v2/files",
  },
  {
    label: "Payments & Vendors",
    icon: Wallet,
    href: "/v2/payments",
  },
  {
    label: "Invoices",
    icon: FileText,
    href: "/v2/invoices",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/v2/analytics",
  },
  {
    label: "Advertisements",
    icon: Megaphone,
    href: "/v2/advertisements",
  },
  {
    label: "Billing",
    icon: Wallet,
    href: "/v2/billing",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/v2/settings",
  },
];

const memberRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/v2/dashboard",
  },
  {
    label: "My Projects",
    icon: FolderKanban,
    href: "/v2/projects",
  },
  {
    label: "All Files",
    icon: Files,
    href: "/v2/files",
  },
  {
    label: "Comments",
    icon: MessageSquare,
    href: "/v2/comments",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/v2/notifications",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/v2/settings",
  },
];

const clientRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/v2/dashboard",
  },
  {
    label: "My Projects",
    icon: FolderKanban,
    href: "/v2/projects",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/v2/notifications",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/v2/settings",
  },
];

export function V2Sidebar() {
  const pathname = usePathname();
  const { organization, member } = useOrg();

  // Determine routes based on user role in organization
  let routes = adminRoutes;
  if (member?.role === "client") {
    routes = clientRoutes;
  } else if (member?.role === "member") {
    routes = memberRoutes;
  }

  return (
    <div className="flex h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Organization logo or fallback */}
          {organization?.logo_url ? (
            <div className="h-9 flex items-center">
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-8 w-auto"
                loading="eager"
              />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {organization?.name?.charAt(0)?.toUpperCase() || "O"}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight">
              {organization?.name || "Organization"}
            </span>
            <span className="text-xs text-muted-foreground">
              {member?.role === "admin"
                ? "Admin"
                : member?.role === "member"
                  ? "Member Portal"
                  : "Client Portal"}
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
    </div>
  );
}
