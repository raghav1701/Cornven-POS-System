import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body = await request.json();
    const { price, stock } = body;

    // Ensure stock is an integer
    const stockInt = Math.floor(Number(stock));
    const priceFloat = Number(price);

    if (isNaN(stockInt) || stockInt < 0) {
      return NextResponse.json({ error: 'Invalid stock value' }, { status: 400 });
    }

    if (isNaN(priceFloat) || priceFloat < 0) {
      return NextResponse.json({ error: 'Invalid price value' }, { status: 400 });
    }

    console.log('Proxying product update request to deployed API...');
    console.log('Product ID:', params.id);
    console.log('Body:', { price: priceFloat, stock: stockInt });

    // Proxy to deployed API - correct endpoint format
    const requestBody = {
      price: priceFloat,
      stock: stockInt
    };

    console.log('Request body being sent:', requestBody);

    const response = await fetch(`https://cornven-pos-system.vercel.app/tenant/products/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Deployed API response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Deployed API error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}