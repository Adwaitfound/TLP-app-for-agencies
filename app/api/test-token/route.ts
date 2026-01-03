/**
 * Test JWT token verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySetupToken } from '@/lib/provisioning/email-service';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    console.log('Testing token verification...');
    console.log('Token:', token.substring(0, 50) + '...');

    const tokenData = verifySetupToken(token);
    
    console.log('✅ Token verified:', tokenData);

    return NextResponse.json({
      success: true,
      data: tokenData,
    });

  } catch (error: any) {
    console.error('❌ Token verification failed:', error.message);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
