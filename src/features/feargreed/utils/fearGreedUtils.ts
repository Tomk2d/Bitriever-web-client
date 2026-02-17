/** 공포/탐욕 지수 값(0-100)에 따른 구간 라벨 (마켓 공포/탐욕 지수 표기와 동일) */
export function getFearGreedLabel(value: number): string {
  if (value <= 24) return '극단적 공포';
  if (value >= 25 && value <= 44) return '공포';
  if (value >= 45 && value <= 54) return '중립';
  if (value >= 55 && value <= 74) return '탐욕';
  return '극단적 탐욕';
}

/** 공포/탐욕 지수 값(0-100)에 따른 색상 (CSS --price-down ~ --price-up 그라데이션, CoinDetailSidebar와 동일) */
export function getFearGreedRangeColor(value: number): string {
  if (typeof window === 'undefined') return '#171717';

  const rootStyle = getComputedStyle(document.documentElement);
  const priceDownColor = rootStyle.getPropertyValue('--price-down').trim() || '#1375ec';
  const priceUpColor = rootStyle.getPropertyValue('--price-up').trim() || '#dd3c44';

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const startRgb = hexToRgb(priceDownColor);
  const endRgb = hexToRgb(priceUpColor);
  if (!startRgb || !endRgb) return '#171717';

  const ratio = Math.max(0, Math.min(1, value / 100));
  const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio);
  const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio);
  const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}
