'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';
import { communityCommentService } from '../services/communityCommentService';
import { ReactionType } from '../types';
import CommentForm from './CommentForm';
import './CommentItem.css';

interface CommentItemProps {
  comment: {
    id: number;
    userId: string;
    userNickname?: string;
    userProfileUrl?: string;
    content: string;
    likeCount?: number;
    dislikeCount?: number;
    userReaction?: string | null;
    replies?: CommentItemProps['comment'][];
    deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  communityId: number;
  isAuthenticated: boolean;
  depth?: number;
  communityAuthorId?: string;
}

export default function CommentItem({ comment, communityId, isAuthenticated, depth = 0, communityAuthorId }: CommentItemProps) {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getProfileImageUrl = (profileUrl: string | null | undefined) => {
    if (!profileUrl) return '/profile/profile1.png';
    return `/profile${profileUrl}.png`;
  };
  const [editContent, setEditContent] = useState(comment.content);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const isAuthor = isAuthenticated && user && user.userId === comment.userId;
  const maxDepth = 2;

  const handleReaction = async (reactionType: string) => {
    if (!isAuthenticated) return;
    
    try {
      const currentReaction = comment.userReaction;
      if (currentReaction === reactionType) {
        await communityCommentService.removeReaction(communityId, comment.id);
      } else {
        await communityCommentService.addReaction(communityId, comment.id, reactionType);
      }
      queryClient.invalidateQueries({ queryKey: ['community-comments', communityId] });
    } catch (error) {
      console.error('댓글 반응 처리 실패:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await communityCommentService.deleteComment(communityId, comment.id);
      queryClient.invalidateQueries({ queryKey: ['community-comments', communityId] });
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleEdit = async () => {
    try {
      await communityCommentService.updateComment(communityId, comment.id, { content: editContent });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['community-comments', communityId] });
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleReplySuccess = () => {
    setIsReplying(false);
    queryClient.invalidateQueries({ queryKey: ['community-comments', communityId] });
  };

  return (
    <div className={`comment-item ${depth > 0 ? 'comment-reply' : ''}`} style={{ marginLeft: depth > 0 ? 36 : 0 }}>
      <div className="comment-item-header">
        <div className="comment-card-user-info">
          <img 
            src={getProfileImageUrl(comment.userProfileUrl)} 
            alt="프로필" 
            className="comment-profile-img"
          />
          <div className="comment-user-details">
            <span className="comment-author">{comment.userNickname || '익명'}</span>
            <span className="comment-date">
              {comment.createdAt ? formatDate(comment.createdAt) : ''}
            </span>
            {communityAuthorId && comment.userId === communityAuthorId && (
              <span className="comment-author-badge">작성자</span>
            )}
          </div>
        </div>
        {isAuthor && !isEditing && (
          <div className="comment-detail-actions" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="comment-detail-menu-button"
            >
              ⋯
            </button>
            {dropdownOpen && (
              <div className="comment-detail-dropdown">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setDropdownOpen(false);
                  }}
                  className="comment-dropdown-item edit"
                >
                  수정
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setDropdownOpen(false);
                  }}
                  className="comment-dropdown-item delete"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="comment-edit-form">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="comment-edit-textarea"
            rows={3}
          />
          <div className="comment-edit-actions">
            <button onClick={handleEdit} className="comment-edit-save">저장</button>
            <button onClick={() => setIsEditing(false)} className="comment-edit-cancel">취소</button>
          </div>
        </div>
      ) : (
        <div className="comment-content">
          {comment.deleted ? (
            <span className="comment-deleted">삭제된 댓글입니다.</span>
          ) : (
            <p>{comment.content}</p>
          )}
        </div>
      )}

      {!comment.deleted && (
        <div className="comment-item-footer">
          <div className="comment-reactions">
            <button
              onClick={() => handleReaction(ReactionType.LIKE)}
              className={`comment-reaction-button reaction-up ${comment.userReaction === ReactionType.LIKE ? 'active' : ''}`}
              disabled={!isAuthenticated}
            >
              <span className="comment-reaction-icon">▲</span>
              <span className="comment-reaction-count">{comment.likeCount || 0}</span>
            </button>
            <button
              onClick={() => handleReaction(ReactionType.DISLIKE)}
              className={`comment-reaction-button reaction-down ${comment.userReaction === ReactionType.DISLIKE ? 'active' : ''}`}
              disabled={!isAuthenticated}
            >
              <span className="comment-reaction-icon">▼</span>
              <span className="comment-reaction-count">{comment.dislikeCount || 0}</span>
            </button>
          </div>
          {isAuthenticated && depth < maxDepth - 1 && (
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="comment-action-button"
            >
              답글
            </button>
          )}
        </div>
      )}

      {isReplying && (
        <div className="comment-reply-form">
          <CommentForm
            communityId={communityId}
            parentId={comment.id}
            onSuccess={handleReplySuccess}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {/* 대댓글 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              communityId={communityId}
              isAuthenticated={isAuthenticated}
              depth={depth + 1}
              communityAuthorId={communityAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}
