import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
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
      return NextResponse.json(
        { error: data.error || 'Failed to fetch products' },
        { status: response.status }
      );
    }

    console.log('Successfully fetched products:', data.length || 0, 'items');
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in admin products API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}