/**
 * 환경 변수 단일 소스 (client/.env 기준)
 *
 * - env 읽기 모듈: client/src/lib/env.ts (이 파일만 process.env 참조)
 * - 사용처: axios, websocket, useNotificationSSE, proxy/[...path], auth(oauth2, callback, login, [...path]), coinServerService, fearGreedServerService
 *
 * Next.js는 client/ 루트의 .env를 자동 로드합니다.
 * - API Routes(서버): APP_SERVER_URL, NEXT_PUBLIC_API_BASE_URL 모두 사용 가능
 * - 클라이언트 번들: NEXT_PUBLIC_API_BASE_URL만 빌드 시 인라인됨
 *
 * 백엔드 URL은 이 모듈에서만 읽고, getBackendUrl() / getWebSocketUrl()로만 사용하세요.
 */
const DEFAULT_BACKEND_URL = 'http://localhost:8080';

/**
 * 백엔드(base) URL 반환.
 * APP_SERVER_URL || NEXT_PUBLIC_API_BASE_URL || 기본값
 */
export function getBackendUrl(): string {
  return (
    process.env.APP_SERVER_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    DEFAULT_BACKEND_URL
  );
}

/**
 * WebSocket 엔드포인트 base URL (getBackendUrl 기반)
 */
export function getWebSocketUrl(): string {
  return `${getBackendUrl()}/ws/coins`;
}
