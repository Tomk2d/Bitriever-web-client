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

    const headers: HeadersInit = {};

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
    
    // 이미지 조회인 경우 (diaries/{id}/images/{filename} 또는 communities/{id}/images/{filename})
    if (path.match(/^(diaries|communities)\/\d+\/images\/[^/]+$/)) {
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Failed to read error response';
        }
        
        console.error('이미지 조회 실패:', {
          path,
          url: `${BACKEND_URL}/api/${path}`,
          status: response.status,
          statusText: response.statusText,
          hasAuth: !!(authHeader || token),
          authHeader: authHeader ? 'present' : 'missing',
          token: token ? 'present' : 'missing',
          text: errorText.substring(0, 500),
        });
        
        // 이미지 요청 실패 시 빈 이미지나 에러 이미지 반환 대신 JSON 에러 반환
        // 하지만 브라우저는 이미지 태그에 JSON을 로드할 수 없으므로, 
        // 실제로는 빈 응답이나 적절한 에러 처리가 필요
        return NextResponse.json(
          { 
            error: 'Image not found',
            message: errorText,
            status: response.status
          },
          { 
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
      
      const blob = await response.blob();
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'image/jpeg',
        },
      });
    }
    
    // JSON 응답인 경우
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

    const requestContentType = request.headers.get('content-type') || '';
    
    // multipart/form-data 처리 (이미지 업로드)
    if (requestContentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      const headers: HeadersInit = {};
      
      if (authHeader) {
        headers['Authorization'] = authHeader;
      } else if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // FormData를 전달할 때는 Content-Type 헤더를 설정하지 않음 (boundary 자동 설정)
      const response = await fetch(`${BACKEND_URL}/api/${path}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const responseContentType = response.headers.get('content-type');
      
      if (!responseContentType || !responseContentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response (POST - multipart):', {
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
    }
    
    // JSON 요청 처리
    let body: any = null;
    if (requestContentType.includes('application/json')) {
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
      method: 'DELETE',
      headers,
    });

    const responseContentType = response.headers.get('content-type');
    
    if (!responseContentType || !responseContentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response (DELETE):', {
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
    console.error('API route error (DELETE):', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

