import { NextRequest, NextResponse } from 'next/server';

function getMockProducts(tenantId?: string | null) {
  const mockProducts = [
    {
      id: 'b4612b60-75da-4348-9cdb-5020a876fce6',
      tenantId: '02eddcb3-0dca-4cc8-90e2-2c61319eda75',
      name: 'Bag',
      description: 'Bag',
      price: 100,
      stock: 20,
      category: 'Bag',
      sku: 'BAG-001',
      status: 'PENDING',
      createdAt: '2025-09-07T00:21:10.777Z',
      updatedAt: '2025-09-07T00:21:10.777Z',
      tenant: {
        id: '02eddcb3-0dca-4cc8-90e2-2c61319eda75',
        businessName: 'Rex Enterprises'
      },
      variants: [
        {
          id: 'f8685241-2f89-4ec6-9e4a-188ec6691634',
          productId: 'b4612b60-75da-4348-9cdb-5020a876fce6',
          color: 'Black',
          size: '20',
          price: 100,
          stock: 9,
          sku: 'BAG-001-BLK-20',
          status: 'APPROVED',
          barcode: 'HZQHCJEXLRXK8PE',
          barcodeType: 'CODE128',
          imageKey: 'product-variants/2b7f3ea9-ecc1-454a-9a26-c1ecbdd0da03.jpeg',
          createdAt: '2025-09-07T00:21:10.777Z',
          updatedAt: '2025-09-07T00:22:42.415Z'
        },
        {
          id: '3ed5f056-657b-4610-8e98-247213742eec',
          productId: 'b4612b60-75da-4348-9cdb-5020a876fce6',
          color: 'Blue',
          size: '20',
          price: 100,
          stock: 11,
          sku: 'BAG-001-BLU-20',
          status: 'APPROVED',
          barcode: 'ZKBZADAZEXDJK6XN',
          barcodeType: 'CODE128',
          imageKey: 'product-variants/939893cd-646b-40be-9661-72bc13f39aea.jpeg',
          createdAt: '2025-09-07T00:21:10.777Z',
          updatedAt: '2025-09-07T00:22:45.007Z'
        }
      ],
      logs: []
    },
    {
      id: 'fcd1e140-86e9-453d-9fa8-76cb3acb311b',
      tenantId: '9a0ad105-6a86-44d9-a1e5-214c8ea91052',
      name: 'Mouse pad',
      description: 'Mouse pad with palm rest',
      price: 12,
      stock: 26,
      category: 'Accessories',
      sku: 'ACC-002',
      status: 'APPROVED',
      createdAt: '2025-09-06T09:21:15.404Z',
      updatedAt: '2025-09-06T09:21:15.404Z',
      tenant: {
        id: '9a0ad105-6a86-44d9-a1e5-214c8ea91052',
        businessName: 'John Arts Pvt Ltd'
      },
      variants: [
        {
          id: '9350a8d9-9aa6-4eea-aac9-17c1c99347d4',
          productId: 'fcd1e140-86e9-453d-9fa8-76cb3acb311b',
          color: 'Black',
          size: 'M',
          price: 12,
          stock: 11,
          sku: 'ACC-002-BLK-M',
          status: 'APPROVED',
          barcode: '9EBT5EYODVWMXECH',
          barcodeType: 'CODE128',
          imageKey: 'product-variants/7eecd4b7-6ec8-4630-9427-ae8e53df45e4.png',
          createdAt: '2025-09-06T09:21:15.404Z',
          updatedAt: '2025-09-07T09:30:56.030Z'
        },
        {
          id: '027ec929-683f-4cae-8e83-0e85df253387',
          productId: 'fcd1e140-86e9-453d-9fa8-76cb3acb311b',
          color: 'Blue',
          size: 'M',
          price: 11,
          stock: 15,
          sku: 'ACC-002-BLU-M',
          status: 'APPROVED',
          barcode: 'ZKBZADAZEXDJK6XN',
          barcodeType: 'CODE128',
          imageKey: 'product-variants/939893cd-646b-40be-9661-72bc13f39aea.jpeg',
          createdAt: '2025-09-06T09:21:15.404Z',
          updatedAt: '2025-09-07T09:30:56.030Z'
        }
      ],
      logs: []
    }
  ];
  
  // Filter by tenantId if provided
  if (tenantId) {
    return mockProducts.filter(product => product.tenantId === tenantId);
  }
  
  return mockProducts;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    // If no auth header or invalid token, return mock data for development
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth token found, using mock data');
      const mockData = getMockProducts(tenantId);
      return NextResponse.json({ products: mockData });
    }

    const token = authHeader.substring(7);
    
    // Build query parameters for the deployed API
    const queryParams = new URLSearchParams();
    if (tenantId) {
      queryParams.append('tenantId', tenantId);
    }
    
    const apiUrl = `https://cornven-pos-system.vercel.app/admin/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('Fetching products from deployed API:', apiUrl);
    
    // Make request to deployed API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Deployed API error:', data);
      console.log('API failed, falling back to mock data');
      const mockData = getMockProducts(tenantId);
      return NextResponse.json({ products: mockData });
    }

    console.log('Successfully fetched products:', data.length || 0, 'items');
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in admin products API:', error);
    console.log('Error occurred, falling back to mock data');
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const mockData = getMockProducts(tenantId);
    return NextResponse.json({ products: mockData });
  }
}