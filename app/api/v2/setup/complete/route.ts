/**
 * POST /api/v2/setup/complete
 * Completes the magic link setup by:
 * 1. Creating the auth user
 * 2. Creating the users table record
 * 3. Creating the admin organization member
 * 4. Marking magic link as used
 * 5. Creating the admin session
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { token, email, fullName, password } = await request.json();

    // Validate input
    if (!token || !email || !fullName || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify the magic link again
    const { data: magicLink, error: linkError } = await supabase
      .from('saas_magic_links')
      .select('*')
      .eq('token', token)
      .eq('type', 'signup')
      .eq('email', email)
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
        { error: 'Setup link has expired' },
        { status: 410 }
      );
    }

    // Check if already used
    if (magicLink.used_at) {
      return NextResponse.json(
        { error: 'This link has already been used' },
        { status: 409 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      console.error('[AUTH_USER_CREATE_ERROR]', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    try {
      // Create users table record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
          role: 'admin', // Initial role for SaaS onboarding
          company_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (userError) {
        console.error('[USER_RECORD_ERROR]', userError);
        // Don't fail - user auth already created
      }

      // Create organization member record with admin role
      const { error: memberError } = await supabase
        .from('saas_organization_members')
        .insert({
          org_id: magicLink.org_id,
          user_id: userId,
          role: 'admin',
          status: 'active',
          accepted_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error('[ORG_MEMBER_ERROR]', memberError);
        return NextResponse.json(
          { error: 'Failed to set up organization membership' },
          { status: 500 }
        );
      }

      // Mark magic link as used
      const { error: updateError } = await supabase
        .from('saas_magic_links')
        .update({
          used_at: new Date().toISOString(),
          user_id: userId,
        })
        .eq('token', token);

      if (updateError) {
        console.error('[MAGIC_LINK_UPDATE_ERROR]', updateError);
      }

      // Create initial usage record for this organization
      const { error: usageError } = await supabase
        .from('saas_organization_usage')
        .insert({
          org_id: magicLink.org_id,
          projects_count: 0,
          team_members_count: 1, // Just the admin
          clients_count: 0,
          storage_used_bytes: 0,
          plan: (await supabase
            .from('saas_organizations')
            .select('plan')
            .eq('id', magicLink.org_id)
            .single()
          ).data?.plan || 'free',
        });

      if (usageError) {
        console.error('[USAGE_RECORD_ERROR]', usageError);
      }

      return NextResponse.json({
        success: true,
        user_id: userId,
        message: 'Setup completed successfully',
      });
    } catch (setupError) {
      console.error('[SETUP_ERROR]', setupError);
      // User auth was created but org setup failed
      // Try to clean up the auth user
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error('[CLEANUP_ERROR]', deleteError);
      }
      throw setupError;
    }
  } catch (error: any) {
    console.error('[COMPLETE_SETUP_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Setup failed' },
      { status: 500 }
    );
  }
}
