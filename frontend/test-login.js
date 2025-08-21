// Simple login test
async function testLogin() {
  const credentialsList = [
    { email: 'admin@cornven.com', password: 'admin123' },
    { email: 'inventory@cornven.com', password: 'password123' },
    { email: 'pos@cornven.com', password: 'password123' }
  ];

  for (const credentials of credentialsList) {
    try {
      console.log(`\n🔐 Testing login with: ${credentials.email} / ${credentials.password}`);
      
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.text();
      
      if (response.ok) {
        console.log('✅ SUCCESS! Login successful');
        console.log('Response:', data);
        return; // Exit on first success
      } else {
        console.log(`❌ FAILED! Status: ${response.status}`);
        console.log('Response:', data);
      }
    } catch (error) {
      console.error('❌ ERROR:', error.message);
    }
  }
  
  console.log('\n❌ All login attempts failed');
}

testLogin();