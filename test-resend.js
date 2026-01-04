// Quick Resend API test
// Run: node test-resend.js

const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_API_KEY_HERE';
const TO_EMAIL = 'YOUR_EMAIL_HERE'; // Your email to test

async function testResend() {
  console.log('🧪 Testing Resend API...\n');
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: TO_EMAIL,
      subject: 'Test from The Lost Project',
      html: '<h1>✅ It works!</h1><p>Your Resend API is configured correctly.</p>',
    }),
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success! Email sent.');
    console.log('📧 Email ID:', data.id);
    console.log('\nCheck your inbox at:', TO_EMAIL);
  } else {
    console.log('❌ Error:', data);
  }
}

testResend().catch(console.error);
