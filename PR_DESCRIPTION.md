# [Fix] 상세 두 번째 진입 시 차트가 브로드캐스트 전까지 안 그려지던 현상 수정

## 현상

- **첫 번째** 상세 진입: 차트 정상 렌더링
- **나갔다가 다시** 상세 진입: 차트가 그려지지 않다가, **브로드캐스트(WebSocket) 데이터**가 한 번 들어온 뒤에야 렌더링됨
- 로컬(localhost)에서는 재현되지 않고 **운영 환경에서만** 발생

## 원인

effect 실행 순서 때문이었습니다.

| effect | 역할 | 의존성 |
|--------|------|--------|
| **데이터 effect** | `allChartData` 동기화 + **차트/시리즈가 이미 있을 때만** `setData()` 호출 | `priceDataList`, `dateRange`, `priceData`, `isLoading` |
| **차트 effect** | `containerSize` 기준으로 차트/시리즈 생성 | `containerSize`, `checkAndLoadData` |

운영(프로덕션)에서는 다음 순서로 실행될 수 있습니다.

1. **데이터 effect가 먼저** 실행 → `allChartData`는 채워지지만, 아직 차트가 없어서 `setData()`는 호출되지 않음
2. **차트 effect**가 실행 → 차트/시리즈만 생성
3. 데이터 effect 의존성이 바뀌지 않아 **다시 실행되지 않음** → 차트는 비어 있는 상태로 유지
4. 브로드캐스트로 `priceData`(Redux) 갱신 → 데이터 effect 재실행 → 그때서야 `setData()` 호출되어 차트가 보임

## 수정 내용

### 1. 차트 생성 직후 데이터 동기화 (근본 수정)

- **캔들 차트** (`CoinDetailCandleChart.tsx`): 시리즈 생성 직후 `allChartData.current`에 데이터가 있으면 동일한 포맷으로 `formattedData`를 만들어 **`candlestickSeries.setData(formattedData)`** 호출
- **라인 차트** (`CoinDetailLineChart.tsx`): 동일하게 **`lineSeries.setData(formattedData)`** 호출 추가

→ effect 실행 순서와 관계없이, 차트가 만들어지는 시점에 이미 있는 데이터로 한 번 채우므로 두 번째 진입에서도 바로 렌더링됨.

### 2. 정수 반올림 유지

- ResizeObserver / double rAF에서 `width`, `height`를 **`Math.round()`** 로 반올림한 뒤 `containerSize`에 반영
- 717 vs 717.4375 같은 미세한 차이로 차트 effect가 불필요하게 반복 실행되는 것을 방지

### 3. 제거한 코드

- 차트 effect 내 **“크기 0일 때 rAF로 최대 12번 재시도”** 블록 제거  
  (원인은 크기가 아니라 effect 순서였으므로 불필요한 방어 로직으로 정리)

## 테스트

- [ ] 로컬 프로덕션 빌드(`npm run build && npm run start`)에서 상세 진입 → 나가기 → 다시 진입 시 차트가 즉시 표시되는지 확인
- [ ] 운영 배포 후 동일 시나리오로 확인
