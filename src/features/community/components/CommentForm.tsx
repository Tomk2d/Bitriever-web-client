'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { communityCommentService } from '../services/communityCommentService';
import './CommentForm.css';

interface CommentFormProps {
  communityId: number;
  parentId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialContent?: string;
  userNickname?: string;
  userProfileUrl?: string | null;
}

export default function CommentForm({ communityId, parentId, onSuccess, onCancel, initialContent = '', userNickname, userProfileUrl }: CommentFormProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getProfileImageUrl = (profileUrl: string | null | undefined) => {
    if (!profileUrl) return '/profile/profile1.png';
    return `/profile${profileUrl}.png`;
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    adjustTextareaHeight();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await communityCommentService.createComment(communityId, {
        content: content.trim(),
        parentId: parentId || null,
      });
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['community-comments', communityId] });
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <div className="comment-form-wrapper">
        <div className="comment-form-profile">
          <img 
            src={getProfileImageUrl(userProfileUrl)} 
            alt="프로필" 
            className="comment-profile-img"
          />
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder={parentId ? '대댓글을 입력하세요...' : userNickname ? `${userNickname} 님의 의견을 입력해주세요.` : '댓글을 입력하세요...'}
          className="comment-form-textarea"
          rows={1}
          disabled={isSubmitting}
        />
      </div>
      <div className="comment-form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="comment-form-cancel"
            disabled={isSubmitting}
          >
            취소
          </button>
        )}
        <button
          type="submit"
          className="comment-form-submit"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? '작성 중...' : '댓글 작성'}
        </button>
      </div>
    </form>
  );
}
