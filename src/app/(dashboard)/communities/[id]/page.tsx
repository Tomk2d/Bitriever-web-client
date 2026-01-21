'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useCommunityComments } from '@/features/community/hooks/useCommunityComments';
import { communityService } from '@/features/community/services/communityService';
import { communityCommentService } from '@/features/community/services/communityCommentService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseContentToText } from '@/features/community/utils/contentParser';
import { Category, ReactionType } from '@/features/community/types';
import { CommentList, CommentForm } from '@/features/community/components';
import { useState, useRef, useEffect } from 'react';
import './page.css';

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id ? parseInt(String(params.id)) : null;
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [commentSortOrder, setCommentSortOrder] = useState<'asc' | 'desc'>('asc'); // 'asc': 등록순, 'desc': 최신순

  const { data: community, isLoading, error } = useCommunity(id);
  const { data: commentsData } = useCommunityComments(id, 0, 100);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const reactionMutation = useMutation({
    mutationFn: async ({ reactionType, remove }: { reactionType?: string; remove?: boolean }) => {
      if (!id) throw new Error('Community ID is required');
      if (remove) {
        await communityService.removeReaction(id);
      } else if (reactionType) {
        await communityService.addReaction(id, reactionType);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Community ID is required');
      await communityService.delete(id);
    },
    onSuccess: () => {
      // 게시글 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      // 성공 메시지 표시 후 이동
      alert('게시글이 삭제되었습니다.');
      router.push('/communities');
    },
    onError: (error: any) => {
      // 삭제 실패 시 에러 메시지 표시
      const errorMessage = error?.response?.data?.message || error?.message || '게시글 삭제에 실패했습니다.';
      alert(errorMessage);
    },
  });

  const handleReaction = (reactionType: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    const currentReaction = community?.userReaction;
    if (currentReaction === reactionType) {
      reactionMutation.mutate({ remove: true });
    } else {
      reactionMutation.mutate({ reactionType });
    }
  };

  const handleDelete = () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const handleEdit = () => {
    if (id) {
      router.push(`/communities/edit/${id}`);
    }
  };

  const handleBack = () => {
    // 게시글 목록 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['communities'] });
    router.push('/communities');
  };

  if (isLoading) {
    return <div className="community-detail-loading">로딩 중...</div>;
  }

  if (error || !community) {
    return <div className="community-detail-error">게시글을 불러오는데 실패했습니다.</div>;
  }

  const isAuthor = isAuthenticated && user && user.userId === community.userId;
  const contentText = parseContentToText(community.content);

  return (
    <div className="container mx-auto pt-8 pb-8">
      <div className="community-detail">
        {/* 뒤로가기 버튼 */}
        <button onClick={handleBack} className="community-detail-back-button">
          &lt;
        </button>
        <div className="community-detail-main">
          {/* 헤더 */}
          <div className="community-detail-header">
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="community-category">{categoryLabel(community.category)}</span>
              {isAuthenticated && (
                <div className="community-detail-actions" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="community-detail-menu-button"
                  >
                    ⋯
                  </button>
                  {dropdownOpen && (
                    <div className="community-detail-dropdown">
                      {isAuthor ? (
                        <>
                          <button 
                            onClick={handleEdit} 
                            className="dropdown-item edit"
                            disabled={deleteMutation.isPending}
                          >
                            수정
                          </button>
                          <button 
                            onClick={handleDelete} 
                            className="dropdown-item delete"
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => {/* TODO: 신고 기능 구현 */}} className="dropdown-item report">
                          신고
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 제목 */}
          <h1 className="community-detail-title">{community.title}</h1>

          {/* 내용 */}
          <div className="community-detail-content">
            <CommunityContentDisplay content={community.content} communityId={community.id} />
          </div>

          {/* 해시태그 */}
          {community.hashtags && community.hashtags.length > 0 && (
            <div className="community-detail-hashtags">
              {community.hashtags.map((tag, index) => (
                <span key={index} className="hashtag">#{tag}</span>
              ))}
            </div>
          )}

          {/* 좋아요/싫어요 */}
          <div className="community-detail-reactions">
            <button
              onClick={() => handleReaction(ReactionType.LIKE)}
              className={`reaction-button reaction-up ${community.userReaction === ReactionType.LIKE ? 'active' : ''}`}
              disabled={!isAuthenticated}
            >
              <span className="reaction-icon">▲</span>
              <span className="reaction-count">{community.likeCount || 0}</span>
            </button>
            <button
              onClick={() => handleReaction(ReactionType.DISLIKE)}
              className={`reaction-button reaction-down ${community.userReaction === ReactionType.DISLIKE ? 'active' : ''}`}
              disabled={!isAuthenticated}
            >
              <span className="reaction-icon">▼</span>
              <span className="reaction-count">{community.dislikeCount || 0}</span>
            </button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="community-detail-comments">
          {isAuthenticated && (
            <CommentForm communityId={community.id} userNickname={user?.nickname} />
          )}
          <div className="comments-title-wrapper">
            <h3 className="comments-title">댓글 {commentsData?.totalElements || 0}개</h3>
            <button
              onClick={() => setCommentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="comment-sort-button"
            >
              {commentSortOrder === 'asc' ? '등록순' : '최신순'}
            </button>
          </div>
          {commentsData && (
            <CommentList 
              comments={commentSortOrder === 'asc' 
                ? [...commentsData.content].sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateA - dateB;
                  }).map(comment => ({
                    ...comment,
                    replies: comment.replies ? [...comment.replies].sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateA - dateB;
                    }) : comment.replies
                  }))
                : [...commentsData.content].map(comment => ({
                    ...comment,
                    replies: comment.replies ? [...comment.replies].sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateA - dateB;
                    }) : comment.replies
                  }))
              } 
              communityId={community.id}
              communityAuthorId={community.userId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CommunityContentDisplay({ content, communityId }: { content?: string; communityId: number }) {
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
      return <div className="content-text">{content}</div>;
    }

    return (
      <div className="content-blocks">
        {parsed.blocks.map((block: any, index: number) => {
          if (block.type === 'text') {
            return (
              <div key={index} className="content-text" style={{ whiteSpace: 'pre-wrap' }}>
                {block.content}
              </div>
            );
          } else if (block.type === 'image' && block.path) {
            const filename = block.path.split('/').pop() || '';
            const imageUrl = communityService.getImageUrl(communityId, filename);
            return (
              <img
                key={index}
                src={imageUrl}
                alt="게시글 이미지"
                className="content-image"
                onLoad={(e) => {
                  // 이미지 로드 후 원본 크기 유지
                  const img = e.target as HTMLImageElement;
                  const naturalWidth = img.naturalWidth;
                  const naturalHeight = img.naturalHeight;
                  
                  // 컨테이너 너비를 초과하지 않도록 조정
                  const containerWidth = 900; // .community-detail max-width
                  const maxDisplayWidth = containerWidth - 0; // padding 고려
                  
                  if (naturalWidth > maxDisplayWidth) {
                    img.style.width = `${maxDisplayWidth}px`;
                    img.style.height = 'auto';
                  } else {
                    img.style.width = `${naturalWidth}px`;
                    img.style.height = `${naturalHeight}px`;
                  }
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            );
          }
          return null;
        })}
      </div>
    );
  } catch {
    return <div className="content-text">{content}</div>;
  }
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
