/**
 * POST /api/v2/admin/create-org-and-send-email
 * Manually create organization and send setup email for completed payment
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

    // Find the payment for this email
    const { data: payments, error: paymentsError } = await supabase
      .from('saas_organization_payments')
      .select('*')
      .eq('status', 'captured')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('[CREATE_ORG_ERROR]', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    const payment = payments?.find(p => p.notes?.admin_email === email);

    if (!payment) {
      return NextResponse.json(
        { error: `No completed payment found for ${email}` },
        { status: 404 }
      );
    }

    console.log('[CREATE_ORG] Found payment for:', email);

    // Check if organization already exists
    if (payment.org_id) {
      console.log('[CREATE_ORG] Organization already exists:', payment.org_id);
      return NextResponse.json({
        message: 'Organization already created',
        org_id: payment.org_id,
      });
    }

    const agencyName = payment.notes?.agency_name || 'Agency';

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
        plan: payment.plan_type,
        status: 'active',
        payment_status: 'completed',
        amount_paid: payment.amount,
        subscription_started_at: new Date().toISOString(),
        subscription_ends_at: new Date(
          Date.now() + (payment.billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
        billing_cycle: payment.billing_cycle,
        razorpay_order_id: payment.razorpay_order_id,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      console.error('[CREATE_ORG_ERROR]', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    console.log('[CREATE_ORG] Organization created:', org.id);

    // Link payment to organization
    const { error: linkError } = await supabase
      .from('saas_organization_payments')
      .update({ org_id: org.id })
      .eq('id', payment.id);

    if (linkError) {
      console.error('[CREATE_ORG_LINK_ERROR]', linkError);
    }

    // Create magic link
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: magicLinkError } = await supabase
      .from('saas_magic_links')
      .insert({
        type: 'signup',
        email,
        org_id: org.id,
        token,
        expires_at: expiresAt.toISOString(),
        metadata: {
          plan: payment.plan_type,
          billing_cycle: payment.billing_cycle,
          manual_creation: true,
        },
      });

    if (magicLinkError) {
      console.error('[CREATE_ORG_MAGIC_LINK_ERROR]', magicLinkError);
      return NextResponse.json(
        { error: 'Failed to create setup link' },
        { status: 500 }
      );
    }

    // Construct setup URL
    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/v2/setup?token=${token}`;

    // Send email
    let emailSent = false;
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('[CREATE_ORG_EMAIL_SKIPPED] No RESEND_API_KEY');
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
            subject: `Welcome to ${agencyName}! Complete Your Setup`,
            html: `
              <h2>Welcome to your new workspace!</h2>
              <p>Hi there,</p>
              <p>Your payment has been confirmed and your workspace is ready. Click the link below to set up your password and get started:</p>
              <p><a href="${setupUrl}" style="padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Setup</a></p>
              <p style="color: #666; font-size: 12px;">This link expires in 7 days.</p>
              <p><strong>Your Organization Details:</strong></p>
              <ul>
                <li>Name: ${agencyName}</li>
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
          console.log('[CREATE_ORG_EMAIL_SUCCESS]', { email_id: emailData.id, to: email });
          emailSent = true;
        } else {
          const errorText = await emailResponse.text();
          console.error('[CREATE_ORG_EMAIL_FAILED]', { status: emailResponse.status, error: errorText });
        }
      }
    } catch (emailError) {
      console.error('[CREATE_ORG_EMAIL_ERROR]', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Organization created and email sent',
      organization: {
        id: org.id,
        name: agencyName,
        slug: finalSlug,
      },
      email_sent: emailSent,
      setup_url: setupUrl,
    });
  } catch (error: any) {
    console.error('[CREATE_ORG_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}
