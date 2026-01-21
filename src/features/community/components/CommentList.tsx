'use client';

import { useAppSelector } from '@/store/hooks';
import CommentItem from './CommentItem';
import type { CommunityCommentResponse } from '../types';
import './CommentList.css';

interface CommentListProps {
  comments: CommunityCommentResponse[];
  communityId: number;
  communityAuthorId?: string;
}

export default function CommentList({ comments, communityId, communityAuthorId }: CommentListProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!comments || comments.length === 0) {
    return (
      <div className="comment-list-empty">
        댓글이 없습니다. 첫 댓글을 작성해보세요!
      </div>
    );
  }

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          communityId={communityId}
          isAuthenticated={isAuthenticated}
          communityAuthorId={communityAuthorId}
        />
      ))}
    </div>
  );
}
