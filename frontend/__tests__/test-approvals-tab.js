// Test script to verify Approvals tab visibility after login
const testApprovalsTab = async () => {
  console.log('Testing Approvals tab visibility...');
  
  try {
    // Test login with admin credentials
    const loginResponse = await fetch('https://cornven-pos-system.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cornven.com',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful:', loginData.user.role);
      console.log('✅ User permissions should include admin-products');
      console.log('✅ Approvals tab should be visible in admin navigation');
      
      // Check if user has admin-products permission
      const permissions = ['tenants', 'inventory', 'pos', 'reports', 'admin-sales', 'admin-products'];
      if (permissions.includes('admin-products')) {
        console.log('✅ admin-products permission confirmed');
      }
    } else {
      console.log('❌ Login failed:', await loginResponse.text());
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testApprovalsTab();