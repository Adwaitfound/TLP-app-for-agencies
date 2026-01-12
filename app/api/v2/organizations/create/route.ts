import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API Route: Create Organization
 * Called from the onboarding page when a user creates their first org
 */

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Create server-side Supabase client
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user already has an organization
    const { data: existingMembership } = await supabase
      .from('saas_organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You already have an organization' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('saas_organizations')
      .insert({
        name,
        slug,
        plan: 'free',
        status: 'active',
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Create membership
    const { error: memberError } = await supabase
      .from('saas_organization_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'admin',
        status: 'active',
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Error creating membership:', memberError);
      // Try to clean up the org
      await supabase.from('saas_organizations').delete().eq('id', org.id);
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      );
    }

    // Create initial usage record
    await supabase.from('saas_organization_usage').insert({
      org_id: org.id,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      projects_used: 0,
      storage_used_mb: 0,
      team_members_used: 1,
    });

    return NextResponse.json({
      success: true,
      organization: org,
    });
  } catch (error: any) {
    console.error('Error in create organization API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
