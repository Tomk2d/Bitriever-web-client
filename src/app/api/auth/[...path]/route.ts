import { getBackendUrl } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    
    // Authorization 헤더 가져오기
    const authHeader = request.headers.get('Authorization');
    
    // 요청 바디 읽기 (logout의 경우 body가 없을 수 있음)
    let body: any = null;
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        // body가 없는 경우 무시
        body = null;
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${getBackendUrl()}/api/auth/${path}`, fetchOptions);

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    const token = request.cookies.get('authToken')?.value;

    // Query parameter 추출
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = queryString 
      ? `${getBackendUrl()}/api/auth/${path}?${queryString}`
      : `${getBackendUrl()}/api/auth/${path}`;

    // Authorization 헤더 가져오기 (쿠키보다 우선)
    const authHeader = request.headers.get('Authorization');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    const nextResponse = response.ok
      ? NextResponse.json(data, { status: response.status })
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

