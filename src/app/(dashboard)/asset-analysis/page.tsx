'use client';

import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useAssetAnalysis } from '@/features/asset-analysis/hooks/useAssetAnalysis';
import SummaryCards from '@/features/asset-analysis/components/SummaryCards';
import AssetValueTrendChart from '@/features/asset-analysis/components/AssetValueTrendChart';
import ProfitDistributionChart from '@/features/asset-analysis/components/ProfitDistributionChart';
import CoinHoldingChart from '@/features/asset-analysis/components/CoinHoldingChart';
import TradingFrequencyChart from '@/features/asset-analysis/components/TradingFrequencyChart';
import TradingStyleCard from '@/features/asset-analysis/components/TradingStyleCard';
import MonthlyInvestmentChart from '@/features/asset-analysis/components/MonthlyInvestmentChart';
import TopCoinsList from '@/features/asset-analysis/components/TopCoinsList';
import PsychologyAnalysis from '@/features/asset-analysis/components/PsychologyAnalysis';
import RiskAnalysis from '@/features/asset-analysis/components/RiskAnalysis';
import PortfolioRiskSummary from '@/features/asset-analysis/components/PortfolioRiskSummary';
import './page.css';

export default function AssetAnalysisPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const connectedExchanges = useAppSelector((state) => state.auth.user?.connectedExchanges || []);
  const hasConnectedExchange = connectedExchanges.length > 0;

  const { data, isLoading, error } = useAssetAnalysis();

  if (isLoading) {
    return (
      <div className="asset-analysis-page">
        <div className="asset-analysis-loading">
          <p>자산 분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="asset-analysis-page">
        <div className="asset-analysis-error">
          <p>자산 분석 데이터를 불러오는 중 오류가 발생했습니다.</p>
          <p className="asset-analysis-error-message">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="asset-analysis-page">
        <div className="asset-analysis-empty">
          {!isAuthenticated ? (
            <>
              <p className="asset-analysis-empty-text">로그인 후 이용해주세요.</p>
              <button
                type="button"
                className="wallet-asset-list-connect-button asset-analysis-empty-button"
                onClick={() => router.push('/login')}
              >
                로그인
              </button>
            </>
          ) : !hasConnectedExchange ? (
            <>
              <p className="asset-analysis-empty-text">거래소 연동 후 이용해주세요.</p>
              <button
                type="button"
                className="wallet-asset-list-connect-button asset-analysis-empty-button"
                onClick={() => router.push('/mypage/exchanges')}
              >
                거래소 연동하기
              </button>
            </>
          ) : (
            <p className="asset-analysis-empty-text">자산 분석 데이터가 없습니다.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="asset-analysis-page">
      {/* 주요 지표 */}
      <div className="asset-analysis-section">
        <SummaryCards metrics={data.summaryMetrics} />
      </div>

      <div className="asset-analysis-content-wrapper">
        {/* 1단계: 핵심 지표 */}
        <div className="asset-analysis-section">
          <div className="asset-analysis-grid asset-analysis-grid-elevated">
            <div className="asset-analysis-card asset-analysis-card-elevated">
              <h3 className="asset-analysis-card-title">포트폴리오 구성</h3>
              <CoinHoldingChart data={data.coinHoldings} />
              <PortfolioRiskSummary data={data.riskAnalysis} />
            </div>
            <div className="asset-analysis-card asset-analysis-card-elevated">
              <h3 className="asset-analysis-card-title">수익률 분포</h3>
              <ProfitDistributionChart data={data.profitDistribution} />
            </div>
          </div>
        </div>

        {/* 가장 많이 벌어준/잃게 한 종목 */}
        <div className="asset-analysis-section">
          <div className="asset-analysis-card asset-analysis-card-full asset-analysis-card-elevated asset-analysis-card-full-tight">
            <TopCoinsList data={data.topCoins} />
          </div>
        </div>

        {/* 2단계: 패턴 분석 */}
        <div className="asset-analysis-section">
          <TradingFrequencyChart data={data.tradingFrequency} />
          <div className="asset-analysis-card asset-analysis-card-elevated">
            <h3 className="asset-analysis-card-title">월별 투자 현황</h3>
            <MonthlyInvestmentChart data={data.monthlyInvestment} />
          </div>
        </div>

        <div className="asset-analysis-section">
          <PsychologyAnalysis data={data.psychologyAnalysis} />
        </div>
      </div>
    </div>
  );
}
