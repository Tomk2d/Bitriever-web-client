'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { authService } from '@/features/auth/services/authService';
import type { UserResponse } from '@/features/auth/types';

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [userInfo, setUserInfo] = useState<UserResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileUrl, setSelectedProfileUrl] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const PROFILE_OPTIONS = ['/profile1', '/profile2', '/profile3', '/profile4', '/profile5', '/profile6'] as const;

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
    const trimmed = nickname.trim();
    setNicknameError(null);

    const currentNick = userInfo?.nickname || user?.nickname || '';
    if (trimmed === currentNick) {
      setIsEditing(false);
      return;
    }

    if (trimmed.length < 2) {
      setNicknameError('닉네임은 최소 2자 이상이어야 합니다.');
      return;
    }

    setIsSavingNickname(true);
    try {
      const available = await authService.checkNicknameAvailable(trimmed);
      if (!available) {
        setNicknameError('이미 사용 중인 닉네임입니다.');
        setIsSavingNickname(false);
        return;
      }
      await authService.setNickname(trimmed);
      const data = await authService.getCurrentUser();
      setUserInfo(data);
      dispatch(setUser({
        userId: data.id,
        email: data.email,
        nickname: data.nickname,
        profileUrl: data.profileUrl,
        connectedExchanges: data.connectedExchanges ?? [],
      }));
      setNickname(data.nickname);
      setIsEditing(false);
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : '닉네임 저장에 실패했습니다.');
    } finally {
      setIsSavingNickname(false);
    }
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

  const handleOpenProfileModal = () => {
    setSelectedProfileUrl(userInfo?.profileUrl || user?.profileUrl || '/profile1');
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    if (isSavingProfile) return;
    setIsProfileModalOpen(false);
    setSelectedProfileUrl(null);
  };

  const handleSaveProfile = async () => {
    if (selectedProfileUrl == null) return;
    const current = userInfo?.profileUrl || user?.profileUrl || '/profile1';
    if (selectedProfileUrl === current) {
      handleCloseProfileModal();
      return;
    }
    setIsSavingProfile(true);
    try {
      await authService.setProfileUrl(selectedProfileUrl);
      const data = await authService.getCurrentUser();
      setUserInfo(data);
      dispatch(setUser({
        userId: data.id,
        email: data.email,
        nickname: data.nickname,
        profileUrl: data.profileUrl,
        connectedExchanges: data.connectedExchanges ?? [],
      }));
      handleCloseProfileModal();
    } catch (error) {
      console.error('프로필 변경 실패:', error);
      alert(error instanceof Error ? error.message : '프로필 변경에 실패했습니다.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== '삭제') {
      setDeleteError('"삭제"를 정확히 입력해주세요.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // TODO: 계정 삭제 API 호출
      // await userService.deleteMe();
      // 이후 로그아웃 및 메인 페이지 이동 등 처리
      alert('계정 삭제 기능은 준비 중입니다.');
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
      // router.push('/'); // 실제 삭제 구현 시 적절한 경로로 이동
    } catch (error) {
      console.error('계정 삭제 중 오류가 발생했습니다:', error);
      setDeleteError('계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mypage-page">
      <div className="mypage-page-header">
        <h1 className="mypage-page-title">프로필</h1>
      </div>

      <div className="mypage-card">
        <div className="mypage-profile-header">
          <button
            type="button"
            className="mypage-profile-image-button"
            onClick={handleOpenProfileModal}
            title="프로필 이미지 변경"
            aria-label="프로필 이미지 변경"
          >
            <img
              src={getProfileImageUrl(userInfo?.profileUrl || user?.profileUrl)}
              alt="프로필"
              className="mypage-profile-image"
            />
          </button>
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
                onClick={() => {
                  setNicknameError(null);
                  setIsEditing(true);
                }}
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
            <>
              <div className="mypage-edit-row">
                <input
                  type="text"
                  className={`mypage-form-input${nicknameError ? ' mypage-form-input--error' : ''}`}
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (nicknameError) setNicknameError(null);
                  }}
                  autoFocus
                  aria-invalid={!!nicknameError}
                  aria-describedby={nicknameError ? 'nickname-error' : undefined}
                />
                <button
                  className="mypage-button mypage-button-small"
                  onClick={handleSave}
                  disabled={isSavingNickname}
                >
                  {isSavingNickname ? '저장 중...' : '저장'}
                </button>
                <button
                  className="mypage-button mypage-button-secondary mypage-button-small"
                  onClick={() => {
                    setIsEditing(false);
                    setNickname(userInfo?.nickname || user?.nickname || '');
                    setNicknameError(null);
                  }}
                  disabled={isSavingNickname}
                >
                  취소
                </button>
              </div>
              {nicknameError && (
                <p id="nickname-error" className="mypage-form-error" role="alert">
                  {nicknameError}
                </p>
              )}
            </>
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
          className="mypage-button mypage-button-danger"
          style={{ padding: '6px 12px' }}
          type="button"
          onClick={handleOpenDeleteModal}
        >
          계정 삭제
        </button>
      </div>

      {isProfileModalOpen && selectedProfileUrl !== null && (
        <div className="mypage-modal-overlay" onClick={handleCloseProfileModal} role="presentation">
          <div
            className="mypage-modal mypage-profile-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            {isSavingProfile && (
              <div className="mypage-profile-modal-loading" aria-live="polite">
                <div className="mypage-profile-modal-loading-spinner" />
                <span className="mypage-profile-modal-loading-text">저장 중...</span>
              </div>
            )}
            <h3 id="profile-modal-title" className="mypage-modal-title">프로필 이미지 선택</h3>
            <div className="mypage-profile-grid">
              {PROFILE_OPTIONS.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={`mypage-profile-option${selectedProfileUrl === url ? ' mypage-profile-option--selected' : ''}`}
                  onClick={() => setSelectedProfileUrl(url)}
                  aria-pressed={selectedProfileUrl === url}
                  aria-label={`프로필 ${url.replace('/profile', '')} 선택`}
                >
                  <img src={getProfileImageUrl(url)} alt="" width={56} height={56} />
                </button>
              ))}
            </div>
            <div className="mypage-modal-actions">
              <button
                type="button"
                className="mypage-button mypage-button-secondary"
                onClick={handleCloseProfileModal}
                disabled={isSavingProfile}
              >
                취소
              </button>
              <button
                type="button"
                className="mypage-button mypage-button-small"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--background)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
              margin: '0 20px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--foreground)',
              }}
            >
              정말로 계정을 삭제하시겠습니까?
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '13px',
                color: 'var(--foreground)',
                opacity: 0.75,
                lineHeight: 1.5,
              }}
            >
              계정 삭제 시 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
              <br />
              아래 입력란에 <strong>삭제</strong>를 입력하신 후 확인을 눌러주세요.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mypage-delete-confirm-input"
              placeholder="삭제"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 19, 43, 0.16)',
                marginBottom: deleteError ? 8 : 16,
                fontFamily: 'Pretendard, sans-serif',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
              }}
            />
            {deleteError && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: '12px',
                  color: '#ef4444',
                }}
              >
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: 8 }}>
              <button
                type="button"
                className="mypage-button mypage-button-danger"
                style={{ flex: 1, padding: '9px 18px' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
              <button
                type="button"
                className="mypage-button mypage-button-secondary"
                style={{ flex: 1, padding: '9px 18px' }}
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
