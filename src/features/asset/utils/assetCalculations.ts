import type { AssetResponse } from '../types';

export const getKRWAsset = (assets: AssetResponse[]): AssetResponse | null => {
  return assets.find((asset) => asset.symbol === 'KRW') || null;
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
  }).format(value) + '원';
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ko-KR').format(value);
};

