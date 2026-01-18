/**
 * GET /api/v2/admin/check-payments
 * Check payment and organization status in database
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();

    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('saas_organization_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch payments', details: paymentsError },
        { status: 500 }
      );
    }

    const results = [];

    for (const payment of payments || []) {
      const result: any = {
        payment_id: payment.id,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        status: payment.status,
        amount: payment.amount,
        plan: payment.plan_type,
        billing_cycle: payment.billing_cycle,
        admin_email: payment.notes?.admin_email,
        agency_name: payment.notes?.agency_name,
        created_at: payment.created_at,
        completed_at: payment.completed_at,
        org_id: payment.org_id,
      };

      // Check if organization was created
      if (payment.org_id) {
        const { data: org } = await supabase
          .from('saas_organizations')
          .select('id, name, slug, plan, status')
          .eq('id', payment.org_id)
          .single();

        if (org) {
          result.organization = org;

          // Check for magic links
          const { data: magicLinks } = await supabase
            .from('saas_magic_links')
            .select('*')
            .eq('org_id', payment.org_id)
            .eq('type', 'signup')
            .order('created_at', { ascending: false });

          if (magicLinks && magicLinks.length > 0) {
            result.magic_links = magicLinks.map(link => ({
              email: link.email,
              token: link.token,
              expires_at: link.expires_at,
              used_at: link.used_at,
              is_expired: new Date(link.expires_at) < new Date(),
              is_used: !!link.used_at,
              setup_url: !link.used_at && new Date(link.expires_at) > new Date()
                ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/v2/setup?token=${link.token}`
                : null,
            }));
          }
        }
      }

      results.push(result);
    }

    return NextResponse.json({
      total_payments: payments?.length || 0,
      payments: results,
    });
  } catch (error: any) {
    console.error('[CHECK_PAYMENTS_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check payments' },
      { status: 500 }
    );
  }
}
