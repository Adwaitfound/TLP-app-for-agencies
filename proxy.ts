import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Traffic Controller Proxy
 * Separates original agency owner from new SaaS users
 */

// CONFIGURATION - Your original agency owner email (sees /dashboard with original data)
const ORIGINAL_AGENCY_OWNER_EMAIL = 'adwait@thelostproject.in';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes - allow access
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/' ||
    pathname === '/agency/login' ||
    pathname === '/agency-onboarding' ||
    pathname.startsWith('/v2/setup') ||
    pathname.startsWith('/v2/payment')
  ) {
    return response;
  }

  // If not authenticated, redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/agency/login';
    return NextResponse.redirect(url);
  }

  // TRAFFIC CONTROLLER LOGIC
  const isOriginalAgencyOwner = user.email === ORIGINAL_AGENCY_OWNER_EMAIL;

  // Check if user has SaaS organization membership
  let hasSaaSOrg = false;
  if (!isOriginalAgencyOwner) {
    const { data: membership } = await supabase
      .from('saas_organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    hasSaaSOrg = !!membership?.org_id;
  }

  // ROUTING RULES
  
  // Rule 1: Original agency owner trying to access /v2/* → Redirect to original dashboard
  if (isOriginalAgencyOwner && pathname.startsWith('/v2/') && !pathname.startsWith('/v2/setup')) {
    console.log('[MIDDLEWARE] Original owner blocked from /v2/dashboard, redirecting to /dashboard');
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Rule 2: Original agency owner accessing /dashboard → Allow
  if (isOriginalAgencyOwner && pathname.startsWith('/dashboard')) {
    console.log('[MIDDLEWARE] Original owner accessing /dashboard - allowed');
    return response;
  }

  // Rule 3: SaaS user trying to access original /dashboard → Block and redirect to /v2/dashboard
  if (!isOriginalAgencyOwner && pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/')) {
    console.log('[MIDDLEWARE] SaaS user blocked from /dashboard, redirecting to /v2/dashboard');
    const url = request.nextUrl.clone();
    url.pathname = '/v2/dashboard';
    return NextResponse.redirect(url);
  }

  // Rule 4: SaaS user without organization → Redirect to onboarding
  if (!isOriginalAgencyOwner && !hasSaaSOrg && pathname.startsWith('/v2/dashboard')) {
    console.log('[MIDDLEWARE] User has no SaaS org, redirecting to onboarding');
    const url = request.nextUrl.clone();
    url.pathname = '/v2/onboarding';
    return NextResponse.redirect(url);
  }

  // Rule 5: SaaS user with organization accessing /v2/* → Allow
  if (!isOriginalAgencyOwner && hasSaaSOrg && pathname.startsWith('/v2/')) {
    console.log('[MIDDLEWARE] SaaS user with org accessing /v2/ - allowed');
    return response;
  }

  // Default: Allow the request
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
