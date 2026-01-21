export type CommunityContentBlock = 
  | { type: 'text'; content: string }
  | { type: 'image'; path: string };

export interface ParsedCommunityContent {
  blocks: CommunityContentBlock[];
}

export enum Category {
  FREE = 'FREE',
  GOOD_BAD_NEWS = 'GOOD_BAD_NEWS',
  PROFIT_PROOF = 'PROFIT_PROOF',
  CHART_ANALYSIS = 'CHART_ANALYSIS',
  NEWS = 'NEWS',
}

export enum ReactionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export interface CommunityRequest {
  category: string;
  title: string;
  content?: string;
  hashtags?: string[];
}

export interface CommunityResponse {
  id: number;
  userId: string;
  userNickname?: string;
  category: string;
  title: string;
  content?: string;
  hashtags?: string[];
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunityListResponse {
  id: number;
  userId: string;
  userNickname?: string;
  category: string;
  title: string;
  hashtags?: string[];
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: string | null;
  thumbnailImageUrl?: string;
  previewText?: string;
  createdAt?: string;
}

export interface CommunityCommentRequest {
  content: string;
  parentId?: number | null;
}

export interface CommunityCommentResponse {
  id: number;
  communityId: number;
  userId: string;
  userNickname?: string;
  parentId?: number | null;
  content: string;
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: string | null;
  replies?: CommunityCommentResponse[];
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunityReactionRequest {
  reactionType: string;
}

export interface CommunitySearchRequest {
  category?: string;
  hashtags?: string[];
  searchType?: 'SINGLE' | 'MULTIPLE_AND' | 'MULTIPLE_OR';
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
