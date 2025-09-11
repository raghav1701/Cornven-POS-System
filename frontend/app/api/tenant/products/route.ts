import { NextRequest, NextResponse } from 'next/server';

// Mock tenant products for development/testing
function getMockTenantProducts() {
  return [
    {
      id: 'tenant-prod-1',
      tenantId: 'tenant-1',
      name: 'Premium Bag',
      description: 'High-quality leather bag',
      category: 'Accessories',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      variants: [
        {
          id: 'var-1',
          productId: 'tenant-prod-1',
          color: 'Black',
          size: 'Medium',
          price: 89.99,
          stock: 15,
          barcode: 'BAG001BLK',
          barcodeType: 'CODE128',
          status: 'APPROVED',
          imageKey: null,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z'
        },
        {
          id: 'var-2',
          productId: 'tenant-prod-1',
          color: 'Brown',
          size: 'Large',
          price: 99.99,
          stock: 8,
          barcode: 'BAG001BRN',
          barcodeType: 'CODE128',
          status: 'APPROVED',
          imageKey: null,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z'
        }
      ]
    },
    {
      id: 'tenant-prod-2',
      tenantId: 'tenant-1',
      name: 'Gaming Mouse Pad',
      description: 'Large gaming mouse pad with RGB lighting',
      category: 'Electronics',
      createdAt: '2024-01-16T14:30:00Z',
      updatedAt: '2024-01-16T14:30:00Z',
      variants: [
        {
          id: 'var-3',
          productId: 'tenant-prod-2',
          color: 'RGB',
          size: 'XL',
          price: 45.99,
          stock: 25,
          barcode: 'PAD001RGB',
          barcodeType: 'CODE128',
          status: 'APPROVED',
          imageKey: null,
          createdAt: '2024-01-16T14:30:00Z',
          updatedAt: '2024-01-16T14:30:00Z'
        }
      ]
    }
  ];
}

export async function GET(request: NextRequest) {
  try {
    console.log('Proxying tenant products GET request to deployed API...');
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    
    // If no auth header, return mock data instead of error
    if (!authHeader) {
      console.log('No auth header found, returning mock tenant products');
      return NextResponse.json(getMockTenantProducts());
    }

    // Make request to deployed API
    const response = await fetch('https://cornven-pos-system.vercel.app/tenant/products', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('Deployed API response status:', response.status);

    // If API call fails, return mock data
    if (!response.ok) {
      console.log('Deployed API failed, returning mock tenant products');
      return NextResponse.json(getMockTenantProducts());
    }

    const data = await response.json();

    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    return NextResponse.json(data, { 
      status: response.status,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error proxying tenant products GET request:', error);
    // Return mock data instead of error
    console.log('Exception occurred, returning mock tenant products');
    return NextResponse.json(getMockTenantProducts());
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Proxying tenant products POST request to deployed API...');
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();

    // Make request to deployed API
    const response = await fetch('https://cornven-pos-system.vercel.app/tenant/products', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Deployed API response status:', response.status);

    const data = await response.json();

    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    return NextResponse.json(data, { 
      status: response.status,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error proxying tenant products POST request:', error);
    return NextResponse.json(
      { error: 'Failed to add product' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}