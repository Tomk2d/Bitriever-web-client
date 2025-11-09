import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

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
      ? `${BACKEND_URL}/api/${path}?${queryString}`
      : `${BACKEND_URL}/api/${path}`;

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

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', {
        status: response.status,
        contentType,
        url,
        hasAuth: !!(authHeader || token),
        authHeader: authHeader ? 'present' : 'missing',
        token: token ? 'present' : 'missing',
        text: text.substring(0, 1000),
      });
      
      if (response.status === 400) {
        return NextResponse.json(
          { 
            error: 'Bad Request',
            message: '백엔드에서 400 에러가 발생했습니다. 날짜 형식이나 인증 토큰을 확인해주세요.',
            status: response.status,
            details: text.includes('Bad Request') ? '날짜 파싱 실패 또는 필수 파라미터 누락' : '알 수 없는 에러'
          },
          { status: response.status }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Invalid response format',
          message: `Expected JSON but received ${contentType}`,
          status: response.status
        },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    const token = request.cookies.get('authToken')?.value;

    // Authorization 헤더 가져오기 (쿠키보다 우선)
    const authHeader = request.headers.get('Authorization');

    // 요청 바디 읽기
    let body: any = null;
    const requestContentType = request.headers.get('content-type');
    if (requestContentType && requestContentType.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}/api/${path}`, fetchOptions);

    const responseContentType = response.headers.get('content-type');
    
    if (!responseContentType || !responseContentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response (POST):', {
        status: response.status,
        contentType: responseContentType,
        url: `${BACKEND_URL}/api/${path}`,
        hasAuth: !!(authHeader || token),
        text: text.substring(0, 500),
      });
      return NextResponse.json(
        { 
          error: 'Invalid response format',
          message: `Expected JSON but received ${responseContentType}`,
          status: response.status
        },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API route error (POST):', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    const body = await request.json();
    const token = request.cookies.get('authToken')?.value;

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

    const response = await fetch(`${BACKEND_URL}/api/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const responseContentType = response.headers.get('content-type');
    
    if (!responseContentType || !responseContentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response (PUT):', {
        status: response.status,
        contentType: responseContentType,
        url: `${BACKEND_URL}/api/${path}`,
        hasAuth: !!(authHeader || token),
        text: text.substring(0, 500),
      });
      return NextResponse.json(
        { 
          error: 'Invalid response format',
          message: `Expected JSON but received ${responseContentType}`,
          status: response.status
        },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API route error (PUT):', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    const token = request.cookies.get('authToken')?.value;

    const response = await fetch(`${BACKEND_URL}/api/${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

