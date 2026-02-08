import Link from 'next/link';
import './page.css';

const CATEGORY_LINKS = [
  {
    id: 'market',
    title: '마켓',
    description: '실시간 코인 시세와 시장 지표를 한눈에 확인하세요.',
    highlight: 'KRW/BTC/USDT 마켓, 보유 종목 필터, 인디케이터',
    href: '/coins',
  },
  {
    id: 'diaries',
    title: '매매일지',
    description: '거래 내역과 감정을 날짜별로 기록하고 돌아볼 수 있습니다.',
    highlight: '캘린더, 이미지 첨부, 태그, 매매 심리 기록',
    href: '/diaries',
  },
  {
    id: 'feed',
    title: '피드',
    description: '투자자 커뮤니티와 최신 뉴스를 한 곳에서 모아봅니다.',
    highlight: '커뮤니티 글, 손익 인증, 차트 분석, 뉴스 피드',
    href: '/communities',
  },
  {
    id: 'asset-analysis',
    title: '자산 분석',
    description: '포트폴리오 수익률과 리스크를 심층적으로 분석해 드립니다.',
    highlight: '총 자산, 수익률, 수익률 분포, 거래 패턴 분석',
    href: '/asset-analysis',
  },
];

export default function Home() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            여러 거래소의 가상자산을
            <br />
            한 번에 관리하고 분석하세요
          </h1>
          <p className="landing-hero-description">
            업비트, 코인원 등에 흩어진 자산을 Bitriever에서 한 번에 조회하고,
            실시간 마켓·매매일지·자산 분석·커뮤니티를 통해 더 나은 투자 결정을
            내리세요.
          </p>
          <div className="landing-hero-cta">
            <Link href="/(auth)/signup" className="landing-cta landing-cta-primary">
              무료로 시작하기
            </Link>
            <Link
              href="/(dashboard)/asset-analysis"
              className="landing-cta landing-cta-secondary"
            >
              자산 분석 데모 보기
            </Link>
          </div>
          <p className="landing-hero-caption">
            로그인 후 거래소를 연동하면, 포트폴리오와 매매 내역 분석을 바로
            이용할 수 있어요.
          </p>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-hero-dashboard">
            <div className="landing-hero-dashboard-header">
              <span className="landing-pill">포트폴리오 요약</span>
              <span className="landing-hero-dashboard-label">오늘 기준</span>
            </div>
            <div className="landing-hero-dashboard-grid">
              <div className="landing-hero-stat-card">
                <p className="landing-hero-stat-label">총 자산 가치</p>
                <p className="landing-hero-stat-value">₩ 128,450,000</p>
                <p className="landing-hero-stat-sub">전일 대비 +3.2%</p>
              </div>
              <div className="landing-hero-stat-card">
                <p className="landing-hero-stat-label">누적 수익</p>
                <p className="landing-hero-stat-value">+₩ 18,230,000</p>
                <p className="landing-hero-stat-sub">승률 61%</p>
              </div>
              <div className="landing-hero-stat-card">
                <p className="landing-hero-stat-label">보유 코인 수</p>
                <p className="landing-hero-stat-value">23개</p>
                <p className="landing-hero-stat-sub">3개 거래소 연동</p>
              </div>
              <div className="landing-hero-mini-chart">
                <p className="landing-hero-mini-chart-title">최근 30일 수익률</p>
                <div className="landing-hero-mini-chart-lines">
                  <span className="landing-hero-mini-chart-line landing-hero-mini-chart-line-primary" />
                  <span className="landing-hero-mini-chart-line landing-hero-mini-chart-line-secondary" />
                </div>
                <p className="landing-hero-mini-chart-caption">
                  우상향 포트폴리오를 목표로, 흐름을 한눈에 파악하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">Bitriever가 해결하는 문제</h2>
        <p className="landing-section-subtitle">
          여러 거래소, 제각각의 앱과 화면 속에서 흩어진 자산과 거래 기록을
          한 곳에 모아, 투자 흐름을 명확하게 보여줍니다.
        </p>
        <div className="landing-value-grid">
          <article className="landing-card">
            <h3 className="landing-card-title">여러 거래소 자산을 한 화면에서</h3>
            <p className="landing-card-body">
              거래소마다 다른 평가액과 잔고를 일일이 확인하지 않고,
              Bitriever에서 전체 포트폴리오를 한 번에 조회합니다.
            </p>
          </article>
          <article className="landing-card">
            <h3 className="landing-card-title">실시간 마켓과 시장 인디케이터</h3>
            <p className="landing-card-body">
              실시간 코인 시세와 Fear &amp; Greed Index, Long/Short Ratio 등
              시장 심리 지표를 함께 보며 진입·청산 타이밍을 고민할 수 있습니다.
            </p>
          </article>
          <article className="landing-card">
            <h3 className="landing-card-title">거래 기록과 감정을 남기는 매매일지</h3>
            <p className="landing-card-body">
              거래 내역과 연동된 캘린더, 이미지 첨부, 태그, 심리 상태 기록을
              통해 나만의 투자 패턴을 발견합니다.
            </p>
          </article>
          <article className="landing-card">
            <h3 className="landing-card-title">포트폴리오 성과와 리스크 분석</h3>
            <p className="landing-card-body">
              수익률 분포, 코인별 비중, 거래 빈도와 승률을 분석해,
              어디에 과도하게 몰려 있는지, 어떤 습관을 고쳐야 할지 인사이트를
              제공합니다.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-section landing-feature-section">
        <div className="landing-feature-header">
          <div className="landing-feature-copy">
            <h2 className="landing-section-title">화면으로 미리 보는 Bitriever</h2>
            <p className="landing-section-subtitle">
              마켓, 매매일지, 피드, 자산 분석 네 가지 영역이 함께 돌아가는 투자
              환경을 상상해 보세요.
            </p>
            <p className="landing-feature-subcopy">
              Bitriever의 마켓, 매매일지, 피드, 자산 분석을 지금 바로 살펴보세요.
            </p>
          </div>
          <ul className="landing-feature-list">
            <li className="landing-feature-item">
              <span className="landing-feature-label">실시간 마켓</span>
              <span className="landing-feature-text">
                KRW/BTC/USDT 마켓과 보유 종목을 중심으로, 가격·변동률·거래대금을
                한눈에 보는 화면입니다.
              </span>
            </li>
            <li className="landing-feature-item">
              <span className="landing-feature-label">매매일지 캘린더</span>
              <span className="landing-feature-text">
                날짜별 거래 내역과 일지를 함께 보며, 어떤 날 어떤 생각으로
                매매했는지 돌아볼 수 있습니다.
              </span>
            </li>
            <li className="landing-feature-item">
              <span className="landing-feature-label">자산 분석 대시보드</span>
              <span className="landing-feature-text">
                총 자산 가치, 누적 수익, 승률과 수익률 분포를 차트로 보여주는
                포트폴리오 분석 화면입니다.
              </span>
            </li>
            <li className="landing-feature-item">
              <span className="landing-feature-label">투자자 피드와 뉴스</span>
              <span className="landing-feature-text">
                투자자 글과 손익 인증, 차트 분석, 최신 뉴스를 한 번에 확인할 수
                있는 화면입니다.
              </span>
            </li>
          </ul>
        </div>

        <div className="landing-category-grid">
          {CATEGORY_LINKS.map((category) => (
            <Link
              key={category.id}
              href={category.href}
              className="landing-category-link"
            >
              <article className="landing-category-card">
                <span className="landing-category-pill">{category.title}</span>
                <h3 className="landing-category-title">{category.title}</h3>
                <p className="landing-category-description">
                  {category.description}
                </p>
                <p className="landing-category-highlight">
                  {category.highlight}
                </p>
                <span className="landing-category-cta">
                  {category.title} 보러 가기
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-section landing-faq-section">
        <h2 className="landing-section-title">자주 묻는 질문</h2>
        <div className="landing-faq-list">
          <details className="landing-faq-item">
            <summary className="landing-faq-question">
              거래소 연동은 어떻게 이루어지나요?
            </summary>
            <p className="landing-faq-answer">
              Bitriever는 거래소에서 발급한 API 키를 통해 잔고와 거래 데이터를
              읽어옵니다. 주문 실행 권한은 사용하지 않으며, 자세한 방법은
              마이페이지 &gt; 거래소 연동 메뉴에서 확인할 수 있습니다.
            </p>
          </details>
          <details className="landing-faq-item">
            <summary className="landing-faq-question">
              내 자산과 거래 내역은 안전하게 보관되나요?
            </summary>
            <p className="landing-faq-answer">
              자산 데이터와 거래 내역은 암호화 및 접근 통제를 거쳐 보관되며,
              서비스 제공 목적 이외에는 사용하지 않습니다. 보안 관련 자세한
              내용은 추후 별도의 보안 문서와 함께 안내될 예정입니다.
            </p>
          </details>
          <details className="landing-faq-item">
            <summary className="landing-faq-question">
              서비스는 무료인가요? 유료 요금제가 생기나요?
            </summary>
            <p className="landing-faq-answer">
              현재 Bitriever는 핵심 기능을 중심으로 서비스를 준비 중이며,
              추후 고급 분석 기능에 대해 유료 요금제가 도입될 수 있습니다.
              구체적인 정책은 정식 오픈 전에 공지할 예정입니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
