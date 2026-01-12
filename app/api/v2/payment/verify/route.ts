/**
 * POST /api/v2/payment/verify
 * Verifies Razorpay payment signature from client
 */

import { NextResponse } from 'next/server';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    const { orderId, paymentId, signature } = await request.json();

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifyRazorpayPaymentSignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    if (!isValid) {
      console.warn('[PAYMENT_INVALID_SIGNATURE]', { orderId, paymentId });
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 401 }
      );
    }

    // Signature is valid - backend webhook will handle org creation
    // Just acknowledge the payment
    return NextResponse.json({
      success: true,
      message: 'Payment verified. Setup link will be sent shortly.',
    });
  } catch (error: any) {
    console.error('[PAYMENT_VERIFY_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
