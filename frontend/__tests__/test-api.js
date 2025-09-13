// Simple test script to validate API integration
const testLogin = async () => {
  const API_BASE_URL = 'https://cornven-pos-system.vercel.app';
  
  try {
    console.log('Testing login API...');
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cornven.com',
        password: 'Admin@1234'
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Login successful!');
    console.log('User:', data.user);
    console.log('Token received:', data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('Network error:', error.message);
  }
};

// Run the test
testLogin();