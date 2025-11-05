# Assets 디렉토리

정적 파일들을 관리하는 디렉토리입니다.

## 디렉토리 구조

### `/fonts`
- 커스텀 폰트 파일 (`.woff2`, `.woff`, `.ttf`, `.otf` 등)
- 예: Product Sans, Inter 등의 폰트 파일

### `/images/logos`
- 로고 이미지 파일
- SVG, PNG, JPG 등 다양한 형식 지원
- 예: Bitriever 로고, 아이콘 등

### `/emojis`
- 이모지 이미지 파일
- 필요시 커스텀 이모지 이미지 저장

## 사용 방법

Next.js에서는 `/public` 디렉토리의 파일들을 루트 경로(`/`)로 접근할 수 있습니다.

예시:
- `/public/assets/images/logos/logo.png` → `/assets/images/logos/logo.png`
- `/public/assets/fonts/font.woff2` → `/assets/fonts/font.woff2`

## 참고사항

- 이미지 파일은 가능하면 SVG 형식 사용 권장 (벡터 그래픽, 확장성)
- 폰트 파일은 `.woff2` 형식 사용 권장 (최적화된 웹 폰트)
- 파일명은 소문자와 하이픈(-) 사용 권장 (예: `bitriever-logo.svg`)

