'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useLayoutEffect,
  useCallback,
  type CSSProperties,
} from 'react';
import { CoinResponse } from '@/features/coins/services/coinService';
import { useAppSelector } from '@/store/hooks';
import { selectPriceByMarket } from '@/store/slices/coinPriceSlice';
import { CoinPriceDayResponse } from '@/features/coins/services/coinPriceService';
import { useFearGreedByDate, useFearGreedToday } from '@/features/feargreed/hooks/useFearGreed';
import { FearGreedResponse } from '@/features/feargreed/services/fearGreedService';
import { useLongShort } from '@/features/longshort/hooks/useLongShort';
import { LongShortPeriod } from '@/features/longshort/services/longShortService';
import { useArticlesByDateRange } from '@/features/articles/hooks/useArticles';
import CoinDetailCandleChart from '@/shared/components/charts/CoinDetailCandleChart';
import CoinDetailLineChart from '@/shared/components/charts/CoinDetailLineChart';
import {
  CHART_BB_STD_DEV_DEFAULT,
  CHART_BB_STD_DEV_LIMITS,
  CHART_INDICATOR_COLOR_PICKER_SEED,
  CHART_INDICATOR_LINE_WIDTH_OPTIONS,
  CHART_INDICATOR_PERIOD_LIMITS,
  CHART_INDICATOR_PERIODS,
  clampBbStdDev,
  clampIndicatorPeriod,
  type ChartIndicatorLineWidthPreset,
} from '@/features/coins/utils/chartTechnicalIndicators';
import { HelpIcon } from '@/shared/components/ui';
import './CoinDetailSidebar.css';

const INDICATOR_LINE_WIDTH_LABELS: readonly string[] = ['얇게', '보통', '굵게', '매우 굵게'];

type IndicatorSettingsTab = 'value' | 'appearance';

const INDICATOR_ROW_TOOLTIPS = {
  sma:
    '지정한 일수만큼의 종가를 같은 비중으로 평균낸 선입니다.\n가격의 대략적인 추세와 지지·저항을 보는 데 쓰이며, \n서로 다른 기간의 이동평균이 교차할 때(골든크로스·데드크로스 등) 추세 전환 신호로 참고하기도 합니다.',
  ema:
    '최근 종가에 더 큰 가중치를 두어 계산한 이동평균입니다.\n같은 기간이라도 단순 이동평균보다 최근 가격 변화에 빠르게 반응해, 추세가 바뀔 때 선이 더 민감하게 움직입니다.',
  rsi:
    '일정 기간 동안의 상승 폭과 하락 폭을 비교해 \n 0~100 사이로 나타낸 모멘텀 지표입니다.\n일반적으로 70을 넘으면 과매수(과열) 구간, \n 30 아래면 과매도(침체) 구간으로 많이 봅니다.',
  volume:
    '해당 봉(기간) 동안 체결된 거래 수량입니다.\n가격이 오르거나 내릴 때 거래량이 함께 크면 그 방향에 대한 관심이 크다고 해석하는 경우가 많고, \n 가격만 움직이고 거래량이 적으면 추세가 약할 수 있다는 식으로 함께 읽습니다.',
  bb:
    '일정 기간 종가의 이동평균을 중심으로, 변동성(표준편차)에 비례한 폭으로 위·아래 밴드를 그은 지표입니다.\n가격이 밴드에 닿거나 벗어날 때 과열·과매도 구간을 참고하거나, 밴드 폭이 좁아졌다 넓어지는 모습으로 변동성 변화를 읽는 데 쓰입니다.',
  macd:
    'MACD 선(M)은 단기 EMA와 장기 EMA의 차이로, \n 0선 위/아래에서 추세의 방향과 강도를 봅니다.\n\n시그널 선(Sig)은 MACD의 이동평균으로, \n MACD가 시그널을 상향 돌파하면 단기 강세 전환, \n 하향 이탈하면 약세 전환 신호로 해석합니다.\n\n히스토그램(H, 막대/캔들)은 MACD와 시그널의 차이이며, 막대가 커지면 모멘텀 강화, 줄어들면 모멘텀 둔화로 봅니다.\n'
} as const;

interface CoinDetailSidebarProps {
  coin: CoinResponse | null;
  isClosing?: boolean;
  onClose: () => void;
}

interface TooltipPositionerProps {
  mouseX: number;
  mouseY: number;
  dateTimeString: string;
  longAccountPercent: string;
  shortAccountPercent: string;
  longShortRatio: string;
}

/** 기술적 지표 기간 설정 버튼용 톱니바퀴 아이콘 */
function IndicatorSettingsGearIcon() {
  return (
    <svg
      className="coin-detail-chart-indicator-settings-icon"
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TooltipPositioner({ mouseX, mouseY, dateTimeString, longAccountPercent, shortAccountPercent, longShortRatio }: TooltipPositionerProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);
  
  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    
    const tooltipWidth = tooltipRef.current.offsetWidth || 180;
    const tooltipOffset = 0; // 마우스와 바로 붙이기
    
    // bar-group의 위치를 기준으로 마우스 위치를 조정
    const barGroup = tooltipRef.current.closest('.coin-detail-long-short-chart-bar-group');
    const chartBars = tooltipRef.current.closest('.coin-detail-long-short-chart-bars');
    
    if (!barGroup || !chartBars) return;
    
    const barGroupRect = barGroup.getBoundingClientRect();
    const chartBarsRect = chartBars.getBoundingClientRect();
    
    // 마우스 위치를 bar-group 기준으로 변환
    const relativeMouseX = mouseX - (barGroupRect.left - chartBarsRect.left);
    const chartBarsWidth = chartBars.clientWidth;
    
    // 마우스 우측에 배치했을 때 화면 밖으로 나가는지 확인
    const absoluteMouseX = mouseX;
    const wouldOverflow = absoluteMouseX + tooltipOffset + tooltipWidth > chartBarsWidth;
    
    // 우측에 배치할지 왼쪽에 배치할지 결정
    const left = wouldOverflow 
      ? relativeMouseX - tooltipWidth - tooltipOffset // 왼쪽에 배치
      : relativeMouseX + tooltipOffset; // 우측에 배치
    
    setTooltipLeft(left);
  }, [mouseX]);
  
  return (
    <div 
      ref={tooltipRef}
      className="coin-detail-long-short-chart-tooltip"
      style={{
        left: `${tooltipLeft}px`,
        top: `${mouseY}px`,
        transform: 'translateY(-50%)', // y축 중앙 정렬
      }}
    >
      <div className="coin-detail-long-short-chart-tooltip-content">
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">날짜/시간:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{dateTimeString}</span>
        </div>
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">롱 계정:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{longAccountPercent}%</span>
        </div>
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">숏 계정:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{shortAccountPercent}%</span>
        </div>
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">롱/숏 비율:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{longShortRatio}</span>
        </div>
      </div>
    </div>
  );
}

