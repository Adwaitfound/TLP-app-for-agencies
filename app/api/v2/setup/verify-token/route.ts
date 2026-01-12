/**
 * POST /api/v2/setup/verify-token
 * Verifies a magic link token and returns org/email info
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Find the magic link
    const { data: magicLink, error: linkError } = await supabase
      .from('saas_magic_links')
      .select('*')
      .eq('token', token)
      .eq('type', 'signup')
      .single();

    if (linkError || !magicLink) {
      return NextResponse.json(
        { error: 'Invalid setup token' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(magicLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Setup link has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // Check if already used
    if (magicLink.used_at) {
      return NextResponse.json(
        { error: 'This setup link has already been used' },
        { status: 409 }
      );
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('saas_organizations')
      .select('name, plan, subscription_ends_at')
      .eq('id', magicLink.org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: magicLink.email,
      orgName: org.name,
      plan: org.plan,
      subscriptionEndsAt: org.subscription_ends_at,
    });
  } catch (error: any) {
    console.error('[VERIFY_TOKEN_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify token' },
      { status: 500 }
    );
  }
}
