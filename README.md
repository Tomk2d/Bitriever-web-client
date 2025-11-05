# Bitriever Client

Bitriever 클라이언트 애플리케이션 - Next.js 14 App Router 기반

## 기술 스택

- **Next.js 14** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Redux Toolkit** (전역 상태 관리)
- **React Query (TanStack Query v5)** (서버 상태 관리)
- **Axios** (HTTP 클라이언트)
- **TradingView Lightweight Charts** (차트 라이브러리)
- **Zod** (타입 안전한 스키마 검증)

## 프로젝트 구조

```
client/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 인증 관련 라우트 그룹
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/       # 대시보드 라우트 그룹
│   │   │   ├── dashboard/
│   │   │   ├── diaries/
│   │   │   ├── trading/
│   │   │   └── coins/
│   │   ├── api/               # API Routes (프록시)
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   ├── page.tsx           # 홈페이지
│   │   └── providers.tsx      # Redux, React Query Provider
│   │
│   ├── features/              # Feature-based 구조
│   │   ├── auth/
│   │   ├── diary/
│   │   ├── trading/
│   │   ├── coins/
│   │   └── exchange/
│   │
│   ├── shared/                # 공유 컴포넌트/유틸
│   │   ├── components/
│   │   │   ├── layout/       # Header, Footer, Sidebar
│   │   │   ├── ui/           # 재사용 가능한 UI 컴포넌트
│   │   │   └── charts/       # 차트 컴포넌트
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── types/
│   │
│   ├── lib/                   # 라이브러리 설정
│   │   ├── axios.ts          # Axios 인스턴스
│   │   ├── react-query.ts    # QueryClient 설정
│   │   ├── redux.ts          # Redux store 설정
│   │   └── middleware.ts     # Next.js 미들웨어
│   │
│   └── store/                 # Redux store
│       ├── slices/
│       └── hooks.ts
```

## 시작하기

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 빌드

```bash
npm run build
npm start
```

## 주요 기능

- **인증**: JWT 기반 인증 (httpOnly 쿠키)
- **대시보드**: 거래 내역 및 통계
- **매매 일지**: 거래 기록 관리
- **코인 목록**: 코인 정보 및 차트
- **거래 내역**: 거래 이력 조회

## 개발 가이드

### Feature 기반 구조

각 feature는 독립적인 폴더로 구성되며, 다음 구조를 따릅니다:

```
features/[feature-name]/
├── components/     # Feature 전용 컴포넌트
├── hooks/         # Feature 전용 훅
├── services/      # API 호출 함수
└── types/         # 타입 정의
```

### 상태 관리

- **Redux Toolkit**: 클라이언트 상태 (UI 상태, 인증 상태)
- **React Query**: 서버 상태 (API 데이터, 캐싱)

### API 호출

Axios 인스턴스를 사용하여 API를 호출합니다:

```typescript
import { apiClient } from '@/lib/axios';

const response = await apiClient.get('/api/endpoint');
```

### 차트 사용

TradingView Lightweight Charts를 사용하여 차트를 표시합니다:

```typescript
import { CandleChart, LineChart } from '@/shared/components/charts';

<CandleChart data={candleData} />
<LineChart data={lineData} />
```

## 라이센스

MIT
