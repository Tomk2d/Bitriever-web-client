import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

