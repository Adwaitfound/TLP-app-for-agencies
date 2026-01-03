/**
 * Agency Setup Endpoint
 * 
 * Validates setup token and initializes:
 * 1. User account
 * 2. Returns auth session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySetupToken } from '@/lib/provisioning/email-service';

export async function POST(request: NextRequest) {
  try {
    const { token, password, name } = await request.json();

    console.log('Setup API called with:', { 
      tokenExists: !!token, 
      passwordExists: !!password, 
      name 
    });

    if (!token || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: token, password, name' },
        { status: 400 }
      );
    }

    // Verify and decode token
    let tokenData;
    try {
      tokenData = verifySetupToken(token);
      console.log('✅ Token verified successfully:', { 
        agencyId: tokenData.agencyId,
        email: tokenData.adminEmail, 
        projectId: tokenData.supabaseProjectId,
        anonKeyExists: !!tokenData.anonKey,
        serviceRoleKeyExists: !!tokenData.serviceRoleKey
      });
    } catch (error: any) {
      console.error('❌ Token verification failed:', error.message);
      return NextResponse.json(
        { error: 'Invalid or expired setup token: ' + error.message },
        { status: 401 }
      );
    }

    // Create Supabase client for the agency's database
    console.log('🔗 Creating Supabase client for project:', tokenData.supabaseProjectId);
    
    if (!tokenData.serviceRoleKey) {
      console.error('❌ Missing serviceRoleKey in token');
      return NextResponse.json(
        { error: 'Invalid token: missing serviceRoleKey' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      `https://${tokenData.supabaseProjectId}.supabase.co`,
      tokenData.serviceRoleKey
    );

    console.log('✅ Supabase client created');

    // Step 1: Create user account
    console.log('👤 Creating user account...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: tokenData.adminEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        setup_completed: true,
      },
    });

    if (authError) {
      console.error('⚠️  User creation note:', authError.message);
      // Don't fail here - user might already exist or be created in a moment
    } else {
      console.log('✅ User created:', authData?.user?.id);
    }

    const userId = authData?.user?.id;

    // Step 2: Try to sign in (works whether we just created or already existed)
    console.log('🔐 Creating session...');
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: tokenData.adminEmail,
      password: password,
    });

    if (signInError) {
      console.error('❌ Sign in error:', JSON.stringify(signInError, null, 2));
      return NextResponse.json(
        { error: 'Failed to create session: ' + signInError.message },
        { status: 500 }
      );
    }

    if (!sessionData.session) {
      console.error('❌ No session returned after sign in');
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    console.log('✅ Session created successfully');

    console.log('✅ Setup complete for:', tokenData.adminEmail);

    return NextResponse.json({
      success: true,
      session: sessionData.session,
      user: sessionData.user,
      instanceUrl: tokenData.vercelUrl || 'https://tlp-the-found-project.vercel.app',
      supabaseUrl: `https://${tokenData.supabaseProjectId}.supabase.co`,
      supabaseAnonKey: tokenData.anonKey,
      agencyId: tokenData.agencyId,
      message: 'Setup complete! You are now logged in.',
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: error.message || 'Setup failed', details: error.toString() },
      { status: 500 }
    );
  }
}
