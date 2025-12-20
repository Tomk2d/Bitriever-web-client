import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fearGreedService, FearGreedResponse } from '../services/fearGreedService';
import { useEffect, useState } from 'react';

const getNextUtc0905 = (): number => {
  const now = new Date();
  const nowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  );
  
  const targetHour = 9;
  const targetMinute = 5;
  
  const targetDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    targetHour,
    targetMinute,
    0,
    0
  ));
  
  if (targetDate.getTime() <= nowUtc) {
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
  }
  
  return targetDate.getTime() - nowUtc;
};

export const useFearGreedHistory = () => {
  const [refetchInterval, setRefetchInterval] = useState<number | false>(() => {
    const interval = getNextUtc0905();
    return interval;
  });

  useEffect(() => {
    if (refetchInterval && refetchInterval !== 86400000) {
      const timer = setTimeout(() => {
        setRefetchInterval(86400000);
      }, refetchInterval);
      
      return () => clearTimeout(timer);
    }
  }, [refetchInterval]);

  return useQuery<FearGreedResponse[]>({
    queryKey: ['fearGreed', 'history'],
    queryFn: () => fearGreedService.getHistory(),
    staleTime: 1000 * 60 * 60, // 1시간
    gcTime: 1000 * 60 * 60 * 24, // 24시간
    refetchInterval,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useFearGreedToday = () => {
  return useQuery<FearGreedResponse>({
    queryKey: ['fearGreed', 'today'],
    queryFn: () => fearGreedService.getToday(),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    refetchInterval: 1000 * 60 * 5, // 5분마다
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useFearGreedByDate = (date: string | null) => {
  const queryClient = useQueryClient();
  
  // 2018년 2월 1일 이전 날짜인지 확인
  const isDateValid = date ? (() => {
    try {
      const selectedDate = new Date(date);
      const minDate = new Date('2018-02-01');
      return selectedDate >= minDate;
    } catch {
      return false;
    }
  })() : false;
  
  return useQuery<FearGreedResponse | null>({
    queryKey: ['fearGreed', 'date', date],
    queryFn: async () => {
      if (!date) return null;
      
      const historyData = queryClient.getQueryData<FearGreedResponse[]>(['fearGreed', 'history']);
      const todayData = queryClient.getQueryData<FearGreedResponse>(['fearGreed', 'today']);
      
      if (historyData) {
        const found = historyData.find(item => item.date === date);
        if (found) return found;
      }
      
      if (todayData && todayData.date === date) {
        return todayData;
      }
      
      return fearGreedService.getByDate(date);
    },
    enabled: !!date && isDateValid, // 날짜가 있고 2018-01-01 이후인 경우에만 활성화
    staleTime: 1000 * 60 * 60, // 1시간
    gcTime: 1000 * 60 * 60 * 24, // 24시간
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
};

