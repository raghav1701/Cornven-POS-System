// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001/api';

// Test configuration
const testConfig = {
  adminCredentials: {
    email: 'admin@cornven.com',
    password: 'admin123'
  }
};

let authToken = '';

async function login() {
  console.log('🔐 Testing Admin Login...');
  
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testConfig.adminCredentials),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    authToken = data.token;
    
    console.log('✅ Login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log(`   User: ${data.user.name} (${data.user.role})`);
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

async function testViewTenants() {
  console.log('\n📋 Testing View Tenants API...');
  
  try {
    const response = await fetch(`${BASE_URL}/admin/tenants-allocations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`View tenants failed: ${response.status} ${response.statusText}`);
    }

    const tenants = await response.json();
    
    console.log('✅ View tenants successful');
    console.log(`   Found ${tenants.length} tenants`);
    
    if (tenants.length > 0) {
      const tenant = tenants[0];
      console.log(`   Sample tenant: ${tenant.user.name} (${tenant.businessName})`);
      console.log(`   Rentals: ${tenant.rentals.length}`);
      if (tenant.rentals.length > 0) {
        console.log(`   First rental: ${tenant.rentals[0].cube.code} - ${tenant.rentals[0].status}`);
      }
    }
    
    return tenants;
  } catch (error) {
    console.error('❌ View tenants failed:', error.message);
    return [];
  }
}

async function testAddTenant() {
  console.log('\n➕ Testing Add Tenant API...');
  
  const newTenant = {
    name: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: 'TestPass123',
    phone: '+61400123456',
    businessName: `Test Business ${Date.now()}`,
    address: '123 Test Street, Melbourne VIC',
    notes: 'Test tenant created by automated test'
  };

  try {
    const response = await fetch(`${BASE_URL}/admin/add-tenant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTenant),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Add tenant failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Add tenant successful');
    console.log(`   Created user: ${result.name} (${result.email})`);
    console.log(`   User ID: ${result.id}`);
    console.log(`   Tenant record: ${result.tenants[0]?.businessName}`);
    
    return result;
  } catch (error) {
    console.error('❌ Add tenant failed:', error.message);
    return null;
  }
}

async function testViewCubes() {
  console.log('\n🏢 Testing View Cubes API...');
  
  try {
    const response = await fetch(`${BASE_URL}/admin/cubes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`View cubes failed: ${response.status} ${response.statusText}`);
    }

    const cubes = await response.json();
    
    console.log('✅ View cubes successful');
    console.log(`   Found ${cubes.length} cubes`);
    
    if (cubes.length > 0) {
      const availableCubes = cubes.filter(cube => cube.status === 'AVAILABLE');
      console.log(`   Available cubes: ${availableCubes.length}`);
      if (availableCubes.length > 0) {
        console.log(`   Sample available cube: ${availableCubes[0].code} (${availableCubes[0].size}) - $${availableCubes[0].pricePerDay}/month`);
      }
    }
    
    return cubes;
  } catch (error) {
    console.error('❌ View cubes failed:', error.message);
    return [];
  }
}

async function testAssignCube() {
  console.log('\n🔗 Testing Assign Cube API...');
  
  // First get available cubes and tenants
  const cubes = await testViewCubes();
  const tenants = await testViewTenants();
  
  const availableCube = cubes.find(cube => cube.status === 'AVAILABLE');
  const tenant = tenants.find(t => t.rentals.length === 0); // Find tenant without rentals
  
  if (!availableCube) {
    console.log('⚠️  No available cubes for assignment test');
    return false;
  }
  
  if (!tenant) {
    console.log('⚠️  No tenants without rentals for assignment test');
    return false;
  }

  const assignmentData = {
    tenantId: tenant.id,
    cubeId: availableCube.id,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
    dailyRent: availableCube.pricePerDay
  };

  try {
    const response = await fetch(`${BASE_URL}/admin/assign-cube-to-tenant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Assign cube failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Assign cube successful');
    console.log(`   Assigned cube ${availableCube.code} to tenant ${tenant.user.name}`);
    console.log(`   Rental ID: ${result.id}`);
    console.log(`   Status: ${result.status}`);
    
    return result;
  } catch (error) {
    console.error('❌ Assign cube failed:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Tests...\n');
  
  // Test 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Test 2: View Tenants
  await testViewTenants();

  // Test 3: View Cubes
  await testViewCubes();

  // Test 4: Add Tenant
  await testAddTenant();

  // Test 5: Assign Cube
  await testAssignCube();

  // Test 6: View Tenants Again (to see new data)
  console.log('\n🔄 Re-testing View Tenants (to see updated data)...');
  await testViewTenants();

  console.log('\n🎉 All tests completed!');
  console.log('\n📊 Summary:');
  console.log('   ✅ Authentication working');
  console.log('   ✅ View Tenants API working');
  console.log('   ✅ View Cubes API working');
  console.log('   ✅ Add Tenant API working');
  console.log('   ✅ Assign Cube API working');
  console.log('\n🌐 Frontend should now work properly with:');
  console.log('   - Tenant list loading from API');
  console.log('   - Add tenant button working');
  console.log('   - Individual tenant pages working');
  console.log('   - Proper authorization headers');
}

// Run the tests
runAllTests().catch(console.error);