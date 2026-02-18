'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import type { TradeEvaluationStatusResponse } from '@/features/tradeEvaluation/types';
import { coinPriceService, type CoinPriceDayResponse } from '@/features/coins/services/coinPriceService';
import { fearGreedService, type FearGreedResponse } from '@/features/feargreed/services/fearGreedService';
import { getFearGreedLabel, getFearGreedRangeColor } from '@/features/feargreed/utils/fearGreedUtils';
import { getSixMonthRangeBefore } from '@/shared/utils/dateUtils';
import { useAppSelector } from '@/store/hooks';
import './TradeEvaluationResultPanel.css';

/** **키워드** 형태의 마크다운 볼드를 파싱해 <strong>으로 렌더링 */
function renderTextWithBold(text: string | null | undefined): React.ReactNode {
  const value = text?.trim();
  if (value == null || value === '') return '-';
  const parts = value.split('**');
  if (parts.length === 1) return value;
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="trade-evaluation-expert-bold">{part}</strong> : part));
}

/** 매매 평가 전문가 응답 (메타 에이전트) */
interface TradeEvaluationExpertData {
  article_expert_evaluation?: string;
  coin_price_expert_evaluation?: string;
  fear_greed_expert_evaluation?: string;
  own_trade_analysis?: string;
  suggestions?: string;
}

/** 전문가 키 → 표시 라벨 및 프로필 이미지 경로 (profile 폴더 내 이미지와 매핑) */
const EXPERT_CONFIG: Record<string, { label: string; imagePath: string }> = {
  article_expert: { label: '기사 전문가', imagePath: '/profile/profile3.png' },
  coin_price_expert: { label: '차트 전문가', imagePath: '/profile/profile2.png' },
  fear_greed_expert: { label: '공포/탐욕 전문가', imagePath: '/profile/profile5.png' },
  trade_evaluation_expert: { label: '분석 요약 및 평가', imagePath: '/profile/profile1.png' },
};

const EXPERT_KEYS_ORDER = ['article_expert', 'coin_price_expert', 'fear_greed_expert', 'trade_evaluation_expert'] as const;

/** 주목할 기사 한 건 (API period_data 항목) */
interface NotableArticleItem {
  date?: string;
  summary?: string;
  original_url?: string;
}

/** 주목할 기간 한 건 */
interface NotablePeriodItem {
  title?: string;
  period_text?: string;
  period_data?: NotableArticleItem[];
}

/** 기사 전문가 응답 객체 타입 */
interface ArticleExpertData {
  verdict?: string;
  market_flow_analysis?: string;
  short_long_term_perspective?: string;
  notable_periods?: NotablePeriodItem[];
}

/** 코인가격 전문가 주목할 기간 한 건 (period_data: 날짜 키 → "시가|고가|저가|종가, 등락률%" 문자열) */
interface CoinPriceNotablePeriod {
  title?: string;
  period_text?: string;
  period_data?: Array<Record<string, string>>;
}

/** 코인가격 전문가 응답 객체 타입 */
interface CoinPriceExpertData {
  verdict?: string;
  market_flow_analysis?: string;
  short_long_term_perspective?: string;
  notable_periods?: CoinPriceNotablePeriod[];
}

/** 공포/탐욕 전문가 주목할 기간 한 건 (period_data: 날짜 키 → 지수 값) */
interface FearGreedNotablePeriod {
  title?: string;
  period_text?: string;
  period_data?: Array<Record<string, number>>;
}

/** 공포/탐욕 전문가 응답 객체 타입 */
interface FearGreedExpertData {
  verdict?: string;
  market_flow_analysis?: string;
  short_long_term_perspective?: string;
  notable_periods?: FearGreedNotablePeriod[];
}

/** period_data 항목 문자열 "시가|고가|저가|종가, 등락률%" 파싱 → { open, high, low, close } */
function parseOhlcValue(valueStr: string): { open: number; high: number; low: number; close: number } | null {
  const part = valueStr.split(',')[0]?.trim();
  if (!part) return null;
  const parts = part.split('|').map((p) => parseFloat(p.trim()));
  if (parts.length >= 4 && parts.every(Number.isFinite)) {
    return { open: parts[0], high: parts[1], low: parts[2], close: parts[3] };
  }
  return null;
}

