/**
 * POST /api/v2/admin/resend-setup-email
 * Resend setup email for users who completed payment
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

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

    // Find completed payments for this email
    const { data: payments, error: paymentsError } = await supabase
      .from('saas_organization_payments')
      .select('*')
      .eq('status', 'captured')
      .not('org_id', 'is', null)
      .order('completed_at', { ascending: false });

    if (paymentsError) {
      console.error('[RESEND_EMAIL_ERROR]', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    // Find payment matching this email
    const payment = payments?.find(p => p.notes?.admin_email === email);

    if (!payment) {
      return NextResponse.json(
        { error: 'No completed payment found for this email' },
        { status: 404 }
      );
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('saas_organizations')
      .select('id, name, slug')
      .eq('id', payment.org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check for existing valid magic link
    const { data: existingLink } = await supabase
      .from('saas_magic_links')
      .select('*')
      .eq('org_id', org.id)
      .eq('email', email)
      .eq('type', 'signup')
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let token: string;

    if (existingLink) {
      const expiresAt = new Date(existingLink.expires_at);
      if (expiresAt > new Date()) {
        // Use existing valid link
        token = existingLink.token;
        console.log('[RESEND_EMAIL] Using existing valid link');
      } else {
        // Create new link (old one expired)
        token = crypto.randomBytes(32).toString('hex');
        const { error: linkError } = await supabase
          .from('saas_magic_links')
          .insert({
            type: 'signup',
            email,
            org_id: org.id,
            token,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              plan: payment.plan_type,
              billing_cycle: payment.billing_cycle,
              resent: true,
            },
          });

        if (linkError) {
          console.error('[RESEND_EMAIL_LINK_ERROR]', linkError);
          return NextResponse.json(
            { error: 'Failed to create magic link' },
            { status: 500 }
          );
        }
      }
    } else {
      // Create new magic link
      token = crypto.randomBytes(32).toString('hex');
      const { error: linkError } = await supabase
        .from('saas_magic_links')
        .insert({
          type: 'signup',
          email,
          org_id: org.id,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            plan: payment.plan_type,
            billing_cycle: payment.billing_cycle,
            resent: true,
          },
        });

      if (linkError) {
        console.error('[RESEND_EMAIL_LINK_ERROR]', linkError);
        return NextResponse.json(
          { error: 'Failed to create magic link' },
          { status: 500 }
        );
      }
    }

    // Construct setup URL
    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/v2/setup?token=${token}`;

    // Send email
    let emailSent = false;
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('[RESEND_EMAIL_SKIPPED] No RESEND_API_KEY');
        return NextResponse.json({
          success: false,
          error: 'Email service not configured',
          setup_url: setupUrl,
        });
      }

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@example.com',
          to: email,
          subject: `Welcome to ${org.name}! Complete Your Setup`,
          html: `
            <h2>Welcome to your new workspace!</h2>
            <p>Hi there,</p>
            <p>Your payment has been confirmed and your workspace is ready. Click the link below to set up your password and get started:</p>
            <p><a href="${setupUrl}" style="padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Setup</a></p>
            <p style="color: #666; font-size: 12px;">This link expires in 7 days.</p>
            <p><strong>Your Organization Details:</strong></p>
            <ul>
              <li>Name: ${org.name}</li>
              <li>Plan: ${payment.plan_type}</li>
              <li>Billing: ${payment.billing_cycle}</li>
            </ul>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${setupUrl}</p>
            <p>If you have any questions, reply to this email.</p>
          `,
        }),
      });

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        console.log('[RESEND_EMAIL_SUCCESS]', { email_id: emailData.id, to: email });
        emailSent = true;
      } else {
        const errorText = await emailResponse.text();
        console.error('[RESEND_EMAIL_FAILED]', { status: emailResponse.status, error: errorText });
        return NextResponse.json({
          success: false,
          error: 'Failed to send email',
          setup_url: setupUrl,
        });
      }
    } catch (emailError) {
      console.error('[RESEND_EMAIL_ERROR]', emailError);
      return NextResponse.json({
        success: false,
        error: 'Email sending failed',
        setup_url: setupUrl,
      });
    }

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      setup_url: emailSent ? undefined : setupUrl,
      organization: org.name,
    });
  } catch (error: any) {
    console.error('[RESEND_EMAIL_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resend email' },
      { status: 500 }
    );
  }
}
