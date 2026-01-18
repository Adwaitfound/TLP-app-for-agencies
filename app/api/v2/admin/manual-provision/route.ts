/**
 * POST /api/v2/admin/manual-provision
 * Manually provision organization and send email (for payments not in database)
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, agencyName, plan = 'standard', billingCycle = 'monthly' } = await request.json();

    if (!email || !agencyName) {
      return NextResponse.json(
        { error: 'Email and agencyName are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Create organization slug
    const slug = agencyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    // Check if slug exists
    const { data: existingOrg } = await supabase
      .from('saas_organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    let finalSlug = slug;
    if (existingOrg) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from('saas_organizations')
      .insert({
        name: agencyName,
        slug: finalSlug,
        plan,
        status: 'active',
        payment_status: 'completed',
        amount_paid: 0, // Unknown
        subscription_started_at: new Date().toISOString(),
        subscription_ends_at: new Date(
          Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
        billing_cycle: billingCycle,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      console.error('[MANUAL_PROVISION_ORG_ERROR]', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    console.log('[MANUAL_PROVISION] Organization created:', org.id);

    // Generate random password (16 characters)
    const randomPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        org_id: org.id,
        org_name: agencyName,
        role: 'owner',
      },
    });

    if (authError || !authData.user) {
      console.error('[MANUAL_PROVISION_AUTH_ERROR]', authError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    console.log('[MANUAL_PROVISION] User created:', authData.user.id);

    // Add user to organization members
    const { error: memberError } = await supabase
      .from('saas_organization_members')
      .insert({
        org_id: org.id,
        user_id: authData.user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('[MANUAL_PROVISION_MEMBER_ERROR]', memberError);
      // Don't fail the whole request, just log it
    }

    // Construct login URL
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;

    // Send email
    let emailSent = false;
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('[MANUAL_PROVISION_EMAIL_SKIPPED] No RESEND_API_KEY');
      } else {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@example.com',
            to: email,
            subject: `Welcome to ${agencyName}! Your Account is Ready`,
            html: `
              <h2>Welcome to your new workspace!</h2>
              <p>Hi there,</p>
              <p>Your account has been created and is ready to use! Here are your login credentials:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: white; padding: 5px 10px; border-radius: 3px;">${randomPassword}</code></p>
              </div>
              <p><a href="${loginUrl}" style="padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Login Now</a></p>
              <p style="color: #ff6600; font-weight: bold;">⚠️ Important: Please change your password after logging in for the first time.</p>
              <p><strong>Your Organization Details:</strong></p>
              <ul>
                <li>Name: ${agencyName}</li>
                <li>Plan: ${plan}</li>
                <li>Billing: ${billingCycle}</li>
              </ul>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="color: #666; font-size: 12px; word-break: break-all;">${loginUrl}</p>
              <p>If you have any questions, reply to this email.</p>
            `,
          }),
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          console.log('[MANUAL_PROVISION_EMAIL_SUCCESS]', { email_id: emailData.id, to: email });
          emailSent = true;
        } else {
          const errorText = await emailResponse.text();
          console.error('[MANUAL_PROVISION_EMAIL_FAILED]', { status: emailResponse.status, error: errorText });
        }
      }
    } catch (emailError) {
      console.error('[MANUAL_PROVISION_EMAIL_ERROR]', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Organization created and login credentials sent',
      organization: {
        id: org.id,
        name: agencyName,
        slug: finalSlug,
        plan,
      },
      user: {
        id: authData.user.id,
        email,
      },
      email_sent: emailSent,
      login_url: loginUrl,
    });
  } catch (error: any) {
    console.error('[MANUAL_PROVISION_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to provision organization' },
      { status: 500 }
    );
  }
}
