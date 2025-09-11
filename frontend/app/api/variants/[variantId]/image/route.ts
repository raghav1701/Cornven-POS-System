import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { variantId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      // Try to get token from cookies or other sources
      const token = request.cookies.get('cornven_token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
      }
    }

    console.log('Fetching image for variant ID:', params.variantId);

    // Proxy to deployed API for variant image
    const response = await fetch(`https://cornven-pos-system.vercel.app/variants/${params.variantId}/image`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader || `Bearer ${request.cookies.get('cornven_token')?.value}`,
      },
    });

    console.log('Deployed API response status:', response.status);

    if (!response.ok) {
      console.error('Deployed API error:', response.statusText);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Get the image blob
    const imageBlob = await response.blob();
    
    // Return the image with proper headers
    return new NextResponse(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Variant image fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variant image' },
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