'use client';

import { useState, useMemo } from 'react';
import { MonthlyCalendar } from '@/shared/components/calendar';
import { useTradingHistories } from '@/features/trading/hooks/useTradingHistories';
import { formatCurrency } from '@/features/asset/utils/assetCalculations';
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
          <span className="diaries-help-icon" data-tooltip="거래소를 연동하면 캘린더에 표시됩니다. 해당 일자를 선택하면 거래목록을 확인할 수 있습니다.">
            💬
          </span>
        </h3>
        <div className="diaries-monthly-summary">
          <div className="diaries-summary-wrapper">
            <div className="diaries-summary-row">
              <div className="diaries-summary-vertical-line"></div>
              <div className="diaries-summary-content">
                <span className="diaries-summary-label">월총매수</span>
                <span className="diaries-summary-value">{formatCurrency(monthlyBuy)}</span>
              </div>
            </div>
            <div className="diaries-summary-row">
              <div className="diaries-summary-vertical-line"></div>
              <div className="diaries-summary-content">
                <span className="diaries-summary-label">월총매도</span>
                <span className="diaries-summary-value">{formatCurrency(monthlySell)}</span>
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

