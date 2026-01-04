const CRON_SECRET = 'dw7GAlH7VpoLQHGEcTz5Trf7g7NNo6TdFRYpR7xB0GU=';
const URL = 'https://app.thelostproject.in/api/cron/backup';

console.log('🧪 Testing backup endpoint...\n');

try {
  console.log('📡 Making request to:', URL);
  const response = await fetch(URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  console.log('✅ Response Status:', response.status);
  const data = await response.json();
  
  if (response.ok) {
    console.log('\n✅ BACKUP SUCCESSFUL!');
    console.log('\nStats:', data.stats);
    console.log('Email sent:', data.emailSent);
  } else {
    console.log('\n❌ Error:', data);
  }
} catch (error) {
  console.error('❌ Request failed:', error.message);
}
