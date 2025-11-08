'use client';

import { useEffect, useState, useRef } from 'react';
import { formatNumber } from '@/features/asset/utils/assetCalculations';

interface AnimatedCurrencyProps {
  value: number;
  duration?: number; // 각 자리수당 애니메이션 지속 시간 (ms)
  delayPerDigit?: number; // 각 자리수 간 지연 시간 (ms)
}

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export default function AnimatedCurrency({ 
  value, 
  duration = 300,
  delayPerDigit = 50 
}: AnimatedCurrencyProps) {
  const [displayDigits, setDisplayDigits] = useState<number[]>([]);
  const animationRefs = useRef<Map<number, number>>(new Map());
  const prevDigitsRef = useRef<number[]>([]);

  useEffect(() => {
    // 숫자를 포맷팅된 문자열로 변환 (쉼표 포함)
    const formatted = formatNumber(value);
    
    // 숫자만 추출 (쉼표 제거)
    const digitsOnly = formatted.replace(/,/g, '');
    const targetDigits = digitsOnly.split('').map(d => parseInt(d, 10));

    // 초기값 설정
    if (displayDigits.length === 0) {
      setDisplayDigits(targetDigits);
      prevDigitsRef.current = targetDigits;
      return;
    }

    // 이전 애니메이션 모두 취소
    animationRefs.current.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    animationRefs.current.clear();

    // 각 자리수별로 애니메이션 시작 (앞자리부터)
    targetDigits.forEach((targetNum, digitIndex) => {
      const currentNum = digitIndex < prevDigitsRef.current.length 
        ? prevDigitsRef.current[digitIndex] 
        : 0;
      
      // 값이 같으면 애니메이션 없이 즉시 설정
      if (targetNum === currentNum) {
        setDisplayDigits((prev) => {
          const newDigits = [...prev];
          while (newDigits.length <= digitIndex) {
            newDigits.push(0);
          }
          newDigits[digitIndex] = targetNum;
          return newDigits;
        });
        return;
      }

      const startNum = currentNum;
      const startTime = performance.now() + (digitIndex * delayPerDigit);
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        
        if (elapsed < 0) {
          // 아직 시작 시간이 안 됨
          animationRefs.current.set(digitIndex, requestAnimationFrame(animate));
          return;
        }

        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        
        // 숫자가 증가하는 경우와 감소하는 경우 모두 처리
        let currentValue: number;
        if (targetNum > startNum) {
          // 증가
          const diff = targetNum - startNum;
          currentValue = Math.round(startNum + diff * easedProgress);
        } else if (targetNum < startNum) {
          // 감소
          const diff = startNum - targetNum;
          currentValue = Math.round(startNum - diff * easedProgress);
        } else {
          currentValue = targetNum;
        }
        
        // 0-9 사이로 제한 (자리수 애니메이션이므로)
        const displayValue = ((currentValue % 10) + 10) % 10;
        
        setDisplayDigits((prev) => {
          const newDigits = [...prev];
          // 배열 크기가 다를 수 있으므로 확장
          while (newDigits.length <= digitIndex) {
            newDigits.push(0);
          }
          newDigits[digitIndex] = displayValue;
          return newDigits;
        });

        if (progress < 1) {
          animationRefs.current.set(digitIndex, requestAnimationFrame(animate));
        } else {
          // 애니메이션 완료 시 정확한 값으로 설정
          setDisplayDigits((prev) => {
            const newDigits = [...prev];
            while (newDigits.length <= digitIndex) {
              newDigits.push(0);
            }
            newDigits[digitIndex] = targetNum;
            return newDigits;
          });
          animationRefs.current.delete(digitIndex);
        }
      };

      animationRefs.current.set(digitIndex, requestAnimationFrame(animate));
    });

    // 배열 크기가 변경된 경우 (자리수가 늘어나거나 줄어든 경우)
    if (prevDigitsRef.current.length !== targetDigits.length) {
      setDisplayDigits((prev) => {
        const newDigits = [...targetDigits];
        // 기존 값으로 채우기
        targetDigits.forEach((_, index) => {
          if (index < prev.length) {
            newDigits[index] = prev[index];
          }
        });
        return newDigits;
      });
    }

    prevDigitsRef.current = targetDigits;

    return () => {
      animationRefs.current.forEach((frameId) => {
        cancelAnimationFrame(frameId);
      });
      animationRefs.current.clear();
    };
  }, [value, duration, delayPerDigit]);

  // 포맷팅된 문자열 재구성 (쉼표 포함)
  const formattedValue = formatNumber(value);
  const formattedChars = formattedValue.split('');
  
  // 각 문자가 숫자인지 쉼표인지 판단하여 렌더링
  let digitIndex = 0;
  
  return (
    <span className="animated-currency">
      {formattedChars.map((char, index) => {
        if (char === ',') {
          return <span key={index}>{char}</span>;
        } else {
          const currentDigit = digitIndex < displayDigits.length 
            ? displayDigits[digitIndex] 
            : 0;
          digitIndex++;
          return (
            <span key={index} className="animated-digit">
              {currentDigit}
            </span>
          );
        }
      })}
      <span> 원</span>
    </span>
  );
}

