import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    const nextResponse = response.ok
      ? NextResponse.json(data)
      : NextResponse.json(data, { status: response.status });
    const setCookie = response.headers.get('Set-Cookie');
    if (setCookie) {
      nextResponse.headers.append('Set-Cookie', setCookie);
    }
    return nextResponse;
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

