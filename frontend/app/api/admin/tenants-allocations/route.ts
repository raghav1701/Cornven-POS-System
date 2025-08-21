import { NextRequest, NextResponse } from 'next/server';

const DEPLOYED_API_URL = 'https://cornven-pos-system.vercel.app';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    console.log('Proxying tenants-allocations request to deployed API...');
    
    // Proxy the request to the deployed API
    const response = await fetch(`${DEPLOYED_API_URL}/admin/tenants-allocations`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('Deployed API response status:', response.status);
    console.log('Deployed API response data type:', typeof data);
    console.log('Deployed API response is array:', Array.isArray(data));
    console.log('Deployed API response length:', Array.isArray(data) ? data.length : 'Not array');
    console.log('Deployed API response sample:', Array.isArray(data) && data.length > 0 ? data[0] : data);
    
    if (!response.ok) {
      return NextResponse.json(
        data,
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // Return the response from the deployed API with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
    
  } catch (error) {
    console.error('Proxy tenants-allocations error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to server' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}