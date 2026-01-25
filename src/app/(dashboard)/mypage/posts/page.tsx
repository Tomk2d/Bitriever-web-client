'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { communityService } from '@/features/community/services/communityService';
import type { CommunityListResponse } from '@/features/community/types';

export default function MyPostsPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [posts, setPosts] = useState<CommunityListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!user?.userId) return;
      
      try {
        setIsLoading(true);
        // 전체 게시글을 가져와서 클라이언트에서 필터링 (임시 방식)
        // TODO: 서버에서 사용자별 게시글 API 구현 후 변경
        const response = await communityService.getAll(undefined, page, 50);
        const myPosts = response.content.filter(
          (post) => post.authorId === user.userId
        );
        
        if (page === 0) {
          setPosts(myPosts);
        } else {
          setPosts((prev) => [...prev, ...myPosts]);
        }
        
        setHasMore(!response.last);
      } catch (error) {
        console.error('게시글을 불러오는데 실패했습니다:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyPosts();
  }, [user?.userId, page]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePostClick = (postId: number) => {
    router.push(`/communities/${postId}`);
  };

  return (
    <div className="mypage-page">
      <div className="mypage-page-header">
        <h1 className="mypage-page-title">내가 쓴 게시글</h1>
        <p className="mypage-page-description">작성한 게시글을 확인하고 관리할 수 있습니다.</p>
      </div>

      <div className="mypage-card">
        {isLoading && posts.length === 0 ? (
          <div className="mypage-empty">
            <div className="mypage-empty-text">로딩 중...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="mypage-empty">
            <div className="mypage-empty-icon">📝</div>
            <div className="mypage-empty-text">작성한 게시글이 없습니다.</div>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div
                key={post.id}
                className="mypage-list-item"
                style={{ cursor: 'pointer' }}
                onClick={() => handlePostClick(post.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: 500, 
                    color: 'var(--foreground)',
                    marginBottom: '4px'
                  }}>
                    {post.title}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--foreground)', 
                    opacity: 0.5 
                  }}>
                    {formatDate(post.createdAt)} · 조회 {post.viewCount} · 좋아요 {post.likeCount}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--main-color)',
                  backgroundColor: 'rgba(2, 162, 98, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  {post.category}
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                className="mypage-button mypage-button-secondary"
                style={{ width: '100%', marginTop: '16px' }}
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoading}
              >
                {isLoading ? '로딩 중...' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
