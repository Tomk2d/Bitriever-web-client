import { useState, useEffect, useCallback } from 'react';
import { economicIndexService } from '../services/economicIndexService';
import { EconomicIndexType, MarketIndicator, EconomicIndexResponse } from '../types';

const POLLING_INTERVAL = 10 * 60 * 1000; // 10분

const INDEX_TYPE_LABELS: Record<EconomicIndexType, string> = {
  [EconomicIndexType.USD_KRW]: '달러환율',
  [EconomicIndexType.NASDAQ]: '나스닥',
  [EconomicIndexType.S_P_500]: 'S&P 500',
  [EconomicIndexType.DOW_JONES]: '다우존스',
  [EconomicIndexType.KOSPI]: '코스피',
  [EconomicIndexType.KOSDAQ]: '코스닥',
};

const formatNumber = (value: number): string => {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatChange = (changeValue: number, changeRate: number): string => {
  const sign = changeValue >= 0 ? '+' : '';
  return `${sign}${formatNumber(changeValue)} (${sign}${changeRate.toFixed(2)}%)`;
};

const getLatestData = (data: EconomicIndexResponse[]): EconomicIndexResponse | null => {
  if (!data || data.length === 0) return null;
  
  // 5분 단위 데이터이므로 dateTimeString(또는 dateTime)에 시간 정보가 포함되어 있음
  return data.reduce((latest, current) => {
    const latestTime = latest.dateTimeString 
      ? new Date(latest.dateTimeString).getTime()
      : new Date(latest.dateTime).getTime();
    const currentTime = current.dateTimeString
      ? new Date(current.dateTimeString).getTime()
      : new Date(current.dateTime).getTime();
    return currentTime > latestTime ? current : latest;
  });
};

export const useEconomicIndices = () => {
  const [indicators, setIndicators] = useState<MarketIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllIndices = useCallback(async () => {
    try {
      setError(null);
      const indexTypes = Object.values(EconomicIndexType);
      
      const results = await Promise.all(
        indexTypes.map(async (type) => {
          try {
            const data = await economicIndexService.getEconomicIndexByType(type);
            const latest = getLatestData(data);
            
            if (!latest) {
              return null;
            }

            // 서버에서 내려주는 전일 대비 등락 금액/등락률을 우선 사용
            const changeValue =
              typeof latest.changeAmount === 'number'
                ? latest.changeAmount
                : latest.price - latest.previousClose;
            const changeRate =
              typeof latest.changeRate === 'number'
                ? latest.changeRate
                : (latest.previousClose !== 0
                    ? ((latest.price - latest.previousClose) / latest.previousClose) * 100
                    : 0);

            return {
              label: INDEX_TYPE_LABELS[type],
              value: formatNumber(latest.price),
              change: formatChange(changeValue, changeRate),
              changeValue,
              changeRate,
              type: changeValue >= 0 ? 'positive' as const : 'negative' as const,
              indexType: type,
              data: data.sort((a, b) => {
                // 5분 단위 데이터이므로 dateString에 시간 정보가 포함되어 있을 수 있음
                const timeA = a.dateString 
                  ? new Date(a.dateString).getTime()
                  : new Date(a.date).getTime();
                const timeB = b.dateString
                  ? new Date(b.dateString).getTime()
                  : new Date(b.date).getTime();
                return timeA - timeB;
              }),
            } as MarketIndicator;
          } catch (err) {
            console.error(`Failed to fetch ${type}:`, err);
            return null;
          }
        })
      );

      const validIndicators = results.filter(
        (indicator): indicator is MarketIndicator => indicator !== null
      );

      setIndicators(validIndicators);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch economic indices'));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllIndices();

    const intervalId = setInterval(() => {
      fetchAllIndices();
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchAllIndices]);

  return { indicators, loading, error, refetch: fetchAllIndices };
};

