import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Try to get token from cookies first, then from Authorization header
    const cookieStore = cookies();
    let token = cookieStore.get('token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Get barcode from query parameters
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode parameter is required' }, { status: 400 });
    }

    const backendBaseUrl = process.env.BACKEND_URL || 'https://cornven-pos-system.vercel.app';
    const backendUrl = `${backendBaseUrl}/variants/lookup?barcode=${encodeURIComponent(barcode)}`;

    console.log('Looking up barcode:', barcode);
    console.log('Backend URL:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response data:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error looking up barcode:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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