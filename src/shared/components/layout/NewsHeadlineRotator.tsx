'use client';

import { useEffect, useState } from 'react';
import { useLatestArticles } from '@/features/articles/hooks/useArticles';
import './NewsHeadlineRotator.css';

export default function NewsHeadlineRotator() {
  const { data: articlesData, isLoading } = useLatestArticles(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const articles = articlesData?.content || [];

  useEffect(() => {
    if (articles.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % articles.length);
    }, 3000); // 3초마다 변경

    return () => clearInterval(interval);
  }, [articles.length]);

  if (isLoading || articles.length === 0) {
    return null;
  }

  const currentArticle = articles[currentIndex];

  return (
    <div className="news-headline-rotator">
      <div className="news-headline-container">
        <a
          href={currentArticle.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="news-headline-text"
          key={currentIndex}
        >
          {currentArticle.headline}
        </a>
      </div>
    </div>
  );
}

