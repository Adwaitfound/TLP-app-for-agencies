/**
 * Resend agency setup email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/provisioning/email-service';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { agencyId } = await request.json();

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Missing agencyId' },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get agency data
    const { data: agency, error } = await supabase
      .from('agency_onboarding_requests')
      .select('*')
      .eq('id', agencyId)
      .single();

    if (error || !agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    // Resend welcome email with the stored instance URL
    // Extract from metadata where orchestrator stored the provisioning details
    const metadata = agency.metadata || {};
    
    await sendWelcomeEmail({
      agencyName: agency.agency_name,
      adminEmail: agency.admin_email,
      instanceUrl: metadata.instanceUrl || 'https://tlp-the-found-project.vercel.app',
      supabaseProjectId: metadata.supabaseProjectId || '',
      supabaseUrl: metadata.supabaseProjectId ? `https://${metadata.supabaseProjectId}.supabase.co` : '',
      vercelProjectId: metadata.vercelProjectId || '',
      anonKey: metadata.supabaseAnonKey || '',
      serviceRoleKey: metadata.supabaseServiceKey || '',
    });

    return NextResponse.json({
      success: true,
      message: `Email resent to ${agency.admin_email}`,
    });

  } catch (error: any) {
    console.error('Resend email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resend email' },
      { status: 500 }
    );
  }
}
