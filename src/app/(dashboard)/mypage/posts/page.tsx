'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { useMyPosts } from '@/features/community/hooks/useCommunities';
import { Category, ReactionType } from '@/features/community/types';
import type { CommunityListResponse } from '@/features/community/types';
import { communityService } from '@/features/community/services/communityService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import '../../communities/page.css';

const PAGE_SIZE = 10;

function getProfileImageUrl(profileUrl: string | null | undefined) {
  if (!profileUrl) return '/profile/profile1.png';
  return `/profile${profileUrl}.png`;
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

function getThumbnailInfo(thumbnailImageUrl: string, communityId: number): React.ReactElement {
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

export default function MyPostsPage() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const [page, setPage] = useState(0);
  const [allPosts, setAllPosts] = useState<CommunityListResponse[]>([]);
  const lastAppendedPageRef = useRef(-1);

  const { data, isLoading, error } = useMyPosts(page, PAGE_SIZE, !!user?.userId);

  // 페이지 데이터가 오면 누적: 0페이지는 교체, 1이상은 이어붙이기
  useEffect(() => {
    if (!data?.content) return;
    if (page === 0) {
      lastAppendedPageRef.current = 0;
      setAllPosts(data.content);
    } else if (page > lastAppendedPageRef.current) {
      lastAppendedPageRef.current = page;
      setAllPosts((prev) => [...prev, ...data.content]);
    }
  }, [data, page]);

  const hasMore = data ? !data.last : false;
  const isLoadingMore = isLoading && page > 0;

  const reactionMutation = useMutation({
    mutationFn: async ({ id, reactionType, remove }: { id: number; reactionType?: string; remove?: boolean }) => {
      if (remove) {
        await communityService.removeReaction(id);
      } else if (reactionType) {
        await communityService.addReaction(id, reactionType);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities', 'my'] });
      setPage(0);
      setAllPosts([]);
      lastAppendedPageRef.current = -1;
    },
  });

  return (
    <div className="mypage-page">
      <div className="mypage-page-header">
        <h1 className="mypage-page-title">내가 쓴 피드</h1>
        <p className="mypage-page-description">작성한 피드를 확인하고 관리할 수 있습니다.</p>
      </div>

      <div className="mypage-card mypage-card-posts">
        {!user?.userId ? (
          <div className="mypage-empty">
            <div className="mypage-empty-text">로그인 후 이용해 주세요.</div>
          </div>
        ) : isLoading && !data ? (
          <div className="communities-loading">로딩 중...</div>
        ) : error ? (
          <div className="communities-error">게시글을 불러오는데 실패했습니다.</div>
        ) : allPosts.length === 0 && !isLoading ? (
          <div className="mypage-empty">
            <div className="mypage-empty-text">작성한 피드글이 없습니다.</div>
          </div>
        ) : (
          <>
            <div className="communities-list">
              {allPosts.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.id}`}
                  className="community-card"
                >
                  <div className="community-card-header">
                    <div className="community-card-user-info">
                      <img
                        src={getProfileImageUrl(community.userProfileUrl)}
                        alt="프로필"
                        className="community-profile-img"
                      />
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
                        <p className="community-content-preview">{community.previewText}</p>
                      )}
                      {community.hashtags && community.hashtags.length > 0 && (
                        <div className="community-hashtags">
                          {community.hashtags.map((tag, index) => (
                            <span key={index} className="hashtag">
                              #{tag}
                            </span>
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
                          if (!isAuthenticated) return;
                          if (community.userReaction === ReactionType.LIKE) {
                            reactionMutation.mutate({ id: community.id, remove: true });
                          } else {
                            reactionMutation.mutate({ id: community.id, reactionType: ReactionType.LIKE });
                          }
                        }}
                        className={`reaction-button reaction-up ${community.userReaction === ReactionType.LIKE ? 'active' : ''}`}
                        disabled={!isAuthenticated}
                      >
                        <span className="reaction-icon">▲</span>
                        <span className="reaction-count">{community.likeCount ?? 0}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isAuthenticated) return;
                          if (community.userReaction === ReactionType.DISLIKE) {
                            reactionMutation.mutate({ id: community.id, remove: true });
                          } else {
                            reactionMutation.mutate({ id: community.id, reactionType: ReactionType.DISLIKE });
                          }
                        }}
                        className={`reaction-button reaction-down ${community.userReaction === ReactionType.DISLIKE ? 'active' : ''}`}
                        disabled={!isAuthenticated}
                      >
                        <span className="reaction-icon">▼</span>
                        <span className="reaction-count">{community.dislikeCount ?? 0}</span>
                      </button>
                      <div className="community-comment-count">
                        <span className="comment-icon">💬</span>
                        <span className="comment-count">{community.commentCount ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {hasMore && (
              <button
                type="button"
                className="mypage-posts-load-more"
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? '로딩 중...' : '더보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
