// Test script to verify the tenant creation and cube selection flow
const testTenantCreation = async () => {
  try {
    console.log('Testing tenant creation...');
    
    const tenantData = {
      name: "Test User Flow",
      email: "testflow@example.com",
      password: "Test@1234",
      phone: "+61400123456",
      businessName: "Test Business Flow",
      address: "123 Test Street, Melbourne",
      notes: "Testing cube selection flow"
    };

    const response = await fetch('https://cornven-pos-system.vercel.app/admin/add-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-123`
      },
      body: JSON.stringify(tenantData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Tenant created successfully!');
      console.log('Response structure:', JSON.stringify(result, null, 2));
      console.log('Tenant ID:', result.id);
      console.log('Tenant details from response.tenants[0]:', result.tenants[0]);
      
      // Test cube allocation with the received tenant ID
      await testCubeAllocation(result.id);
    } else {
      const error = await response.json();
      console.log('❌ Tenant creation failed:', error);
    }
  } catch (error) {
    console.error('❌ Error testing tenant creation:', error);
  }
};

const testCubeAllocation = async (tenantId) => {
  try {
    console.log('\nTesting cube allocation...');
    
    const allocationData = {
      tenantId: tenantId,
      cubeId: "21a057be-058c-4463-a6d1-ad793a148362",
      startDate: "2025-08-05T00:00:00.000Z",
      endDate: "2026-09-05T00:00:00.000Z"
    };

    console.log('Allocation data:', JSON.stringify(allocationData, null, 2));

    const response = await fetch('https://cornven-pos-system.vercel.app/admin/tenant-cube-allocation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-123`
      },
      body: JSON.stringify(allocationData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cube allocation successful!');
      console.log('Allocation result:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.json();
      console.log('❌ Cube allocation failed:', error);
      console.log('Response status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing cube allocation:', error);
  }
};

// Run the test
testTenantCreation();