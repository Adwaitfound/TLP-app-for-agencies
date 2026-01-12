/**
 * Organization Context Provider
 * Provides org_id and user context to all v2 pages
 * Enforces tenant isolation at the component level
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'client';
  status: 'active' | 'invited' | 'suspended';
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'standard' | 'premium';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  settings?: {
    brand_color?: string;
    timezone?: string;
    [key: string]: any;
  };
}

interface OrgContextType {
  organization: Organization | null;
  member: OrganizationMember | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  canAccess: (requiredPlan: 'free' | 'standard' | 'premium') => boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [member, setMember] = useState<OrganizationMember | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize context on mount
  useEffect(() => {
    const initializeContext = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Skip auth check for setup page
        if (pathname.includes('/v2/setup')) {
          setIsLoading(false);
          return;
        }

        // Get current user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          setError('Not authenticated');
          router.push('/agency/login');
          return;
        }

        setUser(authUser);

        // Get organization membership
        const { data: memberData, error: memberError } = await supabase
          .from('saas_organization_members')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .single();

        if (memberError) {
          console.error('[ORG_MEMBER_FETCH_ERROR]', memberError);
          setError('No active organization membership');
          router.push('/agency/login');
          return;
        }

        if (!memberData) {
          setError('Organization membership not found');
          router.push('/agency/login');
          return;
        }

        setMember(memberData);

        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .from('saas_organizations')
          .select('*')
          .eq('id', memberData.org_id)
          .single();

        if (orgError || !orgData) {
          console.error('[ORG_FETCH_ERROR]', orgError);
          setError('Organization not found');
          return;
        }

        setOrganization(orgData);
      } catch (err: any) {
        console.error('[ORG_CONTEXT_INIT_ERROR]', err);
        setError(err.message || 'Failed to initialize organization context');
      } finally {
        setIsLoading(false);
      }
    };

    initializeContext();
  }, []);

  // Check plan access
  const canAccess = (requiredPlan: 'free' | 'standard' | 'premium'): boolean => {
    if (!organization) return false;

    const planHierarchy: Record<string, number> = {
      free: 0,
      standard: 1,
      premium: 2,
    };

    return planHierarchy[organization.plan] >= planHierarchy[requiredPlan];
  };

  const value: OrgContextType = {
    organization,
    member,
    user,
    isAdmin: member?.role === 'admin',
    isLoading,
    error,
    canAccess,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/**
 * Hook to access organization context
 * Must be used within OrgProvider
 */
export function useOrg(): OrgContextType {
  const context = useContext(OrgContext);

  if (!context) {
    throw new Error('useOrg must be used within OrgProvider');
  }

  return context;
}

/**
 * Component wrapper for protecting routes
 * Redirects to login if not authenticated or no org
 */
export function withOrgProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    const { isLoading, error } = useOrg();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && error) {
        router.push('/agency/login');
      }
    }, [isLoading, error, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <p className="text-destructive">Error: {error}</p>
            <button
              onClick={() => router.push('/agency/login')}
              className="text-primary hover:underline"
            >
              Return to login
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Hook to check feature access by plan
 */
export function usePlanFeatures() {
  const { organization } = useOrg();

  const features = {
    dashboard: true,
    projects: true,
    clients: true,
    teamMembers: true,
    files: true,
    comments: true,
    payments: organization?.plan === 'premium',
    vendors: organization?.plan === 'premium',
    invoices: organization?.plan === 'premium',
    analytics: organization?.plan === 'premium',
  };

  return features;
}
