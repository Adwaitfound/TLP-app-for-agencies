'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { OrgProvider } from '@/lib/org-context';
import { V2Sidebar } from '@/components/v2/sidebar';
import { V2Header } from '@/components/v2/header';

export default function V2Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Skip layout for setup and onboarding pages
  const skipLayout = pathname.includes('/setup') || pathname.includes('/onboarding');

  if (skipLayout) {
    return <OrgProvider>{children}</OrgProvider>;
  }

  return (
    <OrgProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar - Fixed on desktop, hidden on mobile */}
        <div className="hidden border-r bg-muted/40 md:fixed md:inset-y-0 md:left-0 md:z-50 md:w-[220px] lg:w-[280px] md:block md:overflow-y-auto">
          <V2Sidebar />
        </div>

        {/* Main content area */}
        <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px] h-screen overflow-hidden">
          {/* Header - Sticky */}
          <div className="flex-shrink-0 sticky top-0 z-40 w-full">
            <V2Header />
          </div>

          {/* Page content - matches original dashboard layout exactly */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex flex-col gap-4 lg:gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OrgProvider>
  );
}
