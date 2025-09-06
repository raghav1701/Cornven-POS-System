import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { variantId: string } }
) {
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

    const { variantId } = params;
    const backendBaseUrl = process.env.BACKEND_URL || 'https://cornven-pos-system.vercel.app';
    const backendUrl = `${backendBaseUrl}/variants/${variantId}/barcode.png`;

    console.log('Fetching barcode image for variantId:', variantId);
    console.log('Backend URL:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch barcode image' },
        { status: response.status }
      );
    }

    // Get the image blob from the backend
    const imageBlob = await response.blob();
    
    // Return the image with proper headers
    return new NextResponse(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching barcode image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}