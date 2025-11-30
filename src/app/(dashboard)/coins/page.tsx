'use client';

import CoinList from '@/shared/components/coins/CoinList';
import './page.css';

export default function CoinsPage() {
  return (
    <div className="coins-page">
      <CoinList />
    </div>
  );
}

