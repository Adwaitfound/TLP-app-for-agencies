/**
 * POST /api/v2/payment/verify-webhook
 * Razorpay webhook endpoint for payment verification and auto-approval
 * 
 * This endpoint:
 * 1. Verifies the webhook signature
 * 2. Handles payment.authorized and payment.captured events
 * 3. Creates the organization
 * 4. Creates magic link for admin setup
 * 5. Sends magic link email to admin
 */

import { NextResponse } from 'next/server';
import {
  verifyRazorpayWebhookSignature,
  parseRazorpayWebhookEvent,
} from '@/lib/razorpay';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('[WEBHOOK_NO_SIGNATURE]');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = verifyRazorpayWebhookSignature(body, signature);
    if (!isValid) {
      console.warn('[WEBHOOK_INVALID_SIGNATURE]');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook event
    const event = parseRazorpayWebhookEvent(JSON.parse(body));

    // We care about payment.authorized and payment.captured events
    const handledEvents = ['payment.authorized', 'payment.captured'];
    if (!handledEvents.includes(event.event)) {
      console.log(`[WEBHOOK_IGNORED_EVENT] ${event.event}`);
      return NextResponse.json({ acknowledged: true });
    }

    const payment = event.payload.payment?.entity;
    if (!payment) {
      return NextResponse.json(
        { error: 'No payment entity in webhook' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get the payment record from our database
    const { data: existingPayment, error: fetchError } = await supabase
      .from('saas_organization_payments')
      .select('*')
      .eq('razorpay_order_id', payment.order_id)
      .single();

    if (fetchError || !existingPayment) {
      console.error('[WEBHOOK_PAYMENT_NOT_FOUND]', {
        order_id: payment.order_id,
        error: fetchError,
      });
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Get agency onboarding request
    const agencyName = payment.notes?.agency_name;
    const adminEmail = payment.notes?.admin_email;

    if (!agencyName || !adminEmail) {
      console.error('[WEBHOOK_MISSING_NOTES]', { payment_id: payment.id });
      return NextResponse.json(
        { error: 'Missing agency details in payment notes' },
        { status: 400 }
      );
    }

    // Update payment record with payment details
    const { error: updatePaymentError } = await supabase
      .from('saas_organization_payments')
      .update({
        razorpay_payment_id: payment.id,
        status: event.event === 'payment.captured' ? 'captured' : 'authorized',
        completed_at: new Date().toISOString(),
      })
      .eq('id', existingPayment.id);

    if (updatePaymentError) {
      console.error('[WEBHOOK_UPDATE_PAYMENT_ERROR]', updatePaymentError);
    }

    // Check if organization already exists for this payment
    if (existingPayment.org_id) {
      console.log('[WEBHOOK_ORG_ALREADY_EXISTS]', {
        org_id: existingPayment.org_id,
      });
      return NextResponse.json({
        acknowledged: true,
        message: 'Organization already provisioned',
      });
    }

    // Create organization slug from agency name
    const slug = agencyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from('saas_organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    let finalSlug = slug;
    if (existingOrg) {
      // Add random suffix if slug exists
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from('saas_organizations')
      .insert({
        name: agencyName,
        slug: finalSlug,
        plan: existingPayment.plan_type,
        status: 'active',
        payment_status: 'completed',
        amount_paid: existingPayment.amount,
        subscription_started_at: new Date().toISOString(),
        subscription_ends_at: new Date(
          Date.now() + (existingPayment.billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
        billing_cycle: existingPayment.billing_cycle,
        razorpay_order_id: payment.order_id,
        razorpay_customer_id: payment.customer_id || null,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      console.error('[WEBHOOK_ORG_CREATE_ERROR]', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Link payment to organization
    const { error: linkError } = await supabase
      .from('saas_organization_payments')
      .update({ org_id: org.id })
      .eq('id', existingPayment.id);

    if (linkError) {
      console.error('[WEBHOOK_LINK_PAYMENT_ERROR]', linkError);
    }

    // Create magic link for admin setup
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: magicLink, error: magicLinkError } = await supabase
      .from('saas_magic_links')
      .insert({
        type: 'signup',
        email: adminEmail,
        org_id: org.id,
        token,
        expires_at: expiresAt.toISOString(),
        metadata: {
          plan: existingPayment.plan_type,
          billing_cycle: existingPayment.billing_cycle,
        },
      })
      .select('id')
      .single();

    if (magicLinkError) {
      console.error('[WEBHOOK_MAGIC_LINK_ERROR]', magicLinkError);
      return NextResponse.json(
        { error: 'Failed to create setup link' },
        { status: 500 }
      );
    }

    // Construct setup URL
    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/v2/setup?token=${token}`;

    // Send magic link email
    let emailSent = false;
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('[WEBHOOK_EMAIL_SKIPPED] No RESEND_API_KEY configured');
        console.log(`[WEBHOOK_SETUP_URL] ${setupUrl}`);
      } else {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@example.com',
            to: adminEmail,
            subject: `Welcome to ${agencyName}! Complete Your Setup`,
            html: `
              <h2>Welcome to your new workspace!</h2>
              <p>Hi there,</p>
              <p>Your payment has been confirmed and your workspace is ready. Click the link below to set up your password and get started:</p>
              <p><a href="${setupUrl}" style="padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px;">Complete Setup</a></p>
              <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
              <p>If you have any questions, reply to this email.</p>
            `,
          }),
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          console.log('[WEBHOOK_EMAIL_SENT]', { email_id: emailData.id, to: adminEmail });
          emailSent = true;
        } else {
          const errorText = await emailResponse.text();
          console.error('[WEBHOOK_EMAIL_FAILED]', { status: emailResponse.status, error: errorText });
        }
      }
    } catch (emailError) {
      console.error('[WEBHOOK_EMAIL_ERROR]', emailError);
      // Don't fail the webhook if email fails - the admin can still access via the dashboard
    }

    console.log('[WEBHOOK_SUCCESS]', {
      org_id: org.id,
      admin_email: adminEmail,
      plan: existingPayment.plan_type,
      email_sent: emailSent,
      setup_url: emailSent ? '(sent via email)' : setupUrl,
    });

    return NextResponse.json({
      acknowledged: true,
      org_id: org.id,
      setup_link_sent: emailSent,
      setup_url: emailSent ? undefined : setupUrl, // Include URL if email wasn't sent
    });
  } catch (error: any) {
    console.error('[WEBHOOK_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// For webhook verification (optional - some providers need this)
export async function GET(request: Request) {
  // Razorpay doesn't require GET verification, but some services do
  return NextResponse.json({ status: 'ok' });
}

import crypto from 'crypto';
