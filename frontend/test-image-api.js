// Test script to verify image API access and token authentication
// Using built-in fetch API (Node.js 18+)

// Test function to check API access
async function testImageAPI() {
  console.log('Testing image API access...');
  
  // Test without token - using localhost API (Next.js API route)
  try {
    console.log('\n1. Testing localhost API without token:');
    const response = await fetch('http://localhost:3000/api/variants/test-variant-id/image-url', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error without token:', error.message);
  }
  
  // Test with invalid token
  try {
    console.log('\n2. Testing with invalid token:');
    const response = await fetch('https://cornven-pos-system.vercel.app/api/variants/test-variant-id/image-url', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error with invalid token:', error.message);
  }
  
  console.log('\nTo test with a valid token:');
  console.log('1. Log in to the application at http://localhost:3000');
  console.log('2. Open browser console and run: localStorage.getItem("cornven_token")');
  console.log('3. Copy the token and replace "YOUR_VALID_TOKEN_HERE" in this script');
  console.log('4. Uncomment and run the valid token test below');
  
  /*
  // Test with valid token (uncomment and add your token)
  try {
    console.log('\n3. Testing with valid token:');
    const validToken = 'YOUR_VALID_TOKEN_HERE';
    const response = await fetch('https://cornven-pos-system.vercel.app/api/variants/REAL_VARIANT_ID/image-url', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      }
    });
    
    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error with valid token:', error.message);
  }
  */
}

testImageAPI();