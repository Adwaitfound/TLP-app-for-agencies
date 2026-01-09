"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if this is a client or employee route - they have their own layouts
  const isClientRoute =
    pathname.startsWith("/dashboard/client/") ||
    pathname === "/dashboard/client";
  const isEmployeeRoute =
    pathname.startsWith("/dashboard/employee/") ||
    pathname === "/dashboard/employee";

  // Client and employee routes have their own layouts, so just pass through children
  if (isClientRoute || isEmployeeRoute) {
    return <>{children}</>;
  }

  // Admin routes use the sidebar + header layout
  return (
    <>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="hidden border-r bg-muted/40 md:fixed md:inset-y-0 md:left-0 md:z-50 md:w-[220px] lg:w-[280px] md:block md:overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px] h-screen overflow-hidden">
          <div className="flex-shrink-0 sticky top-0 z-40 w-full">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex flex-col gap-4 lg:gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
