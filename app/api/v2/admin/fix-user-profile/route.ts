/**
 * POST /api/v2/admin/fix-user-profile
 * Fix user profile in users table for existing auth users
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get user from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('[FIX_PROFILE_AUTH_ERROR]', authError);
      return NextResponse.json(
        { error: 'Failed to fetch auth users' },
        { status: 500 }
      );
    }

    const authUser = authUsers.users.find(u => u.email === email);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'User not found in auth' },
        { status: 404 }
      );
    }

    // Get org membership
    const { data: membership } = await supabase
      .from('saas_organization_members')
      .select('org_id, saas_organizations(name)')
      .eq('user_id', authUser.id)
      .single();

    const orgName = (membership as any)?.saas_organizations?.name || email.split('@')[0];

    // Upsert user profile
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        email,
        role: 'admin',
        status: 'active',
        full_name: authUser.user_metadata?.full_name || email.split('@')[0],
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('[FIX_PROFILE_UPSERT_ERROR]', profileError);
      return NextResponse.json(
        { error: 'Failed to create/update user profile', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User profile fixed',
      user: {
        id: authUser.id,
        email: authUser.email,
      },
    });
  } catch (error: any) {
    console.error('[FIX_PROFILE_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fix user profile' },
      { status: 500 }
    );
  }
}