const CHART_HEIGHT = 184;

/** API 일봉 → lightweight-charts 라인 데이터 (time: YYYY-MM-DD, value: 종가) */
function sixMonthToLineData(rows: CoinPriceDayResponse[]): { time: string; value: number }[] {
  return rows
    .map((r) => {
      const t = r.candleDateTimeKst?.trim().slice(0, 10);
      return t ? { time: t, value: Number(r.tradePrice) } : null;
    })
    .filter((d): d is { time: string; value: number } => d != null)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** 주목할 기간 1개: title + 6개월 라인(배경) + 주목 기간 캔들(강조) */
function CoinPriceNotablePeriodChart({
  period,
  sixMonthPriceData = [],
}: {
  period: CoinPriceNotablePeriod;
  sixMonthPriceData?: CoinPriceDayResponse[];
}) {
  const title = period.title ?? '';
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const rawList = period.period_data ?? [];
  const chartData = useMemo(
    () =>
      rawList
        .flatMap((item) => Object.entries(item))
        .map(([date, valueStr]) => {
          const ohlc = parseOhlcValue(valueStr);
          if (!ohlc) return null;
          return { date, ...ohlc };
        })
        .filter((d): d is NonNullable<typeof d> => d != null)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [period]
  );

  const lwcData = useMemo(
    () =>
      chartData.map(({ date, open, high, low, close }) => ({
        time: date as string,
        open,
        high,
        low,
        close,
      })),
    [chartData]
  );

  const sixMonthLineData = useMemo(() => sixMonthToLineData(sixMonthPriceData), [sixMonthPriceData]);
  const hasBackground = sixMonthLineData.length > 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || lwcData.length === 0) return;

    const width = container.offsetWidth;
    const height = CHART_HEIGHT;
    const isDark = container.closest('.dark') !== null;
    const textColor = isDark ? 'rgba(237, 237, 237, 0.9)' : 'rgba(0, 19, 43, 0.85)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor,
        fontSize: 10,
      },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
      handleScale: { axisPressedMouseMove: false, pinch: false, mouseWheel: false },
    });

    const priceFormat = {
      type: 'custom' as const,
      formatter: (price: number) =>
        price >= 1e6 ? `${(price / 1e6).toFixed(1)}M` : price.toLocaleString('ko-KR', { maximumFractionDigits: 0 }),
    };

    if (hasBackground && sixMonthLineData.length > 0) {
      const lineSeries = chart.addLineSeries({
        color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 19, 43, 0.2)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat,
      });
      lineSeries.setData(sixMonthLineData);
    }

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat,
    });
    candlestickSeries.setData(lwcData);

    if (hasBackground && sixMonthLineData.length > 0) {
      const first = sixMonthLineData[0].time;
      const last = sixMonthLineData[sixMonthLineData.length - 1].time;
      chart.timeScale().setVisibleRange({ from: first, to: last });
    } else {
      chart.timeScale().fitContent();
    }

    const formatPriceForTooltip = (price: number): string => {
      if (Math.abs(price) < 100) {
        return new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(price);
      }
      return new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
    };
    const formatDateForTooltip = (dateString: string): string => {
      const date = new Date(dateString);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    if (!tooltipRef.current) {
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: absolute;
        display: none;
        padding: 8px 12px;
        background-color: rgba(0, 0, 0, 0.5);
        color: #ffffff;
        border-radius: 4px;
        font-size: 11px;
        font-family: 'Pretendard', sans-serif;
        pointer-events: none;
        z-index: 1000;
        white-space: nowrap;
      `;
      container.style.position = 'relative';
      container.appendChild(tooltip);
      tooltipRef.current = tooltip;
    }
    const tooltip = tooltipRef.current;

    chart.subscribeCrosshairMove((param) => {
      if (!tooltip || !param.point) {
        tooltip.style.display = 'none';
        return;
      }
      const time = param.time as string;
      if (!time) {
        tooltip.style.display = 'none';
        return;
      }
      const candleData = param.seriesData.get(candlestickSeries) as { open: number; high: number; low: number; close: number } | undefined;
      const rect = container.getBoundingClientRect();
      const x = param.point.x;
      const y = param.point.y;

      if (candleData) {
        tooltip.innerHTML = `
          <div style="margin-bottom: 4px; font-weight: 600;">${formatDateForTooltip(time)}</div>
          <div style="margin-bottom: 2px;">시가: ${formatPriceForTooltip(Number(candleData.open))}</div>
          <div style="margin-bottom: 2px;">고가: ${formatPriceForTooltip(Number(candleData.high))}</div>
          <div style="margin-bottom: 2px;">저가: ${formatPriceForTooltip(Number(candleData.low))}</div>
          <div>종가: ${formatPriceForTooltip(Number(candleData.close))}</div>
        `;
      } else {
        let lineValue: number | null = null;
        param.seriesData.forEach((v) => {
          const d = v as { value?: number };
          if (typeof d?.value === 'number') lineValue = d.value;
        });
        if (lineValue != null) {
          tooltip.innerHTML = `
            <div style="margin-bottom: 4px; font-weight: 600;">${formatDateForTooltip(time)}</div>
            <div>종가: ${formatPriceForTooltip(lineValue)}</div>
          `;
        } else {
          tooltip.style.display = 'none';
          return;
        }
      }

      tooltip.style.display = 'block';
      tooltip.style.left = `${x + 10}px`;
      tooltip.style.top = `${y - tooltip.offsetHeight / 2}px`;
      if (x + tooltip.offsetWidth > rect.width) {
        tooltip.style.left = `${x - tooltip.offsetWidth - 10}px`;
      }
      if (y + tooltip.offsetHeight / 2 > rect.height) {
        tooltip.style.top = `${rect.height - tooltip.offsetHeight - 10}px`;
      }
      if (y - tooltip.offsetHeight / 2 < 0) {
        tooltip.style.top = '10px';
      }
    });

    chartRef.current = chart;
    candlestickRef.current = candlestickSeries;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !chartRef.current) return;
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) chartRef.current.applyOptions({ width: w, height: h });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (tooltipRef.current && container.contains(tooltipRef.current)) {
        container.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
      chart.remove();
      chartRef.current = null;
      candlestickRef.current = null;
    };
  }, [lwcData, sixMonthPriceData]);

  if (chartData.length === 0) {
    return (
      <div className="trade-evaluation-notable-period-chart-block">
        <div className="trade-evaluation-notable-period-chart-title">{title || '-'}</div>
        <div className="trade-evaluation-notable-period-chart-empty">차트 데이터 없음</div>
      </div>
    );
  }

  return (
    <div className="trade-evaluation-notable-period-chart-block">
      <div className="trade-evaluation-notable-period-chart-title">{title || '-'}</div>
      <div className="trade-evaluation-notable-period-chart-wrap">
        <div
          ref={containerRef}
          className="trade-evaluation-notable-period-chart-container"
          style={{ width: '100%', height: CHART_HEIGHT }}
        />
      </div>
    </div>
  );
}

/** verdict 값에 따른 뱃지 클래스 */
function getVerdictBadgeClass(verdict: string): string {
  if (verdict === '긍정적') return 'verdict-positive';
  if (verdict === '부정적') return 'verdict-negative';
  return 'verdict-neutral'; // 보통 등
}

/** 주목할 기간 한 줄: 클릭 시 펼쳐지고, 기사 카드(date+summary) 클릭 시 original_url로 이동 */
function NotablePeriodRow({ period, index, isOpen, onToggle }: {
  period: NotablePeriodItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const title = period.title ?? '';
  const periodText = period.period_text ?? '';
  const items = Array.isArray(period.period_data) ? period.period_data : [];
  return (
    <div className="trade-evaluation-notable-period">
      <button
        type="button"
        className={`trade-evaluation-notable-period-header ${isOpen ? 'is-open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="trade-evaluation-notable-period-title">{title}</span>
        <span className="trade-evaluation-notable-period-text">{periodText}</span>
        <span className="trade-evaluation-notable-period-chevron" aria-hidden />
      </button>
      <div className={`trade-evaluation-notable-period-body ${isOpen ? 'is-open' : ''}`}>
        <div className="trade-evaluation-notable-period-body-inner">
          {items.map((item, i) => {
            const url = item.original_url ?? '';
            const card = (
              <div className="trade-evaluation-notable-article-card">
                <span className="trade-evaluation-notable-article-date">{item.date ?? '-'}</span>
                <span className="trade-evaluation-notable-article-summary">{item.summary ?? '-'}</span>
              </div>
            );
            return url ? (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="trade-evaluation-notable-article-link"
              >
                {card}
              </a>
            ) : (
              <div key={i} className="trade-evaluation-notable-article-link-placeholder">
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 기사 전문가: verdict → 시장 상황(뱃지), market_flow_analysis → 시장 분석, short_long_term_perspective → 단기적/장기적 의견 */
function ArticleExpertContent({ data }: { data: ArticleExpertData }) {
  const [expandedPeriodIndex, setExpandedPeriodIndex] = useState<number | null>(null);
  const marketFlow = data.market_flow_analysis ?? '';
  const perspective = data.short_long_term_perspective ?? '';
  const notablePeriods = data.notable_periods ?? null;
  const periodList = Array.isArray(notablePeriods) ? notablePeriods : [];

  return (
    <div className="trade-evaluation-expert-friendly">
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">시장 분석</span>
        <div className="trade-evaluation-expert-field-value has-bg">{renderTextWithBold(marketFlow)}</div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">단기적/장기적 의견</span>
        <div className="trade-evaluation-expert-field-value has-bg">{renderTextWithBold(perspective)}</div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">이전 7일간 기사 분석</span>
        <div className="trade-evaluation-expert-field-value">
          {periodList.length === 0 ? (
            '-'
          ) : (
            <div className="trade-evaluation-notable-periods">
              {periodList.map((period, index) => (
                <NotablePeriodRow
                  key={index}
                  period={period}
                  index={index}
                  isOpen={expandedPeriodIndex === index}
                  onToggle={() => setExpandedPeriodIndex((prev) => (prev === index ? null : index))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** period_data에서 가장 늦은 날짜(YYYY-MM-DD) 반환 */
function getPeriodEndDate(period: CoinPriceNotablePeriod): string {
  const raw = period.period_data ?? [];
  const dates = raw.flatMap((item) => Object.keys(item));
  return dates.length > 0 ? dates.sort((a, b) => a.localeCompare(b))[dates.length - 1]! : '';
}

/** 코인가격 전문가: 기사 전문가와 동일 구성·디자인. 주목할 기간은 title + period_data 그래프, 끝날짜 기준 오름차순 */
function CoinPriceExpertContent({
  data,
  sixMonthPriceData = [],
}: {
  data: CoinPriceExpertData;
  sixMonthPriceData?: CoinPriceDayResponse[];
}) {
  const marketFlow = data.market_flow_analysis ?? '';
  const perspective = data.short_long_term_perspective ?? '';
  const notablePeriods = data.notable_periods ?? null;
  const periodList = useMemo(() => {
    const list = Array.isArray(notablePeriods) ? notablePeriods : [];
    return [...list].sort((a, b) => getPeriodEndDate(a).localeCompare(getPeriodEndDate(b)));
  }, [notablePeriods]);

  return (
    <div className="trade-evaluation-expert-friendly">
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">시장 분석</span>
        <div className="trade-evaluation-expert-field-value has-bg">{renderTextWithBold(marketFlow)}</div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">단기적/장기적 의견</span>
        <div className="trade-evaluation-expert-field-value has-bg">{renderTextWithBold(perspective)}</div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">이전 6개월 주목할 구간</span>
        <div className="trade-evaluation-expert-field-value">
          {periodList.length === 0 ? (
            '-'
          ) : (
            <div className="trade-evaluation-notable-period-charts">
              {periodList.map((period, index) => (
                <CoinPriceNotablePeriodChart key={index} period={period} sixMonthPriceData={sixMonthPriceData} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FEAR_GREED_CHART_HEIGHT = 160;

/** 공포/탐욕 주목할 기간 1개: title + 6개월 라인(배경) + notable 구간 라인(강조) */
function FearGreedNotablePeriodChart({
  period,
  rangeData = [],
}: {
  period: FearGreedNotablePeriod;
  rangeData?: FearGreedResponse[];
}) {
  const title = period.title ?? '';
  const rawList = period.period_data ?? [];
  const notableDateSet = useMemo(() => {
    const dates = rawList.flatMap((item) => Object.keys(item));
    return new Set(dates);
  }, [period]);

  const chartData = useMemo(() => {
    // 서버 range 데이터(6개월)를 기본 라인으로 사용하고, notable 구간만 별도 라인으로 강조
    if (Array.isArray(rangeData) && rangeData.length > 0) {
      return rangeData
        .map((r) => {
          const date = String(r.date).trim().slice(0, 10);
          const value = Number(r.value);
          if (!date || !Number.isFinite(value)) return null;
          return {
            date,
            displayDate: date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3'),
            baseValue: value,
            highlightValue: notableDateSet.has(date) ? value : null,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d != null)
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // fallback: notable 기간 데이터만 라인
    return rawList
      .flatMap((item) => Object.entries(item))
      .map(([date, value]) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return null;
        return {
          date,
          displayDate: date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3'),
          baseValue: n,
          highlightValue: n,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d != null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rangeData, period, notableDateSet]);

  if (chartData.length === 0) {
    return (
      <div className="trade-evaluation-notable-period-chart-block">
        <div className="trade-evaluation-notable-period-chart-title">{title || '-'}</div>
        <div className="trade-evaluation-notable-period-chart-empty">차트 데이터 없음</div>
      </div>
    );
  }

  return (
    <div className="trade-evaluation-notable-period-chart-block">
      <div className="trade-evaluation-notable-period-chart-title">{title || '-'}</div>
      <div className="trade-evaluation-notable-period-chart-wrap">
        <ResponsiveContainer width="100%" height={FEAR_GREED_CHART_HEIGHT}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10 }}
              axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length || label == null) return null;
                const value = payload[0]?.value;
                const displayValue = value != null && value !== '' ? Number(value) : null;
                const rangeLabel = displayValue != null ? getFearGreedLabel(displayValue) : null;
                const rangeColor = displayValue != null ? getFearGreedRangeColor(displayValue) : '#ffffff';
                return (
                  <div
                    className="trade-evaluation-fear-greed-tooltip"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: '#ffffff',
                      borderRadius: 4,
                      fontSize: 11,
                      fontFamily: "'Pretendard', sans-serif",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ marginBottom: 4, fontWeight: 600 }}>
                      {typeof label === 'string' ? `날짜: ${label}` : label}
                    </div>
                    <div style={{ marginBottom: 2 }}>
                      수치: {displayValue != null ? displayValue : '-'}
                    </div>
                    {rangeLabel != null && (
                      <div style={{ color: rangeColor, fontWeight: 600 }}>
                        {rangeLabel}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="baseValue"
              stroke="var(--trade-evaluation-chart-bg-line, rgba(0, 19, 43, 0.2))"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="highlightValue"
              stroke="var(--main-color, #02a262)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 공포/탐욕 전문가: 차트 전문가와 동일 구성. 시장 분석 → 단기/장기 의견 → 주목할 기간(타이틀 + 라인 그래프) */
function FearGreedExpertContent({
  data,
  sixMonthFearGreedData = [],
}: {
  data: FearGreedExpertData;
  sixMonthFearGreedData?: FearGreedResponse[];
}) {
  const marketFlow = data.market_flow_analysis ?? '';
  const perspective = data.short_long_term_perspective ?? '';
  const notablePeriods = data.notable_periods ?? null;
  const periodList = Array.isArray(notablePeriods) ? notablePeriods : [];

  return (
    <div className="trade-evaluation-expert-friendly">
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">시장 분석</span>
        <div className="trade-evaluation-expert-field-value has-bg">{renderTextWithBold(marketFlow)}</div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">단기적/장기적 의견</span>
        <div className="trade-evaluation-expert-field-value has-bg">{renderTextWithBold(perspective)}</div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">이전 6개월 주목할 구간</span>
        <div className="trade-evaluation-expert-field-value">
          {periodList.length === 0 ? (
            '-'
          ) : (
            <div className="trade-evaluation-notable-period-charts">
              {periodList.map((period, index) => (
                <FearGreedNotablePeriodChart
                  key={index}
                  period={period}
                  rangeData={sixMonthFearGreedData}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 매매 평가 전문가: 열고 닫히는 패널 한 줄 (기사 주목할 기간과 동일 스타일) */
function TradeEvalExpertRow({
  title,
  body,
  isOpen,
  onToggle,
}: {
  title: string;
  body: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="trade-evaluation-notable-period">
      <button
        type="button"
        className={`trade-evaluation-notable-period-header ${isOpen ? 'is-open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="trade-evaluation-notable-period-title">{title}</span>
        <span className="trade-evaluation-notable-period-chevron" aria-hidden />
      </button>
      <div className={`trade-evaluation-notable-period-body ${isOpen ? 'is-open' : ''}`}>
        <div className="trade-evaluation-notable-period-body-inner">
          <div className="trade-evaluation-expert-field-value has-bg" style={{ margin: 0 }}>
            {renderTextWithBold(body)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 매매 평가 전문가: 기사 전문가와 동일 구성·디자인. 세 전문가 의견(접기/펼치기) → 닉네임 매매 분석 · 제안(시장 분석 스타일) */
function TradeEvaluationExpertContent({
  data,
  nickname = '',
}: {
  data: TradeEvaluationExpertData;
  nickname?: string | null;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const displayName = nickname?.trim() || '회원';
  const items: { label: string; body: string }[] = [
    { label: '기사 전문가', body: data.article_expert_evaluation ?? '' },
    { label: '차트 전문가', body: data.coin_price_expert_evaluation ?? '' },
    { label: '공포/탐욕 전문가', body: data.fear_greed_expert_evaluation ?? '' },
  ];

  return (
    <div className="trade-evaluation-expert-friendly">
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">전문가 의견 요약/평가</span>
        <div className="trade-evaluation-expert-field-value">
          <div className="trade-evaluation-notable-periods">
            {items.map((item, index) => (
              <TradeEvalExpertRow
                key={index}
                title={item.label}
                body={item.body}
                isOpen={expandedIndex === index}
                onToggle={() => setExpandedIndex((prev) => (prev === index ? null : index))}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">{displayName} 님의 매매 분석</span>
        <div className="trade-evaluation-expert-field-value has-bg">
          {renderTextWithBold(data.own_trade_analysis)}
        </div>
      </div>
      <div className="trade-evaluation-expert-field">
        <span className="trade-evaluation-expert-field-label">{displayName} 님에게 드리는 제안</span>
        <div className="trade-evaluation-expert-field-value has-bg">
          {renderTextWithBold(data.suggestions)}
        </div>
      </div>
    </div>
  );
}

interface TradeEvaluationResultPanelProps {
  /** 분석 결과 (null이면 패널 미표시) */
  result: TradeEvaluationStatusResponse | null;
  /** 이 결과가 어떤 매매 내역 것인지 (표시/초기화용) */
  tradeId: number | null;
  /** 매매일지 해당 날짜 (YYYY-MM-DD) - 6개월 차트용 */
  targetDate?: string;
  /** 코인 ID - 6개월 차트용 */
  coinId?: number;
  onClose: () => void;
}

export default function TradeEvaluationResultPanel({
  result,
  tradeId,
  targetDate,
  coinId,
  onClose,
}: TradeEvaluationResultPanelProps) {
  const [articleExpertOpen, setArticleExpertOpen] = useState(false);
  const [coinPriceExpertOpen, setCoinPriceExpertOpen] = useState(false);
  const [fearGreedExpertOpen, setFearGreedExpertOpen] = useState(false);
  const [tradeEvalExpertOpen, setTradeEvalExpertOpen] = useState(false);
  const nickname = useAppSelector((state) => state.auth.user?.nickname ?? null);

  if (result == null || tradeId == null) {
    return null;
  }

  const resultObj = (result.result && typeof result.result === 'object' ? result.result : {}) as Record<string, unknown>;
  const hasExperts = EXPERT_KEYS_ORDER.some((key) => resultObj[key] != null);
  const coinPriceExpertData = (hasExperts && resultObj.coin_price_expert != null && typeof resultObj.coin_price_expert === 'object')
    ? (resultObj.coin_price_expert as CoinPriceExpertData)
    : null;

  const sixMonthRange = useMemo(
    () => (targetDate ? getSixMonthRangeBefore(targetDate) : null),
    [targetDate]
  );
  const { data: sixMonthPriceData = [] } = useQuery({
    queryKey: ['coin-price-day', 'trade-eval-six-month', coinId, sixMonthRange?.startDate, sixMonthRange?.endDate],
    queryFn: () =>
      coinPriceService.getByDateRange(
        coinId!,
        sixMonthRange!.startDate,
        sixMonthRange!.endDate
      ),
    enabled: !!coinId && !!sixMonthRange && result?.status === 'COMPLETED',
    staleTime: 1000 * 60 * 5,
  });

  const fearGreedRange = useMemo(() => {
    if (!sixMonthRange) return null;
    return {
      start: sixMonthRange.startDate.slice(0, 10),
      end: sixMonthRange.endDate.slice(0, 10),
    };
  }, [sixMonthRange]);

  const { data: sixMonthFearGreedData = [] } = useQuery({
    queryKey: ['fearGreed', 'range', fearGreedRange?.start, fearGreedRange?.end],
    queryFn: () => fearGreedService.getRange(fearGreedRange!.start, fearGreedRange!.end),
    enabled: !!fearGreedRange && result?.status === 'COMPLETED',
    staleTime: 1000 * 60 * 30,
  });

  return (
    <div className="trade-evaluation-result-panel">
      <div className="trade-evaluation-result-panel-content">
        <div className="trade-evaluation-result-panel-header">
          <h3 className="trade-evaluation-result-panel-title">AI 매매 분석</h3>
          <button
            type="button"
            className="trade-evaluation-result-panel-close"
            onClick={onClose}
            aria-label="패널 닫기"
          >
            ×
          </button>
        </div>
        <div className="trade-evaluation-result-panel-body">
          {hasExperts ? (
            <div className="trade-evaluation-result-experts">
              {EXPERT_KEYS_ORDER.map((key) => {
                const value = resultObj[key];
                if (value == null) return null;
                const config = EXPERT_CONFIG[key];
                const label = config?.label ?? key;
                const imagePath = config?.imagePath ?? `/expert-profile/${key}_profile.png`;
                const isArticleExpert = key === 'article_expert';
                const isCoinPriceExpert = key === 'coin_price_expert';
                const isFearGreedExpert = key === 'fear_greed_expert';
                const isTradeEvalExpert = key === 'trade_evaluation_expert';
                const expertVerdict = (value && typeof value === 'object' && (value as { verdict?: string }).verdict)
                  ? (value as { verdict?: string }).verdict ?? ''
                  : '';
                const friendlyContent = isArticleExpert && value && typeof value === 'object'
                  ? <ArticleExpertContent data={value as ArticleExpertData} />
                  : isCoinPriceExpert && value && typeof value === 'object'
                    ? <CoinPriceExpertContent data={value as CoinPriceExpertData} sixMonthPriceData={sixMonthPriceData} />
                    : isFearGreedExpert && value && typeof value === 'object'
                      ? <FearGreedExpertContent data={value as FearGreedExpertData} sixMonthFearGreedData={sixMonthFearGreedData} />
                      : isTradeEvalExpert && value && typeof value === 'object'
                        ? <TradeEvaluationExpertContent data={value as TradeEvaluationExpertData} nickname={nickname} />
                        : (
                          <div className="trade-evaluation-result-expert-content">
                            {typeof value === 'object' && value !== null
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </div>
                        );

                const isCollapsibleExpert = isArticleExpert || isCoinPriceExpert || isFearGreedExpert || isTradeEvalExpert;
                const isOpen = isArticleExpert ? articleExpertOpen : isCoinPriceExpert ? coinPriceExpertOpen : isFearGreedExpert ? fearGreedExpertOpen : isTradeEvalExpert ? tradeEvalExpertOpen : false;
                const onToggle = isArticleExpert
                  ? () => setArticleExpertOpen((prev) => !prev)
                  : isCoinPriceExpert
                    ? () => setCoinPriceExpertOpen((prev) => !prev)
                    : isFearGreedExpert
                      ? () => setFearGreedExpertOpen((prev) => !prev)
                      : isTradeEvalExpert
                        ? () => setTradeEvalExpertOpen((prev) => !prev)
                        : undefined;

                if (isCollapsibleExpert && onToggle) {
                  return (
                    <div key={key} className="trade-evaluation-result-expert trade-evaluation-result-expert-collapsible">
                      <button
                        type="button"
                        className={`trade-evaluation-result-expert-header trade-evaluation-result-expert-header-button ${isOpen ? 'is-open' : ''}`}
                        onClick={onToggle}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `${label} 접기` : `${label} 펼치기`}
                      >
                        <div className="trade-evaluation-result-expert-header-left">
                          <div className="trade-evaluation-result-expert-profile-wrap">
                            <img
                              src={imagePath}
                              alt=""
                              className="trade-evaluation-result-expert-profile"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <span className="trade-evaluation-result-expert-label">{label}</span>
                        </div>
                        <div className="trade-evaluation-result-expert-header-right">
                          {expertVerdict ? (
                            <>
                              <span className="trade-evaluation-verdict-label">시장 상황</span>
                              <span className={`trade-evaluation-verdict-badge ${getVerdictBadgeClass(expertVerdict)}`}>
                                {expertVerdict}
                              </span>
                            </>
                          ) : null}
                          <span className="trade-evaluation-result-expert-chevron" aria-hidden />
                        </div>
                      </button>
                      <div className={`trade-evaluation-result-expert-body ${isOpen ? 'is-open' : ''}`}>
                        <div className="trade-evaluation-result-expert-body-inner">
                          {friendlyContent}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                    <div key={key} className="trade-evaluation-result-expert">
                    <div className="trade-evaluation-result-expert-header">
                      <div className="trade-evaluation-result-expert-header-left">
                        <div className="trade-evaluation-result-expert-profile-wrap">
                          <img
                            src={imagePath}
                            alt=""
                            className="trade-evaluation-result-expert-profile"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="trade-evaluation-result-expert-label">{label}</span>
                      </div>
                      {expertVerdict ? (
                        <div className="trade-evaluation-result-expert-header-right">
                          <span className="trade-evaluation-verdict-label">시장 상황</span>
                          <span className={`trade-evaluation-verdict-badge ${getVerdictBadgeClass(expertVerdict)}`}>
                            {expertVerdict}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {friendlyContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="trade-evaluation-result-text">
              {typeof (resultObj.summary ?? resultObj.content ?? resultObj.text) === 'string'
                ? String(resultObj.summary ?? resultObj.content ?? resultObj.text)
                : '분석 결과가 없습니다.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
