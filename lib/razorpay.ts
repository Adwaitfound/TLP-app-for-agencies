/**
 * Razorpay Integration Utilities
 * Handles payment order creation, verification, and webhook processing
 */

import crypto from 'crypto';

interface RazorpayOrderOptions {
  amount: number; // Amount in paise (e.g., 99900 = ₹999)
  currency?: string;
  receipt?: string;
  customer_id?: string;
  description?: string;
  notes?: Record<string, string>;
}

interface RazorpayPaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        description?: string;
        amount_refunded?: number;
        refund_status?: string;
        captured: boolean;
        email?: string;
        contact?: string;
        customer_id?: string;
        token_id?: string;
        notes?: Record<string, string>;
        fee?: number;
        tax?: number;
        error_code?: string;
        error_description?: string;
        error_source?: string;
        error_reason?: string;
        error_step?: string;
        error_field?: string;
        acquirer_data?: Record<string, string>;
        vpa?: string;
        created_at: number;
      };
    };
    order?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt: string;
        offer_id?: string;
        status: string;
        attempts: number;
        notes?: Record<string, string>;
        created_at: number;
      };
    };
  };
}

/**
 * Get Razorpay API credentials from environment
 */
function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  return { keyId, keySecret };
}

/**
 * Create a Razorpay order for payment
 * Reference: https://razorpay.com/docs/api/orders/create/
 */
export async function createRazorpayOrder(options: RazorpayOrderOptions) {
  const { keyId, keySecret } = getRazorpayCredentials();

  const {
    amount,
    currency = 'INR',
    receipt,
    customer_id,
    description,
    notes,
  } = options;

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString(
          'base64'
        )}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        customer_id,
        description,
        notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.description || 'Failed to create Razorpay order'
      );
    }

    return {
      success: true,
      order: {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt,
        status: data.status,
        created_at: data.created_at,
      },
    };
  } catch (error) {
    console.error('[RAZORPAY_ORDER_ERROR]', error);
    throw error;
  }
}

/**
 * Verify Razorpay payment signature
 * This ensures the payment response is genuine and not tampered with
 */
export function verifyRazorpayPaymentSignature(
  verification: RazorpayPaymentVerification
): boolean {
  const { keySecret } = getRazorpayCredentials();

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    verification;

  // Create the expected signature
  const data = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(data)
    .digest('hex');

  // Compare with provided signature
  return expectedSignature === razorpay_signature;
}

/**
 * Verify Razorpay webhook signature
 * Reference: https://razorpay.com/docs/webhooks/validate/
 */
export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string
): boolean {
  const { keySecret } = getRazorpayCredentials();

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Fetch payment details from Razorpay API
 */
export async function fetchRazorpayPayment(paymentId: string) {
  const { keyId, keySecret } = getRazorpayCredentials();

  try {
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${paymentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString(
            'base64'
          )}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.description || 'Failed to fetch payment details'
      );
    }

    return {
      success: true,
      payment: data,
    };
  } catch (error) {
    console.error('[RAZORPAY_FETCH_ERROR]', error);
    throw error;
  }
}

/**
 * Parse and validate Razorpay webhook event
 */
export function parseRazorpayWebhookEvent(body: unknown): RazorpayWebhookEvent {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid webhook payload');
  }

  const event = body as RazorpayWebhookEvent;

  if (!event.event || !event.payload) {
    throw new Error('Missing event or payload in webhook');
  }

  return event;
}

/**
 * Get payment status description
 */
export function getPaymentStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    pending: 'Payment is pending',
    authorized: 'Payment has been authorized',
    captured: 'Payment has been captured successfully',
    refunded: 'Payment has been refunded',
    failed: 'Payment has failed',
  };

  return descriptions[status] || 'Unknown status';
}

/**
 * Plan pricing configuration
 */
export const PLAN_PRICING: Record<
  string,
  {
    name: string;
    monthlyPrice: number; // In INR
    yearlyPrice: number;
    yearlyDiscount: number; // percentage
  }
> = {
  free: {
    name: 'Free (Test)',
    monthlyPrice: 1, // ₹1 for testing
    yearlyPrice: 1, // ₹1 for testing
    yearlyDiscount: 0,
  },
  standard: {
    name: 'Standard',
    monthlyPrice: 999, // ₹999/month
    yearlyPrice: 9990, // ₹9990/year (~₹832/month)
    yearlyDiscount: 17,
  },
  premium: {
    name: 'Premium',
    monthlyPrice: 2999, // ₹2999/month
    yearlyPrice: 29990, // ₹29990/year (~₹2499/month)
    yearlyDiscount: 17,
  },
};

/**
 * Get price in paise for Razorpay
 * Razorpay expects amounts in the smallest currency unit (paise for INR)
 */
export function getPriceInPaise(
  plan: keyof typeof PLAN_PRICING,
  billingCycle: 'monthly' | 'yearly'
): number {
  const pricing = PLAN_PRICING[plan];
  if (!pricing) {
    throw new Error(`Unknown plan: ${plan}`);
  }

  const priceInRupees =
    billingCycle === 'monthly' ? pricing.monthlyPrice : pricing.yearlyPrice;
  return priceInRupees * 100; // Convert to paise
}
