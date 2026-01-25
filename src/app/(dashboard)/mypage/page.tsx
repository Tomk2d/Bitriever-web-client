'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { authService } from '@/features/auth/services/authService';
import type { UserResponse } from '@/features/auth/types';

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const [userInfo, setUserInfo] = useState<UserResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await authService.getCurrentUser();
        setUserInfo(data);
      } catch (error) {
        console.error('사용자 정보를 가져오는데 실패했습니다:', error);
      }
    };
    fetchUserInfo();
  }, []);

  const handleSave = async () => {
    // TODO: 닉네임 변경 API 호출
    setIsEditing(false);
  };

  const getSignupTypeLabel = (signupType: number | null, snsProvider: number | null) => {
    // signupType: 0 = 이메일가입, 1 = SNS 가입
    if (signupType === 0) {
      return '이메일';
    }
    if (signupType === 1) {
      // snsProvider: 1 = Naver, 2 = Kakao, 3 = Google, 4 = Apple
      switch (snsProvider) {
        case 1: return '네이버';
        case 2: return '카카오';
        case 3: return '구글';
        case 4: return '애플';
        default: return 'SNS';
      }
    }
    return '-';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProfileImageUrl = (profileUrl: string | null | undefined) => {
    if (!profileUrl) return '/profile/profile1.png';
    return `/profile${profileUrl}.png`;
  };

  return (
    <div className="mypage-page">
      <div className="mypage-page-header">
        <h1 className="mypage-page-title">프로필</h1>
      </div>

      <div className="mypage-card">
        <div className="mypage-profile-header">
          <img 
            src={getProfileImageUrl(userInfo?.profileUrl || user?.profileUrl)} 
            alt="프로필" 
            className="mypage-profile-image"
          />
          <div className="mypage-profile-info">
            <div className="mypage-profile-name">{userInfo?.nickname || user?.nickname || '-'}</div>
            <div className="mypage-profile-email">{userInfo?.email || user?.email || '-'}</div>
          </div>
        </div>
      </div>

      <div className="mypage-card">
        <h3 className="mypage-card-title">기본 정보</h3>
        
        <div className="mypage-form-group">
          <label className="mypage-form-label">이메일</label>
          <div className="mypage-form-value">{userInfo?.email || user?.email || '-'}</div>
        </div>

        <div className="mypage-form-group">
          <div className="mypage-form-label-row">
            <label className="mypage-form-label">닉네임</label>
            {!isEditing && (
              <button
                type="button"
                className="mypage-edit-icon"
                onClick={() => setIsEditing(true)}
                title="닉네임 수정"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="mypage-edit-row">
              <input
                type="text"
                className="mypage-form-input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
              />
              <button className="mypage-button mypage-button-small" onClick={handleSave}>
                저장
              </button>
              <button
                className="mypage-button mypage-button-secondary mypage-button-small"
                onClick={() => {
                  setIsEditing(false);
                  setNickname(user?.nickname || '');
                }}
              >
                취소
              </button>
            </div>
          ) : (
            <div className="mypage-form-value">{userInfo?.nickname || user?.nickname || '-'}</div>
          )}
        </div>

        <div className="mypage-form-group">
          <label className="mypage-form-label">로그인 타입</label>
          <div className="mypage-form-value">{getSignupTypeLabel(userInfo?.signupType ?? null, userInfo?.snsProvider ?? null)}</div>
        </div>

        <div className="mypage-form-group">
          <label className="mypage-form-label">가입일자</label>
          <div className="mypage-form-value">{formatDate(userInfo?.createdAt)}</div>
        </div>
      </div>

      <div className="mypage-card">
        <h3 className="mypage-card-title">계정 관리</h3>
        <p style={{ 
          fontSize: '14px', 
          color: 'var(--foreground)', 
          opacity: 0.6,
          marginBottom: '16px' 
        }}>
          계정 삭제 시 모든 데이터가 영구적으로 삭제됩니다.
        </p>
        <button 
          className="mypage-button"
          style={{ backgroundColor: '#dc3545' }}
          onClick={() => {
            // TODO: 계정 삭제 확인 모달
            alert('계정 삭제 기능은 준비 중입니다.');
          }}
        >
          계정 삭제
        </button>
      </div>
    </div>
  );
}
