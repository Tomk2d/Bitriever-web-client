import type { AssetResponse } from '../types';

export const getKRWAsset = (assets: AssetResponse[]): AssetResponse | null => {
  return assets.find((asset) => asset.symbol === 'KRW') || null;
};

export const getUSDTAsset = (assets: AssetResponse[]): AssetResponse | null => {
  return assets.find((asset) => asset.symbol === 'USDT') || null;
};

export const getBTCAsset = (assets: AssetResponse[]): AssetResponse | null => {
  return assets.find((asset) => asset.symbol === 'BTC') || null;
};

export const getTotalCoinAssets = (assets: AssetResponse[]): number => {
  return assets
    .filter((asset) => asset.symbol !== 'KRW')
    .reduce((total, asset) => {
      // 매수평균가 * 보유수량으로 계산
      const value = (asset.avgBuyPrice || 0) * (asset.quantity || 0);
      return total + value;
    }, 0);
};

export const getTotalAssets = (assets: AssetResponse[]): number => {
  const krwAsset = getKRWAsset(assets);
  const krwValue = krwAsset ? (krwAsset.quantity || 0) : 0;
  const coinValue = getTotalCoinAssets(assets);
  return krwValue + coinValue;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' 원';
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatQuantity = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(value);
};

export const truncateIfLong = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
};

export const truncateNumberWithUnit = (text: string, maxLength: number = 20): string => {
  // 숫자와 단위를 분리 (마지막 공백 이후가 단위)
  const lastSpaceIndex = text.lastIndexOf(' ');
  
  if (lastSpaceIndex === -1) {
    // 단위가 없으면 기존 로직 사용
    return truncateIfLong(text, maxLength);
  }
  
  const numberPart = text.slice(0, lastSpaceIndex);
  const unitPart = text.slice(lastSpaceIndex); // 공백 포함
  
  // 숫자 부분만 제한
  if (numberPart.length <= maxLength) {
    return text;
  }
  
  return numberPart.slice(0, maxLength - 3) + '...' + unitPart;
};

