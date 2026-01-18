/**
 * POST /api/v2/payment/create-order
 * Creates a Razorpay order for agency onboarding payment
 * 
 * Request body:
 * {
 *   agencyName: string
 *   adminEmail: string
 *   plan: 'free' | 'standard' | 'premium'
 *   billingCycle: 'monthly' | 'yearly'
 * }
 */

import { NextResponse } from 'next/server';
import {
  createRazorpayOrder,
  getPriceInPaise,
  PLAN_PRICING,
} from '@/lib/razorpay';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    console.log('[CREATE_ORDER_START] Processing payment request');
    
    const body = await request.json();
    const { agencyName, adminEmail, plan, billingCycle } = body;

    // Validate input
    if (!agencyName || !adminEmail || !plan || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyName, adminEmail, plan, billingCycle' },
        { status: 400 }
      );
    }

    if (!['free', 'standard', 'premium'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "free", "standard" or "premium"' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billingCycle. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Get price in paise
    const amountInPaise = getPriceInPaise(plan as 'free' | 'standard' | 'premium', billingCycle as any);
    const priceInRupees = amountInPaise / 100;
    const pricing = PLAN_PRICING[plan as keyof typeof PLAN_PRICING];

    // Generate receipt ID (unique per order)
    const receiptId = `onboarding-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    try {
      // Check if in development/test mode (test Razorpay credentials)
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
      
      console.log('[RAZORPAY_CHECK] KeyID exists:', !!razorpayKeyId);
      console.log('[RAZORPAY_CHECK] Secret exists:', !!razorpaySecret);
      
      const isTestMode = razorpayKeyId?.startsWith('rzp_test');
      
      console.log('[PAYMENT] Razorpay Key:', process.env.RAZORPAY_KEY_ID?.substring(0, 15) + '...');
      console.log('[PAYMENT] Test Mode:', isTestMode);
      
      // Create Razorpay order or mock order for testing
      let orderResult;
      
      if (isTestMode) {
        // Mock order for development/testing
        const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        orderResult = {
          success: true,
          order: {
            id: mockOrderId,
            amount: amountInPaise,
            currency: 'INR',
            receipt: receiptId,
            status: 'created',
            created_at: Math.floor(Date.now() / 1000),
          },
        };
        console.log('[PAYMENT_TEST_MODE] Using mock order:', mockOrderId);
      } else {
        // Real Razorpay API call
        orderResult = await createRazorpayOrder({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receiptId,
          description: `${pricing.name} Plan - Monthly Subscription`,
          notes: {
            agency_name: agencyName,
            admin_email: adminEmail,
            plan: plan,
            billing_cycle: billingCycle,
          },
        });
      }

      if (!orderResult.success) {
        return NextResponse.json(
          { error: 'Failed to create Razorpay order' },
          { status: 500 }
        );
      }

      // Save payment record to database (critical for webhook processing)
      const supabase = createServiceClient();

      const { error: dbInsertError } = await supabase
        .from('saas_organization_payments')
        .insert({
          org_id: null, // Will be set after payment verification
          plan_type: plan,
          billing_cycle: billingCycle,
          amount: priceInRupees,
          currency: 'INR',
          razorpay_order_id: orderResult.order.id,
          status: 'pending',
          description: `${pricing.name} Plan - ${billingCycle}`,
          notes: {
            agency_name: agencyName,
            admin_email: adminEmail,
            initiated_at: new Date().toISOString(),
          },
        });

      if (dbInsertError) {
        console.error('[PAYMENT_DB_INSERT_ERROR]', {
          error: dbInsertError,
          order_id: orderResult.order.id,
          admin_email: adminEmail,
        });
        // Still return success to client - webhook will handle verification
        // The payment exists in Razorpay even if DB insert fails
      } else {
        console.log('[PAYMENT_DB_INSERT_SUCCESS]', {
          order_id: orderResult.order.id,
          admin_email: adminEmail,
        });
      }

      // Return order details to client for payment form
      return NextResponse.json({
        success: true,
        order: {
          id: orderResult.order.id,
          amount: orderResult.order.amount,
          amountInRupees: priceInRupees,
          currency: orderResult.order.currency,
          plan: plan,
          billingCycle: billingCycle,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          testMode: isTestMode, // Explicitly tell frontend if this is a test order
        },
      });
    } catch (razorpayError: any) {
      console.error('[RAZORPAY_ERROR]', razorpayError);
      return NextResponse.json(
        {
          error: razorpayError.message || 'Failed to create payment order',
          details: razorpayError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[CREATE_ORDER_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
