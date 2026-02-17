import { authService } from '@/features/auth/services/authService';

/** 401 시 refresh 후 한 번 재시도하는 공용 fetch. 동시 401 요청은 하나의 refresh만 수행하고 대기 후 재시도 */
let refreshPromise: Promise<string> | null = null;

function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = authService.refreshToken().then((data) => {
    refreshPromise = null;
    return data.accessToken;
  });
  refreshPromise.catch(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/**
 * fetch와 동일하나 Authorization 헤더를 붙이고,
 * 401 응답 시 refresh token으로 갱신 후 한 번만 재시도.
 * 갱신 실패 또는 재시도 후에도 401이면 logout 후 /login 리다이렉트.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(input, { ...init, headers });

  if (response.status !== 401) return response;

  try {
    const newToken = await doRefresh();
    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
    response = await fetch(input, { ...init, headers: retryHeaders });
  } catch {
    await authService.logout();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('인증에 실패했습니다.');
  }

  if (response.status === 401) {
    await authService.logout();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('인증에 실패했습니다.');
  }

  return response;
}