export default function CoinDetailSidebar({ coin, isClosing = false, onClose }: CoinDetailSidebarProps) {
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [showSma, setShowSma] = useState(false);
  const [showEma, setShowEma] = useState(false);
  const [showRsi, setShowRsi] = useState(false);
  const [showBb, setShowBb] = useState(false);
  const [showMacd, setShowMacd] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [smaPeriod, setSmaPeriod] = useState<number>(CHART_INDICATOR_PERIODS.sma);
  const [emaPeriod, setEmaPeriod] = useState<number>(CHART_INDICATOR_PERIODS.ema);
  const [rsiPeriod, setRsiPeriod] = useState<number>(CHART_INDICATOR_PERIODS.rsi);
  const [bbPeriod, setBbPeriod] = useState<number>(CHART_INDICATOR_PERIODS.bb);
  const [macdFastPeriod, setMacdFastPeriod] = useState<number>(CHART_INDICATOR_PERIODS.macdFast);
  const [macdSlowPeriod, setMacdSlowPeriod] = useState<number>(CHART_INDICATOR_PERIODS.macdSlow);
  const [macdSignalPeriod, setMacdSignalPeriod] = useState<number>(CHART_INDICATOR_PERIODS.macdSignal);
  const [bbStdDev, setBbStdDev] = useState<number>(CHART_BB_STD_DEV_DEFAULT);
  const [smaColorOverride, setSmaColorOverride] = useState<string | null>(null);
  const [emaColorOverride, setEmaColorOverride] = useState<string | null>(null);
  const [rsiColorOverride, setRsiColorOverride] = useState<string | null>(null);
  const [bbColorOverride, setBbColorOverride] = useState<string | null>(null);
  const [macdColorOverride, setMacdColorOverride] = useState<string | null>(null);
  const [macdSignalColorOverride, setMacdSignalColorOverride] = useState<string | null>(null);
  const [smaLineWidth, setSmaLineWidth] = useState<ChartIndicatorLineWidthPreset>(1);
  const [emaLineWidth, setEmaLineWidth] = useState<ChartIndicatorLineWidthPreset>(1);
  const [rsiLineWidth, setRsiLineWidth] = useState<ChartIndicatorLineWidthPreset>(1);
  const [bbLineWidth, setBbLineWidth] = useState<ChartIndicatorLineWidthPreset>(1);
  const [macdLineWidth, setMacdLineWidth] = useState<ChartIndicatorLineWidthPreset>(1);
  const [indicatorSettingsKey, setIndicatorSettingsKey] = useState<
    'sma' | 'ema' | 'rsi' | 'bb' | 'macd' | null
  >(null);
  const [indicatorSettingsTab, setIndicatorSettingsTab] = useState<IndicatorSettingsTab>('value');
  const [appearanceDraft, setAppearanceDraft] = useState<{
    useAutoColor: boolean;
    colorHex: string;
    lineWidth: ChartIndicatorLineWidthPreset;
  }>({
    useAutoColor: true,
    colorHex: CHART_INDICATOR_COLOR_PICKER_SEED.sma,
    lineWidth: 1,
  });
  const [indicatorSettingsDraft, setIndicatorSettingsDraft] = useState('');
  const [indicatorSettingsStdDevDraft, setIndicatorSettingsStdDevDraft] = useState('');
  const [indicatorSettingsMacdFastDraft, setIndicatorSettingsMacdFastDraft] = useState('');
  const [indicatorSettingsMacdSlowDraft, setIndicatorSettingsMacdSlowDraft] = useState('');
  const [indicatorSettingsMacdSignalDraft, setIndicatorSettingsMacdSignalDraft] = useState('');
  const [macdAppearanceDraft, setMacdAppearanceDraft] = useState<{
    macdUseAuto: boolean;
    macdColorHex: string;
    signalUseAuto: boolean;
    signalColorHex: string;
    lineWidth: ChartIndicatorLineWidthPreset;
  }>({
    macdUseAuto: true,
    macdColorHex: CHART_INDICATOR_COLOR_PICKER_SEED.macd,
    signalUseAuto: true,
    signalColorHex: CHART_INDICATOR_COLOR_PICKER_SEED.macdSignal,
    lineWidth: 1,
  });
  const [indicatorSettingsPos, setIndicatorSettingsPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const indicatorSettingsPopoverRef = useRef<HTMLDivElement>(null);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const indicatorTriggerRef = useRef<HTMLButtonElement>(null);
  const indicatorPanelRef = useRef<HTMLDivElement>(null);
  const [indicatorPanelStyle, setIndicatorPanelStyle] = useState<CSSProperties>({});
  const updateIndicatorPanelPosition = useCallback(() => {
    const el = indicatorTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const minW = Math.max(rect.width, 268);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - minW - 8));
    setIndicatorPanelStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left,
      minWidth: minW,
      zIndex: 10001,
    });
  }, []);
  const [detailTab, setDetailTab] = useState<'detail' | 'memo'>('detail');
  const [selectedDateData, setSelectedDateData] = useState<CoinPriceDayResponse | null>(null);
  const [longShortPeriod, setLongShortPeriod] = useState<LongShortPeriod>('1h');
  const [isPriceChanged, setIsPriceChanged] = useState(false);
  const prevPriceRef = useRef<number | null>(null);
  const [gradientColors, setGradientColors] = useState({ start: '#1375ec', end: '#dd3c44' });
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [newsPage, setNewsPage] = useState(0);
  
  useEffect(() => {
    if (chartType === 'line') {
      setIndicatorMenuOpen(false);
    }
  }, [chartType]);

  useEffect(() => {
    if (!indicatorMenuOpen) {
      setIndicatorSettingsKey(null);
    }
  }, [indicatorMenuOpen]);

  const openIndicatorSettings = (
    key: 'sma' | 'ema' | 'rsi' | 'bb' | 'macd',
    anchorEl: HTMLElement
  ) => {
    const r = anchorEl.getBoundingClientRect();
    const panelWidth = 300;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - panelWidth - 8));
    setIndicatorSettingsPos({ top: r.bottom + 4, left });
    setIndicatorSettingsKey(key);
    setIndicatorSettingsTab('value');
    if (key === 'macd') {
      setIndicatorSettingsDraft('');
      setIndicatorSettingsMacdFastDraft(String(macdFastPeriod));
      setIndicatorSettingsMacdSlowDraft(String(macdSlowPeriod));
      setIndicatorSettingsMacdSignalDraft(String(macdSignalPeriod));
    } else {
      const current =
        key === 'sma' ? smaPeriod : key === 'ema' ? emaPeriod : key === 'rsi' ? rsiPeriod : bbPeriod;
      setIndicatorSettingsDraft(String(current));
      setIndicatorSettingsStdDevDraft(
        key === 'bb' ? String(bbStdDev) : String(CHART_BB_STD_DEV_DEFAULT)
      );
    }
    if (key === 'macd') {
      setMacdAppearanceDraft({
        macdUseAuto: macdColorOverride === null,
        macdColorHex: macdColorOverride ?? CHART_INDICATOR_COLOR_PICKER_SEED.macd,
        signalUseAuto: macdSignalColorOverride === null,
        signalColorHex: macdSignalColorOverride ?? CHART_INDICATOR_COLOR_PICKER_SEED.macdSignal,
        lineWidth: macdLineWidth,
      });
      return;
    }
    const seed =
      key === 'bb' ? CHART_INDICATOR_COLOR_PICKER_SEED.bb : CHART_INDICATOR_COLOR_PICKER_SEED[key];
    const override =
      key === 'sma'
        ? smaColorOverride
        : key === 'ema'
          ? emaColorOverride
          : key === 'rsi'
            ? rsiColorOverride
            : bbColorOverride;
    const lw =
      key === 'sma'
        ? smaLineWidth
        : key === 'ema'
          ? emaLineWidth
          : key === 'rsi'
            ? rsiLineWidth
            : bbLineWidth;
    setAppearanceDraft({
      useAutoColor: override === null,
      colorHex: override ?? seed,
      lineWidth: lw,
    });
  };

  const applyIndicatorSettings = () => {
    const key = indicatorSettingsKey;
    if (!key) return;
    if (key === 'macd') {
      const fast = clampIndicatorPeriod(Number(indicatorSettingsMacdFastDraft));
      const slow = clampIndicatorPeriod(Number(indicatorSettingsMacdSlowDraft));
      const signal = clampIndicatorPeriod(Number(indicatorSettingsMacdSignalDraft));
      if (fast >= slow) {
        window.alert('단기 기간은 장기 기간보다 작아야 합니다.');
        return;
      }
      setMacdFastPeriod(fast);
      setMacdSlowPeriod(slow);
      setMacdSignalPeriod(signal);
      setMacdColorOverride(macdAppearanceDraft.macdUseAuto ? null : macdAppearanceDraft.macdColorHex);
      setMacdSignalColorOverride(
        macdAppearanceDraft.signalUseAuto ? null : macdAppearanceDraft.signalColorHex
      );
      setMacdLineWidth(macdAppearanceDraft.lineWidth);
      setIndicatorSettingsKey(null);
      return;
    }
    if (key === 'bb') {
      setBbPeriod(clampIndicatorPeriod(Number(indicatorSettingsDraft)));
      setBbStdDev(clampBbStdDev(Number(indicatorSettingsStdDevDraft)));
      setBbColorOverride(appearanceDraft.useAutoColor ? null : appearanceDraft.colorHex);
      setBbLineWidth(appearanceDraft.lineWidth);
    } else {
      const v = clampIndicatorPeriod(Number(indicatorSettingsDraft));
      if (key === 'sma') {
        setSmaPeriod(v);
        setSmaColorOverride(appearanceDraft.useAutoColor ? null : appearanceDraft.colorHex);
        setSmaLineWidth(appearanceDraft.lineWidth);
      } else if (key === 'ema') {
        setEmaPeriod(v);
        setEmaColorOverride(appearanceDraft.useAutoColor ? null : appearanceDraft.colorHex);
        setEmaLineWidth(appearanceDraft.lineWidth);
      } else {
        setRsiPeriod(v);
        setRsiColorOverride(appearanceDraft.useAutoColor ? null : appearanceDraft.colorHex);
        setRsiLineWidth(appearanceDraft.lineWidth);
      }
    }
    setIndicatorSettingsKey(null);
  };

  const resetIndicatorSettingsValueTab = () => {
    const key = indicatorSettingsKey;
    if (!key) return;
    if (key === 'bb') {
      setIndicatorSettingsDraft(String(CHART_INDICATOR_PERIODS.bb));
      setIndicatorSettingsStdDevDraft(String(CHART_BB_STD_DEV_DEFAULT));
      return;
    }
    if (key === 'macd') {
      setIndicatorSettingsMacdFastDraft(String(CHART_INDICATOR_PERIODS.macdFast));
      setIndicatorSettingsMacdSlowDraft(String(CHART_INDICATOR_PERIODS.macdSlow));
      setIndicatorSettingsMacdSignalDraft(String(CHART_INDICATOR_PERIODS.macdSignal));
      return;
    }
    setIndicatorSettingsDraft(String(CHART_INDICATOR_PERIODS[key]));
  };

  const resetIndicatorSettingsAppearanceTab = () => {
    const key = indicatorSettingsKey;
    if (!key) return;
    if (key === 'macd') {
      setMacdAppearanceDraft({
        macdUseAuto: true,
        macdColorHex: CHART_INDICATOR_COLOR_PICKER_SEED.macd,
        signalUseAuto: true,
        signalColorHex: CHART_INDICATOR_COLOR_PICKER_SEED.macdSignal,
        lineWidth: 1,
      });
      return;
    }
    const seed =
      key === 'bb' ? CHART_INDICATOR_COLOR_PICKER_SEED.bb : CHART_INDICATOR_COLOR_PICKER_SEED[key];
    setAppearanceDraft({
      useAutoColor: true,
      colorHex: seed,
      lineWidth: 1,
    });
  };

  useLayoutEffect(() => {
    if (!indicatorMenuOpen) return;
    updateIndicatorPanelPosition();
  }, [indicatorMenuOpen, updateIndicatorPanelPosition]);

  useEffect(() => {
    if (!indicatorMenuOpen) return;
    const reposition = () => {
      updateIndicatorPanelPosition();
    };
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (indicatorSettingsPopoverRef.current?.contains(node)) {
        return;
      }
      if (indicatorTriggerRef.current?.contains(node) || indicatorPanelRef.current?.contains(node)) {
        return;
      }
      setIndicatorMenuOpen(false);
    };
    window.addEventListener('resize', reposition);
    document.addEventListener('pointerdown', onPointerDown, true);
    const scrollParent = indicatorTriggerRef.current?.closest('.coin-detail-sidebar-body');
    scrollParent?.addEventListener('scroll', reposition, { passive: true });
    return () => {
      window.removeEventListener('resize', reposition);
      document.removeEventListener('pointerdown', onPointerDown, true);
      scrollParent?.removeEventListener('scroll', reposition);
    };
  }, [indicatorMenuOpen, updateIndicatorPanelPosition]);

  useEffect(() => {
    if (!indicatorMenuOpen && !indicatorSettingsKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (indicatorSettingsKey) {
        setIndicatorSettingsKey(null);
      } else {
        setIndicatorMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [indicatorMenuOpen, indicatorSettingsKey]);

  const dateString = useMemo(() => {
    if (!selectedDateData) return null;
    const date = new Date(selectedDateData.candleDateTimeKst);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDateData]);

  // 2018년 2월 1일 이전 날짜인지 확인
  const isDateBeforeMinDate = useMemo(() => {
    if (!selectedDateData) return false;
    try {
      const selectedDate = new Date(selectedDateData.candleDateTimeKst);
      const minDate = new Date('2018-02-01');
      return selectedDate < minDate;
    } catch {
      return false;
    }
  }, [selectedDateData]);
  
  const { data: fearGreedData, isLoading: isLoadingFearGreed } = useFearGreedByDate(dateString);
  const { data: fearGreedTodayData } = useFearGreedToday();
  const lastDisplayedDataRef = useRef<FearGreedResponse | null>(null);
  
  useEffect(() => {
    if (fearGreedData) {
      lastDisplayedDataRef.current = fearGreedData;
    }
  }, [fearGreedData]);
  
  const displayFearGreedData = fearGreedData || lastDisplayedDataRef.current;
  
  // CSS 변수 값 가져오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rootStyle = getComputedStyle(document.documentElement);
      const priceDownColor = rootStyle.getPropertyValue('--price-down').trim() || '#1375ec';
      const priceUpColor = rootStyle.getPropertyValue('--price-up').trim() || '#dd3c44';
      setGradientColors({ start: priceDownColor, end: priceUpColor });
    }
  }, []);
  
  // Hooks 규칙: early return 전에 모든 hooks 호출
  // coin이 null일 수 있으므로 안전하게 처리
  const priceData = useAppSelector(selectPriceByMarket(coin?.marketCode || ''));
  
  // 가격 변동 감지
  useEffect(() => {
    if (priceData?.tradePrice !== undefined && priceData.tradePrice !== null) {
      const currentPrice = priceData.tradePrice;
      
      if (prevPriceRef.current !== null && prevPriceRef.current !== currentPrice) {
        // 가격이 변경되었을 때 깜빡임 효과 트리거
        setIsPriceChanged(true);
        const timer = setTimeout(() => {
          setIsPriceChanged(false);
        }, 500); // 0.5초 후 애니메이션 제거
        
        return () => clearTimeout(timer);
      }
      
      prevPriceRef.current = currentPrice;
    }
  }, [priceData?.tradePrice]);

  // 차트 클릭 핸들러: 날짜 선택
  const handleDateClick = (dateData: CoinPriceDayResponse | null) => {
    setSelectedDateData(dateData);
  };

  // 선택한 코인이 달라지거나 탭이 꺼질 때 초기화
  useEffect(() => {
    // 코인이 변경되거나 사이드바가 닫힐 때
    setSelectedDateData(null);
    setDetailTab('detail'); // 현재 데이터 탭이 default
  }, [coin?.id, isClosing]);

  // 롱/숏 비율 데이터 조회 (early return 전에 호출해야 함)
  const coinSymbol = coin?.symbol || null;
  const { data: longShortData = [], isLoading: isLoadingLongShort } = useLongShort(coinSymbol, longShortPeriod);
  
  // 뉴스 데이터 조회
  const { data: articlesData, isLoading: isLoadingArticles } = useArticlesByDateRange(dateString, newsPage);
  
  // 뉴스 탭이 활성화되거나 날짜가 변경되면 페이지를 0으로 리셋
  useEffect(() => {
    if (detailTab === 'memo') {
      setNewsPage(0);
    }
  }, [detailTab, dateString]);
  
  if (!coin) return null;

  // 이미지 URL 구성
  const imageBasePath = process.env.NEXT_PUBLIC_IMAGE_BASE_PATH || '';
  const imageUrl = coin.imgUrl ? `${imageBasePath}${coin.imgUrl}` : null;
  
  const koreanName = coin.koreanName || coin.marketCode;
  const marketCode = coin.marketCode;

  // 데이터가 없으면 '-' 표시
  const hasData = priceData !== null;
  
  // 현재가
  const price = hasData ? (priceData.tradePrice || 0) : null;
  
  // 등락율: signedChangeRate 사용 (부호 포함, 음수 가능, 퍼센트 값)
  const changeRate = hasData 
    ? (priceData.signedChangeRate !== undefined && priceData.signedChangeRate !== null
        ? priceData.signedChangeRate
        : (priceData.changeRate !== undefined && priceData.changeRate !== null ? priceData.changeRate : 0))
    : null;

  // 가격 포맷팅
  const formatPrice = (value: number | null) => {
    if (value === null) return '-';
    if (value === 0) return '0';
    // 100보다 작으면 소수점 8자리까지 표기
    if (value < 100) {
      return value.toFixed(8).replace(/\.?0+$/, ''); // 끝의 불필요한 0 제거
    }
    // 100 이상이면 기존처럼 천단위 구분자 사용
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  // 날짜 포맷팅 (YYYY년 MM월 DD일)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  };

  // 오늘 날짜 포맷팅 (YYYY년 MM월 DD일 (오늘))
  const formatTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일 (오늘)`;
  };

  // 등락율 포맷팅
  const formatChangeRate = (changeRate: number | null) => {
    if (changeRate === null) return '-';
    if (changeRate === 0) return '0.00%';
    const sign = changeRate > 0 ? '+' : '';
    // changeRate는 소수점 값 (예: 0.05 = 5%), 퍼센트로 변환
    return `${sign}${(changeRate * 100).toFixed(2)}%`;
  };

  // 일일 변동폭 계산
  const calculateDailyRange = (highPrice: number | null, lowPrice: number | null) => {
    if (highPrice === null || lowPrice === null) return null;
    return highPrice - lowPrice;
  };

  // 변동폭 비율 계산
  const calculateRangeRate = (highPrice: number | null, lowPrice: number | null, prevClosingPrice: number | null) => {
    if (highPrice === null || lowPrice === null || prevClosingPrice === null || prevClosingPrice === 0) return null;
    return ((highPrice - lowPrice) / prevClosingPrice) * 100;
  };

  // 평균 거래 단가 계산
  const calculateAvgTradePrice = (accTradePrice: number | null, accTradeVolume: number | null) => {
    if (accTradePrice === null || accTradeVolume === null || accTradeVolume === 0) return null;
    return accTradePrice / accTradeVolume;
  };

  // 등락율 색상: changeRate가 0 이상이면 상승 색상, 작으면 하락 색상
  const changeRateColor = changeRate === null 
    ? 'var(--foreground)' 
    : changeRate >= 0 
      ? 'var(--price-up)' 
      : 'var(--price-down)';

  // 배경색: 텍스트 색상에 맞춘 연한 색상
  const getBackgroundColor = () => {
    if (changeRate === null) return 'rgba(0, 0, 0, 0.05)';
    if (changeRate >= 0) return 'rgba(221, 60, 68, 0.1)'; // price-up 연한 버전
    return 'rgba(19, 117, 236, 0.1)'; // price-down 연한 버전
  };

  // 공포/탐욕 지수 범위에 따른 색상 계산 (0-100 값을 파란색에서 빨간색으로 그라데이션)
  const getRangeColor = (value: number) => {
    if (typeof window === 'undefined') return '#171717';
    
    // CSS 변수 값 가져오기
    const rootStyle = getComputedStyle(document.documentElement);
    const priceDownColor = rootStyle.getPropertyValue('--price-down').trim() || '#1375ec';
    const priceUpColor = rootStyle.getPropertyValue('--price-up').trim() || '#dd3c44';
    
    // RGB 값 추출
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const startRgb = hexToRgb(priceDownColor);
    const endRgb = hexToRgb(priceUpColor);
    
    if (!startRgb || !endRgb) return '#171717';
    
    // 0-100 값을 0-1로 정규화
    const ratio = value / 100;
    
    // 그라데이션 계산
    const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio);
    const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio);
    const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="coin-detail-sidebar">
      <div className="coin-detail-sidebar-content">
        <div className="coin-detail-sidebar-header">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={koreanName}
              className="coin-detail-coin-image"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="coin-detail-coin-name-wrapper">
            <div className="coin-detail-coin-name">{koreanName}</div>
            <div className="coin-detail-market-code">{marketCode}</div>
          </div>
          <div className="coin-detail-price-wrapper">
            {coin.exchange && (
              <span 
                className="coin-detail-exchange-marker"
                data-tooltip={`해당 가상화폐의 가격은 ${coin.exchange}를 따릅니다.`}
              >
                {coin.exchange}
              </span>
            )}
            <div 
              className={`coin-detail-price-info ${isPriceChanged ? 'price-changed' : ''}`}
              style={isPriceChanged ? { backgroundColor: getBackgroundColor() } : {}}
            >
              <div className="coin-detail-price-info-content">
                <div className="coin-detail-price-value" style={{ color: changeRateColor }}>
                  {price !== null ? `${formatPrice(price)}원` : '-'}
                </div>
                <div className="coin-detail-change-rate" style={{ color: changeRateColor }}>
                  {formatChangeRate(changeRate)}
                </div>
              </div>
            </div>
          </div>
          <button
            className="coin-detail-sidebar-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="coin-detail-sidebar-body">

          <div className="coin-detail-chart-toolbar">
            {chartType === 'candle' ? (
              <div className="coin-detail-chart-indicators">
                <button
                  ref={indicatorTriggerRef}
                  type="button"
                  className="coin-detail-chart-indicators-trigger"
                  id="coin-detail-chart-indicators-trigger"
                  aria-expanded={indicatorMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="coin-detail-chart-indicators-panel"
                  onClick={() => {
                    setIndicatorMenuOpen((open) => {
                      if (open) return false;
                      updateIndicatorPanelPosition();
                      return true;
                    });
                  }}
                >
                  <span>기술적 지표</span>
                  <span
                    className={`coin-detail-chart-indicators-chevron${indicatorMenuOpen ? ' is-open' : ''}`}
                    aria-hidden
                  />
                </button>
                {indicatorMenuOpen ? (
                  <div
                    ref={indicatorPanelRef}
                    id="coin-detail-chart-indicators-panel"
                    className="coin-detail-chart-indicators-panel"
                    style={indicatorPanelStyle}
                    role="menu"
                    aria-labelledby="coin-detail-chart-indicators-trigger"
                  >
                    <div
                      className="coin-detail-chart-indicator-row coin-detail-chart-indicator-row--split coin-detail-chart-indicator-tooltip-host"
                      data-tooltip={INDICATOR_ROW_TOOLTIPS.sma}
                    >
                      <label className="coin-detail-chart-indicator-row-label" role="menuitemcheckbox">
                        <input
                          type="checkbox"
                          checked={showSma}
                          onChange={(e) => setShowSma(e.target.checked)}
                        />
                        <span>이동평균 (MA, Moving Average)</span>
                      </label>
                      <button
                        type="button"
                        className="coin-detail-chart-indicator-settings-btn"
                        aria-label="이동평균 기간 설정"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openIndicatorSettings('sma', e.currentTarget);
                        }}
                      >
                        <IndicatorSettingsGearIcon />
                      </button>
                    </div>
                    <div
                      className="coin-detail-chart-indicator-row coin-detail-chart-indicator-row--split coin-detail-chart-indicator-tooltip-host"
                      data-tooltip={INDICATOR_ROW_TOOLTIPS.ema}
                    >
                      <label className="coin-detail-chart-indicator-row-label" role="menuitemcheckbox">
                        <input
                          type="checkbox"
                          checked={showEma}
                          onChange={(e) => setShowEma(e.target.checked)}
                        />
                        <span>지수 이동평균 (EMA, Exponential Moving Average)</span>
                      </label>
                      <button
                        type="button"
                        className="coin-detail-chart-indicator-settings-btn"
                        aria-label="지수 이동평균 기간 설정"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openIndicatorSettings('ema', e.currentTarget);
                        }}
                      >
                        <IndicatorSettingsGearIcon />
                      </button>
                    </div>
                    <div
                      className="coin-detail-chart-indicator-row coin-detail-chart-indicator-row--split coin-detail-chart-indicator-tooltip-host"
                      data-tooltip={INDICATOR_ROW_TOOLTIPS.bb}
                    >
                      <label className="coin-detail-chart-indicator-row-label" role="menuitemcheckbox">
                        <input
                          type="checkbox"
                          checked={showBb}
                          onChange={(e) => setShowBb(e.target.checked)}
                        />
                        <span>볼린저 밴드 (BB, Bollinger Bands)</span>
                      </label>
                      <button
                        type="button"
                        className="coin-detail-chart-indicator-settings-btn"
                        aria-label="볼린저 밴드 기간·표준편차 설정"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openIndicatorSettings('bb', e.currentTarget);
                        }}
                      >
                        <IndicatorSettingsGearIcon />
                      </button>
                    </div>
                    <div
                      className="coin-detail-chart-indicator-row coin-detail-chart-indicator-row--split coin-detail-chart-indicator-tooltip-host"
                      data-tooltip={INDICATOR_ROW_TOOLTIPS.rsi}
                    >
                      <label className="coin-detail-chart-indicator-row-label" role="menuitemcheckbox">
                        <input
                          type="checkbox"
                          checked={showRsi}
                          onChange={(e) => setShowRsi(e.target.checked)}
                        />
                        <span>상대강도지수 (RSI, Relative Strength Index)</span>
                      </label>
                      <button
                        type="button"
                        className="coin-detail-chart-indicator-settings-btn"
                        aria-label="상대강도지수 기간 설정"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openIndicatorSettings('rsi', e.currentTarget);
                        }}
                      >
                        <IndicatorSettingsGearIcon />
                      </button>
                    </div>
                    <div
                      className="coin-detail-chart-indicator-row coin-detail-chart-indicator-row--split coin-detail-chart-indicator-tooltip-host"
                      data-tooltip={INDICATOR_ROW_TOOLTIPS.macd}
                    >
                      <label className="coin-detail-chart-indicator-row-label" role="menuitemcheckbox">
                        <input
                          type="checkbox"
                          checked={showMacd}
                          onChange={(e) => setShowMacd(e.target.checked)}
                        />
                        <span>이동평균 수렴·발산 (MACD, Moving Average Convergence Divergence)</span>
                      </label>
                      <button
                        type="button"
                        className="coin-detail-chart-indicator-settings-btn"
                        aria-label="MACD 기간·모양 설정"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openIndicatorSettings('macd', e.currentTarget);
                        }}
                      >
                        <IndicatorSettingsGearIcon />
                      </button>
                    </div>
                    <label
                      className="coin-detail-chart-indicator-row coin-detail-chart-indicator-tooltip-host"
                      role="menuitemcheckbox"
                      data-tooltip={INDICATOR_ROW_TOOLTIPS.volume}
                    >
                      <input
                        type="checkbox"
                        checked={showVolume}
                        onChange={(e) => setShowVolume(e.target.checked)}
                      />
                      <span>거래량 (Vol., Volume)</span>
                    </label>
                  </div>
                ) : null}
                {indicatorSettingsKey ? (
                  <div
                    ref={indicatorSettingsPopoverRef}
                    className="coin-detail-chart-indicator-settings-popover"
                    style={{
                      position: 'fixed',
                      top: indicatorSettingsPos.top,
                      left: indicatorSettingsPos.left,
                      zIndex: 10002,
                      width: 300,
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="지표 설정"
                  >
                    <div className="coin-detail-chart-indicator-settings-tabs" role="tablist" aria-label="설정 구분">
                      <button
                        type="button"
                        role="tab"
                        id="indicator-tab-value"
                        aria-selected={indicatorSettingsTab === 'value'}
                        className={`coin-detail-chart-indicator-settings-tab${indicatorSettingsTab === 'value' ? ' is-active' : ''}`}
                        onClick={() => setIndicatorSettingsTab('value')}
                      >
                        값
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id="indicator-tab-appearance"
                        aria-selected={indicatorSettingsTab === 'appearance'}
                        className={`coin-detail-chart-indicator-settings-tab${indicatorSettingsTab === 'appearance' ? ' is-active' : ''}`}
                        onClick={() => setIndicatorSettingsTab('appearance')}
                      >
                        모양
                      </button>
                    </div>
                    {indicatorSettingsTab === 'value' ? (
                      <div
                        className="coin-detail-chart-indicator-settings-form"
                        role="tabpanel"
                        aria-labelledby="indicator-tab-value"
                      >
                        {indicatorSettingsKey === 'macd' ? (
                          <>
                            <label className="coin-detail-chart-indicator-settings-label" htmlFor="indicator-macd-fast">
                              단기 (일)
                            </label>
                            <input
                              id="indicator-macd-fast"
                              type="number"
                              min={CHART_INDICATOR_PERIOD_LIMITS.min}
                              max={CHART_INDICATOR_PERIOD_LIMITS.max}
                              className="coin-detail-chart-indicator-settings-input"
                              value={indicatorSettingsMacdFastDraft}
                              onChange={(e) => setIndicatorSettingsMacdFastDraft(e.target.value)}
                            />
                            <label
                              className="coin-detail-chart-indicator-settings-label"
                              htmlFor="indicator-macd-slow"
                              style={{ marginTop: 12 }}
                            >
                              장기 (일)
                            </label>
                            <input
                              id="indicator-macd-slow"
                              type="number"
                              min={CHART_INDICATOR_PERIOD_LIMITS.min}
                              max={CHART_INDICATOR_PERIOD_LIMITS.max}
                              className="coin-detail-chart-indicator-settings-input"
                              value={indicatorSettingsMacdSlowDraft}
                              onChange={(e) => setIndicatorSettingsMacdSlowDraft(e.target.value)}
                            />
                            <label
                              className="coin-detail-chart-indicator-settings-label"
                              htmlFor="indicator-macd-signal"
                              style={{ marginTop: 12 }}
                            >
                              시그널 (일)
                            </label>
                            <input
                              id="indicator-macd-signal"
                              type="number"
                              min={CHART_INDICATOR_PERIOD_LIMITS.min}
                              max={CHART_INDICATOR_PERIOD_LIMITS.max}
                              className="coin-detail-chart-indicator-settings-input"
                              value={indicatorSettingsMacdSignalDraft}
                              onChange={(e) => setIndicatorSettingsMacdSignalDraft(e.target.value)}
                            />
                          </>
                        ) : (
                          <>
                            <label className="coin-detail-chart-indicator-settings-label" htmlFor="indicator-period-input">
                              기간 (일)
                            </label>
                            <input
                              id="indicator-period-input"
                              type="number"
                              min={CHART_INDICATOR_PERIOD_LIMITS.min}
                              max={CHART_INDICATOR_PERIOD_LIMITS.max}
                              className="coin-detail-chart-indicator-settings-input"
                              value={indicatorSettingsDraft}
                              onChange={(e) => setIndicatorSettingsDraft(e.target.value)}
                            />
                            {indicatorSettingsKey === 'bb' ? (
                              <>
                                <label
                                  className="coin-detail-chart-indicator-settings-label"
                                  htmlFor="indicator-stddev-input"
                                  style={{ marginTop: 12 }}
                                >
                                  표준편차 (σ)
                                </label>
                                <input
                                  id="indicator-stddev-input"
                                  type="number"
                                  min={CHART_BB_STD_DEV_LIMITS.min}
                                  max={CHART_BB_STD_DEV_LIMITS.max}
                                  step={0.5}
                                  className="coin-detail-chart-indicator-settings-input"
                                  value={indicatorSettingsStdDevDraft}
                                  onChange={(e) => setIndicatorSettingsStdDevDraft(e.target.value)}
                                />
                              </>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : (
                      <div
                        className="coin-detail-chart-indicator-settings-form coin-detail-chart-indicator-settings-form--appearance"
                        role="tabpanel"
                        aria-labelledby="indicator-tab-appearance"
                      >
                        {indicatorSettingsKey === 'macd' ? (
                          <>
                            <span className="coin-detail-chart-indicator-settings-label">MACD 선</span>
                            <label className="coin-detail-chart-indicator-settings-auto-color">
                              <input
                                type="checkbox"
                                checked={macdAppearanceDraft.macdUseAuto}
                                onChange={(e) =>
                                  setMacdAppearanceDraft((d) => ({
                                    ...d,
                                    macdUseAuto: e.target.checked,
                                  }))
                                }
                              />
                              <span>테마 기본 색 사용</span>
                            </label>
                            {!macdAppearanceDraft.macdUseAuto ? (
                              <input
                                type="color"
                                className="coin-detail-chart-indicator-settings-color-input"
                                value={macdAppearanceDraft.macdColorHex}
                                onChange={(e) =>
                                  setMacdAppearanceDraft((d) => ({
                                    ...d,
                                    macdColorHex: e.target.value,
                                  }))
                                }
                                aria-label="MACD 선 색상"
                              />
                            ) : null}
                            <span
                              className="coin-detail-chart-indicator-settings-label"
                              style={{ marginTop: 12 }}
                            >
                              시그널 선
                            </span>
                            <label className="coin-detail-chart-indicator-settings-auto-color">
                              <input
                                type="checkbox"
                                checked={macdAppearanceDraft.signalUseAuto}
                                onChange={(e) =>
                                  setMacdAppearanceDraft((d) => ({
                                    ...d,
                                    signalUseAuto: e.target.checked,
                                  }))
                                }
                              />
                              <span>테마 기본 색 사용</span>
                            </label>
                            {!macdAppearanceDraft.signalUseAuto ? (
                              <input
                                type="color"
                                className="coin-detail-chart-indicator-settings-color-input"
                                value={macdAppearanceDraft.signalColorHex}
                                onChange={(e) =>
                                  setMacdAppearanceDraft((d) => ({
                                    ...d,
                                    signalColorHex: e.target.value,
                                  }))
                                }
                                aria-label="시그널 선 색상"
                              />
                            ) : null}
                            <span className="coin-detail-chart-indicator-settings-label">
                              선 굵기 (MACD·시그널 공통)
                            </span>
                            <div
                              className="coin-detail-chart-indicator-line-widths"
                              role="group"
                              aria-label="선 굵기"
                            >
                              {CHART_INDICATOR_LINE_WIDTH_OPTIONS.map((w, i) => (
                                <button
                                  key={w}
                                  type="button"
                                  className={`coin-detail-chart-indicator-line-width-btn${
                                    macdAppearanceDraft.lineWidth === w ? ' is-active' : ''
                                  }`}
                                  onClick={() =>
                                    setMacdAppearanceDraft((d) => ({ ...d, lineWidth: w }))
                                  }
                                >
                                  {INDICATOR_LINE_WIDTH_LABELS[i] ?? w}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="coin-detail-chart-indicator-settings-label">색상</span>
                            <label className="coin-detail-chart-indicator-settings-auto-color">
                              <input
                                type="checkbox"
                                checked={appearanceDraft.useAutoColor}
                                onChange={(e) =>
                                  setAppearanceDraft((d) => ({ ...d, useAutoColor: e.target.checked }))
                                }
                              />
                              <span>테마 기본 색 사용</span>
                            </label>
                            {!appearanceDraft.useAutoColor ? (
                              <input
                                type="color"
                                className="coin-detail-chart-indicator-settings-color-input"
                                value={appearanceDraft.colorHex}
                                onChange={(e) =>
                                  setAppearanceDraft((d) => ({ ...d, colorHex: e.target.value }))
                                }
                                aria-label="선 색상"
                              />
                            ) : null}
                            <span className="coin-detail-chart-indicator-settings-label">선 굵기</span>
                            <div
                              className="coin-detail-chart-indicator-line-widths"
                              role="group"
                              aria-label="선 굵기"
                            >
                              {CHART_INDICATOR_LINE_WIDTH_OPTIONS.map((w, i) => (
                                <button
                                  key={w}
                                  type="button"
                                  className={`coin-detail-chart-indicator-line-width-btn${
                                    appearanceDraft.lineWidth === w ? ' is-active' : ''
                                  }`}
                                  onClick={() => setAppearanceDraft((d) => ({ ...d, lineWidth: w }))}
                                >
                                  {INDICATOR_LINE_WIDTH_LABELS[i] ?? w}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="coin-detail-chart-indicator-settings-actions">
                      <button
                        type="button"
                        className="coin-detail-chart-indicator-settings-reset"
                        aria-label={
                          indicatorSettingsTab === 'value'
                            ? '값 탭을 기본값으로 초기화'
                            : '모양 탭을 기본값으로 초기화'
                        }
                        onClick={
                          indicatorSettingsTab === 'value'
                            ? resetIndicatorSettingsValueTab
                            : resetIndicatorSettingsAppearanceTab
                        }
                      >
                        초기화
                      </button>
                      <div className="coin-detail-chart-indicator-settings-actions-right">
                        <button type="button" className="coin-detail-chart-indicator-settings-apply" onClick={applyIndicatorSettings}>
                          적용
                        </button>
                        <button
                          type="button"
                          className="coin-detail-chart-indicator-settings-cancel"
                          onClick={() => setIndicatorSettingsKey(null)}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="coin-detail-chart-indicators-spacer" aria-hidden />
            )}
            <div className="coin-detail-chart-controls">
              <button
                className={`coin-detail-chart-type-button ${chartType === 'candle' ? 'active' : ''}`}
                onClick={() => setChartType('candle')}
              >
                캔들
              </button>
              <button
                className={`coin-detail-chart-type-button ${chartType === 'line' ? 'active' : ''}`}
                onClick={() => setChartType('line')}
              >
                라인
              </button>
            </div>
          </div>

          {chartType === 'line' ? (
            <CoinDetailLineChart
              key={coin.id}
              coinId={coin.id}
              marketCode={coin.marketCode}
              containerClassName="coin-detail-chart"
              onDateClick={handleDateClick}
            />
          ) : (
            <CoinDetailCandleChart
              key={coin.id}
              coinId={coin.id}
              marketCode={coin.marketCode}
              containerClassName="coin-detail-chart"
              onDateClick={handleDateClick}
              showSma={showSma}
              showEma={showEma}
              showRsi={showRsi}
              showMacd={showMacd}
              showBb={showBb}
              showVolume={showVolume}
              smaPeriod={smaPeriod}
              emaPeriod={emaPeriod}
              rsiPeriod={rsiPeriod}
              macdFastPeriod={macdFastPeriod}
              macdSlowPeriod={macdSlowPeriod}
              macdSignalPeriod={macdSignalPeriod}
              bbPeriod={bbPeriod}
              bbStdDev={bbStdDev}
              smaColor={smaColorOverride}
              emaColor={emaColorOverride}
              rsiColor={rsiColorOverride}
              macdColor={macdColorOverride}
              macdSignalLineColor={macdSignalColorOverride}
              bbColor={bbColorOverride}
              smaLineWidth={smaLineWidth}
              emaLineWidth={emaLineWidth}
              rsiLineWidth={rsiLineWidth}
              macdLineWidth={macdLineWidth}
              bbLineWidth={bbLineWidth}
            />
          )}

          <div className="coin-detail-info-section">
            <div className="coin-detail-info-controls">
              <button
                className={`coin-detail-info-tab-button ${detailTab === 'detail' ? 'active' : ''}`}
                onClick={() => setDetailTab('detail')}
              >
                상세 내용
              </button>
              <button
                className={`coin-detail-info-tab-button ${detailTab === 'memo' ? 'active' : ''}`}
                onClick={() => setDetailTab('memo')}
              >
                뉴스
              </button>
            </div>

            <div className="coin-detail-info-wrapper">
              {detailTab === 'detail' ? (
                // 상세 내용 탭: 날짜 선택 여부에 따라 현재 데이터 또는 선택된 날짜 데이터 표시
                <>
                  {selectedDateData ? (
                    // 선택된 날짜 데이터 표시
                    <>
                    <div className="coin-detail-info-details">
                    <div className="coin-detail-info-headline">
                          {formatDate(selectedDateData.candleDateTimeKst)}
                          <HelpIcon tooltip={`선택된 시점의 상세 가격 정보를 표시합니다. 
                                                ${coin.exchange || 'UPBIT'} 거래소의 가격 정보를 기반으로 합니다.

                                                차트에서 빈공간을 클릭하면 현재 데이터로 전환되어 
                                                현재 일자의 실시간 상세 정보를 볼 수 있습니다.`} />
                    </div>
                    <div className="coin-detail-info-details-content">
                          <div className="coin-detail-info-details-left">
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label">전날 대비 가격 변화율</span>
                              <span className={`coin-detail-info-detail-value ${(selectedDateData.changeRate || 0) >= 0 ? 'positive' : 'negative'}`}>
                                {formatChangeRate(selectedDateData.changeRate)}
                              </span>
                            </div>
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label">전날 대비 가격 변화액</span>
                              <span className={`coin-detail-info-detail-value ${(selectedDateData.changePrice || 0) >= 0 ? 'positive' : 'negative'}`}>
                                {(selectedDateData.changePrice || 0) >= 0 ? '+' : ''}{formatPrice(selectedDateData.changePrice)}원
                              </span>
                            </div>
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label">누적 거래량</span>
                              <span className="coin-detail-info-detail-value">{formatPrice(selectedDateData.candleAccTradeVolume)} {marketCode.split('-')[1]}</span>
                            </div>
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label">누적 거래액</span>
                              <span className="coin-detail-info-detail-value">{formatPrice(selectedDateData.candleAccTradePrice)}원</span>
                            </div>
                          </div>
                          <div className="coin-detail-info-details-right">
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label"></span>
                              <span className="coin-detail-info-detail-value">-</span>
                            </div>
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label">일일 변동율</span>
                              <span className="coin-detail-info-detail-value">
                                {(() => {
                                  const rangeRate = calculateRangeRate(selectedDateData.highPrice, selectedDateData.lowPrice, selectedDateData.prevClosingPrice);
                                  return rangeRate !== null ? `${rangeRate.toFixed(2)}%` : '-';
                                })()}
                              </span>
                            </div>
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label">일일 변동액</span>
                              <span className="coin-detail-info-detail-value">
                                {formatPrice(calculateDailyRange(selectedDateData.highPrice, selectedDateData.lowPrice))}원
                              </span>
                            </div>
                            <div className="coin-detail-info-detail-row">
                              <span className="coin-detail-info-detail-label">일일 평균 거래 단가</span>
                              <span className="coin-detail-info-detail-value">
                                {(() => {
                                  const avgPrice = calculateAvgTradePrice(selectedDateData.candleAccTradePrice, selectedDateData.candleAccTradeVolume);
                                  return avgPrice !== null ? `${formatPrice(avgPrice)}원` : '-';
                                })()}
                              </span>
                            </div>
                          </div>
                            </div>
                          </div>
                        </>
                      ) : (
                    // 현재 데이터 표시 (웹소켓 실시간 데이터)
                    <>
                        <div className="coin-detail-info-details">
                          <div className="coin-detail-info-headline">
                            {formatTodayDate()}
                            <HelpIcon tooltip={`현재 시점의 상세 가격 정보를 표시합니다. 
                                              ${coin.exchange || 'UPBIT'} 거래소의 실시간 가격을 기반으로, 10초마다 렌더링합니다. 

                                              차트에서 날짜를 클릭하면 과거 데이터로 전환되어 
                                              해당 일자의 상세 정보를 볼 수 있습니다.`} />
                          </div>
                          <div className="coin-detail-info-details-content">
                            {!hasData || !priceData ? (
                              <div className="coin-detail-info-details-unsupported">지원하지 않는 종목입니다.</div>
                            ) : (
                            <>
                            <div className="coin-detail-info-details-left">
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">전날 대비 가격 변화율</span>
                                <span className={`coin-detail-info-detail-value ${(priceData.signedChangeRate !== undefined ? priceData.signedChangeRate : priceData.changeRate || 0) >= 0 ? 'positive' : 'negative'}`}>
                                  {formatChangeRate(priceData.signedChangeRate !== undefined ? priceData.signedChangeRate : priceData.changeRate)}
                                </span>
                  </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">전날 대비 가격 변화액</span>
                                <span className={`coin-detail-info-detail-value ${(priceData.changePrice || 0) >= 0 ? 'positive' : 'negative'}`}>
                                  {(priceData.changePrice || 0) >= 0 ? '+' : ''}{formatPrice(priceData.changePrice)}원
                                </span>
                              </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">누적 거래량</span>
                                <span className="coin-detail-info-detail-value">
                                  {priceData.accTradeVolume24h !== null && priceData.accTradeVolume24h !== undefined
                                    ? `${formatPrice(priceData.accTradeVolume24h)} ${marketCode.split('-')[1]}`
                                    : '-'}
                                </span>
                              </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">누적 거래액</span>
                                <span className="coin-detail-info-detail-value">{formatPrice(priceData.accTradePrice24h)}원</span>
                              </div>
                            </div>
                            <div className="coin-detail-info-details-right">
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label"></span>
                                <span className="coin-detail-info-detail-value">-</span>
                              </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">일일 변동율</span>
                                <span className="coin-detail-info-detail-value">
                                  {(() => {
                                    const rangeRate = calculateRangeRate(
                                      priceData.highPrice ?? null,
                                      priceData.lowPrice ?? null,
                                      priceData.prevClosingPrice ?? null
                                    );
                                    return rangeRate !== null ? `${rangeRate.toFixed(2)}%` : '-';
                                  })()}
                                </span>
                              </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">일일 변동액</span>
                                <span className="coin-detail-info-detail-value">
                                  {(() => {
                                    const dailyRange = calculateDailyRange(
                                      priceData.highPrice ?? null,
                                      priceData.lowPrice ?? null
                                    );
                                    return dailyRange !== null ? `${formatPrice(dailyRange)}원` : '-';
                                  })()}
                                </span>
                              </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">일일 평균 거래 단가</span>
                                <span className="coin-detail-info-detail-value">
                                  {(() => {
                                    const avgPrice = calculateAvgTradePrice(
                                      priceData.accTradePrice24h ?? null,
                                      priceData.accTradeVolume24h ?? null
                                    );
                                    return avgPrice !== null ? `${formatPrice(avgPrice)}원` : '-';
                                  })()}
                                </span>
                              </div>
                            </div>
                            </>
                            )}
                          </div>
                        </div>
                    </>
                  )}
                </>
              ) : (
                // 뉴스 탭
                <div className="coin-detail-news-section">
                  <div className="coin-detail-news-header">
                    {selectedDateData ? (
                      <div className="coin-detail-info-headline">
                        과거 기사 ({dateString})
                        <HelpIcon tooltip={`선택된 날짜의 암호화폐/금융 관련 뉴스를 표시합니다. 
                                              차트에서 빈공간을 클릭하면 현재 데이터로 전환되어 
                                              최신 뉴스를 볼 수 있습니다.`} />
                      </div>
                    ) : (
                      <div className="coin-detail-info-headline">
                        최신 기사 ({(() => {
                          const today = new Date();
                          const year = today.getFullYear();
                          const month = String(today.getMonth() + 1).padStart(2, '0');
                          const day = String(today.getDate()).padStart(2, '0');
                          return `${year}-${month}-${day}`;
                        })()})
                        <HelpIcon tooltip={`최신 암호화폐/금융 관련 뉴스를 표시합니다. 
                                              차트에서 날짜를 클릭하면 해당 날짜의 뉴스를 볼 수 있습니다.`} />
                      </div>
                    )}
                  </div>
                  
                  {isLoadingArticles ? (
                    <div className="coin-detail-info-placeholder">
                      로딩중 입니다.
                    </div>
                  ) : !articlesData || !articlesData.content || articlesData.content.length === 0 ? (
                    <div className="coin-detail-info-placeholder">
                      지원하지 않는 종목입니다.
                    </div>
                  ) : (
                    <>
                      <div className="coin-detail-news-list">
                        {articlesData.content.map((article) => {
                          const publishedDate = new Date(article.publishedAt);
                          const year = publishedDate.getFullYear();
                          const month = String(publishedDate.getMonth() + 1).padStart(2, '0');
                          const day = String(publishedDate.getDate()).padStart(2, '0');
                          const hours = String(publishedDate.getHours()).padStart(2, '0');
                          const minutes = String(publishedDate.getMinutes()).padStart(2, '0');
                          const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
                          
                          return (
                            <div key={article.id} className="coin-detail-news-item">
                              <a
                                href={article.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="coin-detail-news-link"
                              >
                                <div className="coin-detail-news-title">{article.headline}</div>
                                {article.summary && (
                                  <div className="coin-detail-news-summary">{article.summary}</div>
                                )}
                                <div className="coin-detail-news-meta">
                                  {article.reporterName ? (
                                    <span className="coin-detail-news-reporter">
                                      {article.reporterName} <span className="coin-detail-news-publisher">({article.publisherName})</span>
                                    </span>
                                  ) : (
                                    <span className="coin-detail-news-publisher">{article.publisherName}</span>
                                  )}
                                  <span className="coin-detail-news-date">{formattedDate}</span>
                                </div>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                      
                      {articlesData.totalPages > 1 && (
                        <div className="coin-detail-news-pagination">
                          <button
                            className="coin-detail-news-pagination-button"
                            onClick={() => setNewsPage(Math.max(0, newsPage - 1))}
                            disabled={articlesData.first || isLoadingArticles}
                          >
                            이전
                          </button>
                          <div className="coin-detail-news-pagination-info">
                            {newsPage + 1} / {articlesData.totalPages}
                          </div>
                          <button
                            className="coin-detail-news-pagination-button"
                            onClick={() => setNewsPage(Math.min(articlesData.totalPages - 1, newsPage + 1))}
                            disabled={articlesData.last || isLoadingArticles}
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 공포/탐욕 지수: 상세 내용 탭 */}
          {detailTab === 'detail' && (
            <div className="coin-detail-fear-greed-gauge">
              <div className="coin-detail-fear-greed-gauge-container">
                <div className="coin-detail-fear-greed-gauge-label">
                  공포/탐욕 지수
                  <HelpIcon tooltip={`공포/탐욕 지수는 암호화폐 시장의 '투자자 심리'를 
                                      0 부터 100 까지의 수치로 나타내는 지표입니다. 
                                      이 지표는 시장의 과열 또는 침체 상태를 판단하는 데 도움이 됩니다.

                                      차트에서 날짜를 선택하면 해당 날짜의 지수를 확인할 수 있으며, 
                                      이는 해당 날짜의 전체 시장 참여자의 심리를 반영하는 지표입니다.`} />
                </div>
                <div className="coin-detail-fear-greed-gauge-content">
                  {selectedDateData ? (
                    // 선택된 날짜의 Fear & Greed 데이터 표시
                    isDateBeforeMinDate ? (
                      // 2018년 2월 1일 이전 날짜: 블라인드 처리 및 메시지 표시
                      <>
                        <div className="coin-detail-fear-greed-gauge-placeholder">
                          해당 날짜의 공포/탐욕 지수가 존재하지 않습니다.
                        </div>
                        <div className="coin-detail-fear-greed-gauge-wrapper blurred">
                          <div className="coin-detail-fear-greed-gauge-semicircle">
                            <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                              <defs>
                                <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={gradientColors.start} />
                                  <stop offset="100%" stopColor={gradientColors.end} />
                                </linearGradient>
                              </defs>
                              <path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke="url(#fearGreedGradientSelected)"
                                strokeWidth="12"
                                strokeLinecap="round"
                              />
                              <g
                                transform="rotate(-90 100 100)"
                                style={{ color: 'var(--foreground)' }}
                              >
                                <line
                                  x1="100"
                                  y1="100"
                                  x2="100"
                                  y2="20"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <circle
                                  cx="100"
                                  cy="100"
                                  r="6"
                                  fill="currentColor"
                                />
                              </g>
                            </svg>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-scale">
                            <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                            <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-value">-</div>
                          <div className="coin-detail-fear-greed-gauge-range">-</div>
                        </div>
                      </>
                    ) : !isLoadingFearGreed && !fearGreedData ? (
                      // 데이터가 없을 때 블라인드 처리 및 메시지 표시
                      <>
                        <div className="coin-detail-fear-greed-gauge-placeholder">
                          해당 날짜의 공포/탐욕 지수가 존재하지 않습니다.
                        </div>
                        <div className="coin-detail-fear-greed-gauge-wrapper blurred">
                          <div className="coin-detail-fear-greed-gauge-semicircle">
                            <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                              <defs>
                                <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={gradientColors.start} />
                                  <stop offset="100%" stopColor={gradientColors.end} />
                                </linearGradient>
                              </defs>
                              <path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke="url(#fearGreedGradientSelected)"
                                strokeWidth="12"
                                strokeLinecap="round"
                              />
                              <g
                                transform="rotate(-90 100 100)"
                                style={{ color: 'var(--foreground)' }}
                              >
                                <line
                                  x1="100"
                                  y1="100"
                                  x2="100"
                                  y2="20"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <circle
                                  cx="100"
                                  cy="100"
                                  r="6"
                                  fill="currentColor"
                                />
                              </g>
                            </svg>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-scale">
                            <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                            <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-value">-</div>
                          <div className="coin-detail-fear-greed-gauge-range">-</div>
                        </div>
                      </>
                    ) : displayFearGreedData ? (
                      <div className="coin-detail-fear-greed-gauge-wrapper">
                        <div className="coin-detail-fear-greed-gauge-semicircle">
                          <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                            <defs>
                              <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradientColors.start} />
                                <stop offset="100%" stopColor={gradientColors.end} />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 20 100 A 80 80 0 0 1 180 100"
                              fill="none"
                              stroke="url(#fearGreedGradientSelected)"
                              strokeWidth="12"
                              strokeLinecap="round"
                            />
                            <g
                              transform={`rotate(${(displayFearGreedData.value / 100) * 180 - 90} 100 100)`}
                              style={{ color: 'var(--foreground)' }}
                            >
                              <line
                                x1="100"
                                y1="100"
                                x2="100"
                                y2="20"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="6"
                                fill="currentColor"
                              />
                            </g>
                          </svg>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-scale">
                          <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                          <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-value">{displayFearGreedData.value}</div>
                        <div 
                          className="coin-detail-fear-greed-gauge-range"
                          style={{
                            color: getRangeColor(displayFearGreedData.value)
                          }}
                        >
                          {displayFearGreedData.value <= 24 && '극단적 공포'}
                          {displayFearGreedData.value >= 25 && displayFearGreedData.value <= 44 && '공포'}
                          {displayFearGreedData.value >= 45 && displayFearGreedData.value <= 54 && '중립'}
                          {displayFearGreedData.value >= 55 && displayFearGreedData.value <= 74 && '탐욕'}
                          {displayFearGreedData.value >= 75 && '극단적 탐욕'}
                        </div>
                      </div>
                    ) : (
                      <div className="coin-detail-fear-greed-gauge-wrapper">
                        <div className="coin-detail-fear-greed-gauge-semicircle">
                          <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                            <defs>
                              <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradientColors.start} />
                                <stop offset="100%" stopColor={gradientColors.end} />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 20 100 A 80 80 0 0 1 180 100"
                              fill="none"
                              stroke="url(#fearGreedGradientSelected)"
                              strokeWidth="12"
                              strokeLinecap="round"
                            />
                            <g
                              transform="rotate(-90 100 100)"
                              style={{ color: 'var(--foreground)' }}
                            >
                              <line
                                x1="100"
                                y1="100"
                                x2="100"
                                y2="20"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="6"
                                fill="currentColor"
                              />
                            </g>
                          </svg>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-scale">
                          <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                          <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-value">-</div>
                        <div className="coin-detail-fear-greed-gauge-range">-</div>
                      </div>
                    )
                  ) : fearGreedTodayData ? (
                    // 현재 데이터의 Fear & Greed 표시
                  <div className="coin-detail-fear-greed-gauge-wrapper">
                    <div className="coin-detail-fear-greed-gauge-semicircle">
                      <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                        {/* 반원형 배경 그라데이션 */}
                        <defs>
                            <linearGradient id="fearGreedGradientToday" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={gradientColors.start} />
                            <stop offset="100%" stopColor={gradientColors.end} />
                          </linearGradient>
                        </defs>
                        {/* 반원형 게이지 배경 */}
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                            stroke="url(#fearGreedGradientToday)"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        {/* 바늘 */}
                        <g
                            transform={`rotate(${(fearGreedTodayData.value / 100) * 180 - 90} 100 100)`}
                          style={{ color: 'var(--foreground)' }}
                        >
                          <line
                            x1="100"
                            y1="100"
                            x2="100"
                            y2="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="100"
                            cy="100"
                            r="6"
                            fill="currentColor"
                          />
                        </g>
                      </svg>
                    </div>
                    <div className="coin-detail-fear-greed-gauge-scale">
                      <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                      <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                    </div>
                      <div className="coin-detail-fear-greed-gauge-value">{fearGreedTodayData.value}</div>
                    <div 
                      className="coin-detail-fear-greed-gauge-range"
                      style={{
                          color: getRangeColor(fearGreedTodayData.value)
                      }}
                    >
                        {fearGreedTodayData.value <= 24 && '극단적 공포'}
                        {fearGreedTodayData.value >= 25 && fearGreedTodayData.value <= 44 && '공포'}
                        {fearGreedTodayData.value >= 45 && fearGreedTodayData.value <= 54 && '중립'}
                        {fearGreedTodayData.value >= 55 && fearGreedTodayData.value <= 74 && '탐욕'}
                        {fearGreedTodayData.value >= 75 && '극단적 탐욕'}
                      </div>
                    </div>
                  ) : (
                    <div className="coin-detail-fear-greed-gauge-wrapper">
                      <div className="coin-detail-fear-greed-gauge-semicircle">
                        <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                          <defs>
                            <linearGradient id="fearGreedGradientToday" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor={gradientColors.start} />
                              <stop offset="100%" stopColor={gradientColors.end} />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="url(#fearGreedGradientToday)"
                            strokeWidth="12"
                            strokeLinecap="round"
                          />
                          <g
                            transform="rotate(-90 100 100)"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <line
                              x1="100"
                              y1="100"
                              x2="100"
                              y2="20"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r="6"
                              fill="currentColor"
                            />
                          </g>
                        </svg>
                      </div>
                      <div className="coin-detail-fear-greed-gauge-scale">
                        <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                        <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                      </div>
                      <div className="coin-detail-fear-greed-gauge-value">-</div>
                      <div className="coin-detail-fear-greed-gauge-range">-</div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* 롱/숏 비율: 상세 내용 탭 */}
          {detailTab === 'detail' && (
            <div className="coin-detail-long-short">
              <div className="coin-detail-long-short-container">
                <div className="coin-detail-long-short-header">
                  <div className="coin-detail-long-short-label">
                    롱/숏 비율
                    <HelpIcon tooltip={`암호화폐 시장은 선물 거래의 영향을 크게 받고, 
                                        선물 거래는 롱숏 포지션을 통해 이루어집니다.

                                        롱 포지션 비율이 높으면 상승 기대감이 크고, 
                                        숏 포지션 비율이 높으면 하락 우려가 큰 것으로 해석할 수 있습니다.
                                        
                                        최신 30개의 데이터를 제공하며,
                                        'Binance의 상위 20% 트레이더(마진 잔고 기준)의 선물 거래 포지션 비중'을 따릅니다.`} />
                  </div>
                  <div className="coin-detail-info-controls">
                    {(['1h', '4h', '12h', '1d'] as LongShortPeriod[]).map((period) => (
                      <button
                        key={period}
                        className={`coin-detail-info-tab-button ${longShortPeriod === period ? 'active' : ''}`}
                        onClick={() => setLongShortPeriod(period)}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="coin-detail-long-short-content">
                  {isLoadingLongShort ? (
                    <div className="coin-detail-long-short-loading">로딩중 입니다.</div>
                  ) : longShortData.length > 0 ? (
                    <>
                      {/* 가장 최신 데이터: 가로 막대 그래프 */}
                      {(() => {
                        const latestData = longShortData[longShortData.length - 1];
                        return latestData && (
                          <div className="coin-detail-long-short-latest">
                            <div className="coin-detail-long-short-latest-label">
                              {(() => {
                                const date = new Date(latestData.timestamp);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = date.getHours();
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                const ampm = hours >= 12 ? '오후' : '오전';
                                const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                                return `${year}-${month}-${day} ${ampm} ${String(displayHours).padStart(2, '0')}:${minutes}`;
                              })()} (기준)
                            </div>
                            <div className="coin-detail-long-short-latest-bar">
                              {/* 막대 위쪽: % 값 */}
                              <div className="coin-detail-long-short-bar-labels-top">
                                <span 
                                  className="coin-detail-long-short-bar-label-top"
                                  style={{ color: 'var(--price-up)' }}
                                >
                                  {(parseFloat(latestData.longAccount) * 100).toFixed(1)}%
                                </span>
                                <span 
                                  className="coin-detail-long-short-bar-label-top"
                                  style={{ color: 'var(--price-down)' }}
                                >
                                  {(parseFloat(latestData.shortAccount) * 100).toFixed(1)}%
                                </span>
                              </div>
                              {/* 막대 그래프 */}
                              <div className="coin-detail-long-short-bar-container">
                                <div 
                                  className="coin-detail-long-short-bar-long"
                                  style={{
                                    width: `${(parseFloat(latestData.longAccount) * 100).toFixed(1)}%`
                                  }}
                                />
                                <div 
                                  className="coin-detail-long-short-bar-short"
                                  style={{
                                    width: `${(parseFloat(latestData.shortAccount) * 100).toFixed(1)}%`
                                  }}
                                />
                              </div>
                              {/* 막대 하단: 롱/숏 포지션 텍스트 */}
                              <div className="coin-detail-long-short-bar-labels-bottom">
                                <span className="coin-detail-long-short-bar-label-bottom">
                                  롱 포지션
                                </span>
                                <span className="coin-detail-long-short-bar-label-bottom">
                                  숏 포지션
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* 최근 30개 데이터: 세로 막대 그래프 */}
                      <div className="coin-detail-long-short-chart">
                        <div className="coin-detail-long-short-chart-bars">
                          {longShortData.slice(-30).map((item, index) => {
                            const longPercent = parseFloat(item.longAccount) * 100;
                            const shortPercent = parseFloat(item.shortAccount) * 100;
                            const maxHeight = 100;
                            const date = new Date(item.timestamp);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            const dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}`;
                            const longAccountPercent = (parseFloat(item.longAccount) * 100).toFixed(2);
                            const shortAccountPercent = (parseFloat(item.shortAccount) * 100).toFixed(2);
                            const longShortRatio = parseFloat(item.longShortRatio).toFixed(2);
                            const isHovered = hoveredBarIndex === index;
                            
                            return (
                              <div 
                                key={index} 
                                className="coin-detail-long-short-chart-bar-group"
                                onMouseEnter={() => setHoveredBarIndex(index)}
                                onMouseLeave={() => {
                                  setHoveredBarIndex(null);
                                  setMousePosition(null);
                                }}
                                onMouseMove={(e) => {
                                  const chartBars = e.currentTarget.closest('.coin-detail-long-short-chart-bars');
                                  const chartBarsRect = chartBars?.getBoundingClientRect();
                                  if (chartBarsRect) {
                                    setMousePosition({
                                      x: e.clientX - chartBarsRect.left,
                                      y: e.clientY - chartBarsRect.top
                                    });
                                  }
                                }}
                              >
                                <div className="coin-detail-long-short-chart-bar-wrapper">
                                  <div 
                                    className="coin-detail-long-short-chart-bar-long"
                                    style={{
                                      height: `${(longPercent / 100) * maxHeight}%`
                                    }}
                                  />
                                  <div 
                                    className="coin-detail-long-short-chart-bar-short"
                                    style={{
                                      height: `${(shortPercent / 100) * maxHeight}%`
                                    }}
                                  />
                                </div>
                                {isHovered && mousePosition && (
                                  <TooltipPositioner
                                    mouseX={mousePosition.x}
                                    mouseY={mousePosition.y}
                                    dateTimeString={dateTimeString}
                                    longAccountPercent={longAccountPercent}
                                    shortAccountPercent={shortAccountPercent}
                                    longShortRatio={longShortRatio}
                                  />
                                )}
                                <div className="coin-detail-long-short-chart-time">
                                  {hours}:{minutes}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="coin-detail-long-short-empty">
                      롱/숏 비율 데이터가 없습니다.
                    </div>
                  )}
                </div>
              </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}

