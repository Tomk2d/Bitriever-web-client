'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useCommunities } from '@/features/community/hooks/useCommunities';
import { Category, ReactionType } from '@/features/community/types';
import { communityService } from '@/features/community/services/communityService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLatestArticles } from '@/features/articles/hooks/useArticles';
import Link from 'next/link';
import './page.css';

export default function CommunitiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [feedDropdownOpen, setFeedDropdownOpen] = useState(false);
  const feedDropdownRef = useRef<HTMLDivElement>(null);
  const size = 20;

  const { data, isLoading, error } = useCommunities(selectedCategory, page, size);
  
  // 뉴스 카테고리인지 확인
  const isNewsCategory = selectedCategory === Category.NEWS;
  
  // 뉴스 무한 스크롤을 위한 상태
  const [newsPage, setNewsPage] = useState(0);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const newsObserverTargetRef = useRef<HTMLDivElement>(null);
  
  // 뉴스 데이터 조회 (최신순만)
  const { data: articlesData, isLoading: isLoadingArticles } = useLatestArticles(newsPage);
  
  // 뉴스 데이터 누적
  useEffect(() => {
    if (isNewsCategory && articlesData) {
      if (newsPage === 0) {
        // 첫 페이지는 초기화
        setAllArticles(articlesData.content);
      } else {
        // 이후 페이지는 누적
        setAllArticles((prev) => [...prev, ...articlesData.content]);
      }
      setHasMoreNews(!articlesData.last);
    }
  }, [articlesData, newsPage, isNewsCategory]);
  
  // 카테고리 변경 시 뉴스 초기화
  useEffect(() => {
    if (isNewsCategory) {
      setNewsPage(0);
      setAllArticles([]);
      setHasMoreNews(true);
    }
  }, [isNewsCategory]);
  
  // 무한 스크롤: Intersection Observer
  useEffect(() => {
    if (!isNewsCategory || !hasMoreNews || isLoadingArticles) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreNews && !isLoadingArticles) {
          setNewsPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    
    const currentTarget = newsObserverTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }
    
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [isNewsCategory, hasMoreNews, isLoadingArticles]);

  const reactionMutation = useMutation({
    mutationFn: async ({ id, reactionType, remove }: { id: number; reactionType?: string; remove?: boolean }) => {
      if (remove) {
        await communityService.removeReaction(id);
      } else if (reactionType) {
        await communityService.addReaction(id, reactionType);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities', selectedCategory, page, size] });
    },
  });

  // 피드 서브카테고리 목록
  const feedSubCategories = [
    { value: undefined, label: '전체' },
    { value: Category.FREE, label: '자유' },
    { value: Category.GOOD_BAD_NEWS, label: '호재/악재' },
    { value: Category.PROFIT_PROOF, label: '손익인증' },
    { value: Category.CHART_ANALYSIS, label: '차트분석' },
  ];

  const handleCategoryChange = (category: string | undefined) => {
    setSelectedCategory(category);
    setPage(0);
    setFeedDropdownOpen(false);
  };

  const handleFeedClick = () => {
    setFeedDropdownOpen(!feedDropdownOpen);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (feedDropdownRef.current && !feedDropdownRef.current.contains(event.target as Node)) {
        setFeedDropdownOpen(false);
      }
    };

    if (feedDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [feedDropdownOpen]);

  const handleWriteClick = () => {
    router.push('/communities/write');
  };

  return (
    <div className="container mx-auto pt-8 pb-8">
      <div className="communities-page-header">
        <h3 className="text-2xl font-bold mb-6 communities-page-title">피드</h3>
      </div>
      {isAuthenticated && (
        <button
          onClick={handleWriteClick}
          className="communities-write-button"
          aria-label="글쓰기"
        >
          ✏️
        </button>
      )}

      {/* 카테고리 필터 */}
      <div className="communities-category-filter">
        {/* 피드 (드롭다운) */}
        <div className="category-tab-dropdown" ref={feedDropdownRef}>
          <button
            onClick={handleFeedClick}
            className={`category-tab ${feedSubCategories.some(sub => sub.value === selectedCategory) ? 'active' : ''}`}
          >
            피드{' '}
            <span className={`dropdown-arrow ${feedDropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          {feedDropdownOpen && (
            <div className="category-dropdown-menu">
              {feedSubCategories.map((subCategory) => (
                <button
                  key={subCategory.value || 'all'}
                  onClick={() => handleCategoryChange(subCategory.value)}
                  className={`category-dropdown-item ${selectedCategory === subCategory.value ? 'active' : ''}`}
                >
                  {subCategory.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 최신 뉴스 */}
        <button
          onClick={() => handleCategoryChange(Category.NEWS)}
          className={`category-tab ${selectedCategory === Category.NEWS ? 'active' : ''}`}
        >
          최신 뉴스
        </button>
      </div>

      {/* 게시글 목록 또는 뉴스 목록 */}
      {isNewsCategory ? (
        <div className="communities-news-list">
          {newsPage === 0 && isLoadingArticles && <div className="communities-loading">로딩 중...</div>}
          {allArticles.length === 0 && !isLoadingArticles && (
            <div className="communities-empty">뉴스가 없습니다.</div>
          )}
          {allArticles.length > 0 && (
            <div className="coin-detail-news-list">
              {allArticles.map((article) => {
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
          )}
          
          {/* 무한 스크롤 감지용 요소 */}
          {hasMoreNews && (
            <div ref={newsObserverTargetRef} className="news-observer-target">
              {isLoadingArticles && <div className="communities-loading">더 불러오는 중...</div>}
            </div>
          )}
        </div>
      ) : (
        <div className="communities-list">
          {isLoading && <div className="communities-loading">로딩 중...</div>}
          {error && <div className="communities-error">게시글을 불러오는데 실패했습니다.</div>}
          {data && (
            <>
              {data.content.length === 0 ? (
                <div className="communities-empty">게시글이 없습니다.</div>
              ) : (
                <>
                  {data.content.map((community) => (
                    <Link
                      key={community.id}
                      href={`/communities/${community.id}`}
                      className="community-card"
                    >
                      <div className="community-card-header">
                        <div className="community-card-user-info">
                          <div className="community-profile-image">
                            <span className="profile-initial">
                              {(community.userNickname || '익명').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="community-user-details">
                            <span className="community-author">{community.userNickname || '익명'}</span>
                            <span className="community-date">
                              {community.createdAt ? formatDate(community.createdAt) : ''}
                            </span>
                          </div>
                        </div>
                        <span className="community-category">{categoryLabel(community.category)}</span>
                      </div>
                      <div className="community-title-section">
                        <div className="community-title-wrapper">
                          <h4 className="community-title">{community.title}</h4>
                          {community.previewText && (
                            <p className="community-content-preview">
                              {community.previewText}
                            </p>
                          )}
                          {community.hashtags && community.hashtags.length > 0 && (
                            <div className="community-hashtags">
                              {community.hashtags.map((tag, index) => (
                                <span key={index} className="hashtag">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {community.thumbnailImageUrl && (
                          <div className="community-thumbnail">
                            {getThumbnailInfo(community.thumbnailImageUrl, community.id)}
                          </div>
                        )}
                      </div>
                      <div className="community-footer">
                        <div className="community-reactions">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isAuthenticated) {
                                router.push('/login');
                                return;
                              }
                              const currentReaction = community.userReaction;
                              if (currentReaction === ReactionType.LIKE) {
                                reactionMutation.mutate({ id: community.id, remove: true });
                              } else {
                                reactionMutation.mutate({ id: community.id, reactionType: ReactionType.LIKE });
                              }
                            }}
                            className={`reaction-button reaction-up ${community.userReaction === ReactionType.LIKE ? 'active' : ''}`}
                            disabled={!isAuthenticated}
                          >
                            <span className="reaction-icon">▲</span>
                            <span className="reaction-count">{community.likeCount || 0}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isAuthenticated) {
                                router.push('/login');
                                return;
                              }
                              const currentReaction = community.userReaction;
                              if (currentReaction === ReactionType.DISLIKE) {
                                reactionMutation.mutate({ id: community.id, remove: true });
                              } else {
                                reactionMutation.mutate({ id: community.id, reactionType: ReactionType.DISLIKE });
                              }
                            }}
                            className={`reaction-button reaction-down ${community.userReaction === ReactionType.DISLIKE ? 'active' : ''}`}
                            disabled={!isAuthenticated}
                          >
                            <span className="reaction-icon">▼</span>
                            <span className="reaction-count">{community.dislikeCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {/* 페이징 */}
              {data.totalPages > 1 && (
                <div className="communities-pagination">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={data.first}
                    className="pagination-button"
                  >
                    이전
                  </button>
                  <span className="pagination-info">
                    {page + 1} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages - 1, page + 1))}
                    disabled={data.last}
                    className="pagination-button"
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
  );
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    [Category.FREE]: '자유',
    [Category.GOOD_BAD_NEWS]: '호재/악재',
    [Category.PROFIT_PROOF]: '손익인증',
    [Category.CHART_ANALYSIS]: '차트분석',
    [Category.NEWS]: '뉴스',
  };
  return labels[category] || category;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분전`;
  if (hours < 24) return `${hours}시간전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}

function formatNewsDate(dateString: string): string {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getThumbnailInfo(thumbnailImageUrl: string, communityId: number): React.ReactElement {
  // @communityImage/{communityId}/{filename} 형식에서 filename 추출
  const filename = thumbnailImageUrl.split('/').pop() || '';
  const imageUrl = communityService.getImageUrl(communityId, filename);
  
  return (
    <div className="community-thumbnail-container">
      <img 
        src={imageUrl} 
        alt="게시글 썸네일" 
        className="community-thumbnail-image"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
