import { useEffect, useState, useRef } from 'react';

interface UseAnimatedNumberOptions {
  duration?: number; // 애니메이션 지속 시간 (ms)
  easing?: (t: number) => number; // 이징 함수
}

const defaultEasing = (t: number): number => {
  // easeOutCubic
  return 1 - Math.pow(1 - t, 3);
};

export const useAnimatedNumber = (
  targetValue: number,
  options: UseAnimatedNumberOptions = {}
): number => {
  const { duration = 1000, easing = defaultEasing } = options;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(targetValue);

  useEffect(() => {
    // 값이 변경되지 않았으면 애니메이션 없이 즉시 업데이트
    if (targetValue === displayValue) {
      return;
    }

    // 이전 애니메이션 취소
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        return;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      const currentValue = Math.round(
        startValueRef.current + (targetValue - startValueRef.current) * easedProgress
      );

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 애니메이션 완료 시 정확한 값으로 설정
        setDisplayValue(targetValue);
        animationFrameRef.current = null;
        startTimeRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration, easing, displayValue]);

  return displayValue;
};

