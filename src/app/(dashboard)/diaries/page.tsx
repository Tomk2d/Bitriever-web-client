'use client';

import { useState, useMemo } from 'react';
import { MonthlyCalendar } from '@/shared/components/calendar';
import { useTradingHistories } from '@/features/trading/hooks/useTradingHistories';
import AnimatedCurrency from '@/shared/components/AnimatedCurrency';
import { HelpIcon } from '@/shared/components/ui';
import './page.css';

export default function DiariesPage() {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [activeStartDate, setActiveStartDate] = useState<Date | null>(today);
  const { data: tradingHistories = [] } = useTradingHistories(activeStartDate);

  // 월별 총매수/총매도 계산
  const { monthlyBuy, monthlySell } = useMemo(() => {
    const buy = tradingHistories
      .filter((h) => h.tradeType === 0)
      .reduce((sum, h) => sum + (h.totalPrice || 0), 0);
    const sell = tradingHistories
      .filter((h) => h.tradeType === 1)
      .reduce((sum, h) => sum + (h.totalPrice || 0), 0);
    return { monthlyBuy: buy, monthlySell: sell };
  }, [tradingHistories]);

  return (
    <div className="container mx-auto pt-8 pb-0">
      <div className="diaries-page-header">
        <h3 className="text-2xl font-bold mb-6 diaries-page-title">
          매매 일지
          <HelpIcon
            tooltip={`거래소를 연동하면 캘린더에 거래내역이 표시됩니다.
                      일자를 선택해서 매매일지를 작성해보세요!

                      일부 암호화폐 종목은 거래내역 및 가격을 추적(지원)하지 않습니다.
                      거래소 간 암호화폐 이동이나 이벤트를 통해 전달받은
                      암호화폐의 수익률 측정이 정확하지 않을 수 있습니다.`}
          />
        </h3>
        <div className="diaries-monthly-summary">
          <div className="diaries-summary-wrapper">
            <div className="diaries-summary-row">
              <div className="diaries-summary-vertical-line"></div>
              <div className="diaries-summary-content">
                <span className="diaries-summary-label">월총매수</span>
                <span className="diaries-summary-value">
                  <AnimatedCurrency value={monthlyBuy} duration={500} delayPerDigit={80} />
                </span>
              </div>
            </div>
            <div className="diaries-summary-row">
              <div className="diaries-summary-vertical-line"></div>
              <div className="diaries-summary-content">
                <span className="diaries-summary-label">월총매도</span>
                <span className="diaries-summary-value">
                  <AnimatedCurrency value={monthlySell} duration={500} delayPerDigit={80} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <MonthlyCalendar 
          activeStartDate={activeStartDate}
          onActiveStartDateChange={setActiveStartDate}
        />
      </div>
    </div>
  );
}

