const API_BASE_URL = 'http://localhost:3001/api';

// Test data for adding a tenant
const testTenantData = {
  name: "John Smith",
  email: "john.smith@example.com",
  password: "Tenant@1234",
  phone: "0400123456",
  businessName: "John's Coffee Shop",
  address: "123 Main St, Melbourne VIC 3000",
  notes: "New tenant, priority customer"
};

async function testAddTenant() {
  try {
    const { default: fetch } = await import('node-fetch');
    console.log('🧪 Testing Add Tenant API...\n');

    // First, login to get a token
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cornven.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Test adding a tenant
    console.log('\n2. Adding new tenant...');
    console.log('Tenant data:', JSON.stringify(testTenantData, null, 2));

    const addTenantResponse = await fetch(`${API_BASE_URL}/admin/add-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testTenantData),
    });

    console.log(`Response status: ${addTenantResponse.status}`);
    
    if (!addTenantResponse.ok) {
      const errorText = await addTenantResponse.text();
      console.log('❌ Add tenant failed');
      console.log('Error response:', errorText);
      return;
    }

    const addTenantData = await addTenantResponse.json();
    console.log('✅ Tenant added successfully!');
    console.log('Response:', JSON.stringify(addTenantData, null, 2));

    // Test edge cases
    console.log('\n3. Testing edge cases...');

    // Test duplicate email
    console.log('\n3a. Testing duplicate email...');
    const duplicateEmailResponse = await fetch(`${API_BASE_URL}/admin/add-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testTenantData), // Same data
    });

    console.log(`Duplicate email response status: ${duplicateEmailResponse.status}`);
    if (!duplicateEmailResponse.ok) {
      const errorText = await duplicateEmailResponse.text();
      console.log('✅ Duplicate email correctly rejected');
      console.log('Error message:', errorText);
    }

    // Test invalid email format
    console.log('\n3b. Testing invalid email format...');
    const invalidEmailData = { ...testTenantData, email: 'invalid-email' };
    const invalidEmailResponse = await fetch(`${API_BASE_URL}/admin/add-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invalidEmailData),
    });

    console.log(`Invalid email response status: ${invalidEmailResponse.status}`);
    if (!invalidEmailResponse.ok) {
      const errorText = await invalidEmailResponse.text();
      console.log('✅ Invalid email correctly rejected');
      console.log('Error message:', errorText);
    }

    // Test missing required fields
    console.log('\n3c. Testing missing required fields...');
    const incompleteData = { name: "Test", email: "test@example.com" }; // Missing required fields
    const incompleteResponse = await fetch(`${API_BASE_URL}/admin/add-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(incompleteData),
    });

    console.log(`Incomplete data response status: ${incompleteResponse.status}`);
    if (!incompleteResponse.ok) {
      const errorText = await incompleteResponse.text();
      console.log('✅ Incomplete data correctly rejected');
      console.log('Error message:', errorText);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAddTenant();