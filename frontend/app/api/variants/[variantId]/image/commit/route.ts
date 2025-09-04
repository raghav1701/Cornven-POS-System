import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/authService';

const DEPLOYED_API_BASE = 'https://cornven-pos-system.vercel.app';

export async function POST(request: NextRequest, { params }: { params: { variantId: string } }) {
  try {
    console.log('=== COMMIT API ROUTE CALLED ===');
    console.log('Variant ID:', params.variantId);
    console.log('Proxying variant image commit request to deployed API...');
    
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const body = await request.json();
    const { variantId } = params;

    // Forward the request to the deployed API
    const response = await fetch(`${DEPLOYED_API_BASE}/variants/${variantId}/image/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    console.log('Deployed API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deployed API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to commit image key' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in variant image commit proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}