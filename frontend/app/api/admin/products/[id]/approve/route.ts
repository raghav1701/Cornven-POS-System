import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { approve } = await request.json();
    
    // Validate required fields
    if (typeof approve !== 'string') {
      return NextResponse.json(
        { error: 'approve field is required and must be a string' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const requestBody = {
      approve: approve
    };
    
    console.log('Approving product:', params.id);
    console.log('Request body:', requestBody);
    
    // Make request to deployed API
    const response = await fetch(`https://cornven-pos-system.vercel.app/admin/products/${params.id}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Deployed API error:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to update product approval' },
        { status: response.status }
      );
    }

    console.log('Product approval updated successfully:', data);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in product approval API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}