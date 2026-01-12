require('dotenv').config({path:'.env.local'});

console.log('\n🔍 Environment Variables Check:\n');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✓ Set' : '✗ Missing');
console.log('NEXT_PUBLIC_RAZORPAY_KEY_ID:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing');
console.log('');

if (process.env.RAZORPAY_KEY_ID) {
  console.log('Key ID preview:', process.env.RAZORPAY_KEY_ID.substring(0, 15) + '...');
}
