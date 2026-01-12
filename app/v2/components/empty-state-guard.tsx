'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/lib/org-context';
import { Loader2 } from 'lucide-react';

/**
 * Empty State Guard - Example Component
 * 
 * Usage: Wrap your /v2/dashboard pages with this to ensure users have an org
 * 
 * Example:
 * ```tsx
 * export default function DashboardPage() {
 *   return (
 *     <EmptyStateGuard>
 *       <YourDashboardContent />
 *     </EmptyStateGuard>
 *   );
 * }
 * ```
 */

export function EmptyStateGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { organization, member, isLoading, error } = useOrg();

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return;

    // If there's an error or no organization, redirect to onboarding
    if (error || !organization) {
      console.log('[EMPTY_STATE_GUARD] No organization found, redirecting to onboarding');
      router.push('/v2/onboarding');
      return;
    }

    // If user is not an active member, redirect
    if (!member || member.status !== 'active') {
      console.log('[EMPTY_STATE_GUARD] User is not an active member, redirecting to onboarding');
      router.push('/v2/onboarding');
      return;
    }

    console.log('[EMPTY_STATE_GUARD] User has valid organization, showing dashboard');
  }, [organization, member, isLoading, error, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !organization || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  // User has valid organization - show the content
  return <>{children}</>;
}

/**
 * Alternative: useOrgGuard Hook
 * 
 * Use this in your page components directly
 * 
 * Example:
 * ```tsx
 * export default function DashboardPage() {
 *   const { isReady } = useOrgGuard();
 *   
 *   if (!isReady) return null;
 *   
 *   return <YourDashboardContent />;
 * }
 * ```
 */

export function useOrgGuard() {
  const router = useRouter();
  const { organization, member, isLoading, error } = useOrg();

  useEffect(() => {
    if (isLoading) return;

    if (error || !organization || !member || member.status !== 'active') {
      router.push('/v2/onboarding');
    }
  }, [organization, member, isLoading, error, router]);

  return {
    isReady: !isLoading && organization && member && member.status === 'active',
    organization,
    member,
  };
}
