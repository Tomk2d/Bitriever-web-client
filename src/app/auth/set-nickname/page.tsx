'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { Input, Button } from '@/shared/components/ui';
import { authService } from '@/features/auth/services/authService';
import { setUser } from '@/store/slices/authSlice';
import { assetService } from '@/features/asset/services/assetService';
import './SetNicknamePage.css';

export default function SetNicknamePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [nickname, setNickname] = useState('');
  const [errors, setErrors] = useState<{ nickname?: string }>({});
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNicknameAvailable, setIsNicknameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // 토큰이 없으면 로그인 페이지로 리다이렉트
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
    }
  }, [router]);

  const validateNickname = (value: string): boolean => {
    const newErrors: { nickname?: string } = {};

    if (!value) {
      newErrors.nickname = '닉네임을 입력해주세요.';
    } else if (value.length < 2) {
      newErrors.nickname = '닉네임은 최소 2자 이상이어야 합니다.';
    } else if (value.length > 20) {
      newErrors.nickname = '닉네임은 최대 20자까지 입력할 수 있습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckNickname = async () => {
    if (!validateNickname(nickname)) {
      return;
    }

    setIsChecking(true);
    try {
      const isAvailable = await authService.checkNicknameAvailable(nickname);
      setIsNicknameAvailable(isAvailable);
      
      if (!isAvailable) {
        setErrors({ nickname: '이미 사용 중인 닉네임입니다.' });
      } else {
        setErrors({});
      }
    } catch (error: any) {
      setErrors({ 
        nickname: error.message || '닉네임 중복 확인에 실패했습니다.' 
      });
      setIsNicknameAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateNickname(nickname)) {
      return;
    }

    if (isNicknameAvailable !== true) {
      setErrors({ nickname: '닉네임 중복 확인을 해주세요.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 닉네임 설정
      await authService.setNickname(nickname);

      // 전체 사용자 정보 가져오기
      const userData = await authService.getCurrentUser();
      
      // Redux에 전체 사용자 정보 저장
      dispatch(setUser({
        userId: userData.id,
        email: userData.email,
        nickname: userData.nickname,
        profileUrl: userData.profileUrl ?? null,
        connectedExchanges: userData.connectedExchanges || [],
      }));
      
      // 자산 동기화 (is_connect_exchange가 true이고 connected_exchanges가 null이 아닐 때만)
      if (userData.isConnectExchange === true && 
          userData.connectedExchanges && 
          userData.connectedExchanges.length > 0) {
        assetService.syncAssets().catch((error) => {
          console.error('자산 동기화 실패:', error);
        });
      }

      // 메인 페이지로 리다이렉트
      router.push('/');
    } catch (error: any) {
      setErrors({ 
        nickname: error.message || '닉네임 설정에 실패했습니다.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="set-nickname-page">
      <div className="set-nickname-container">
        <div className="set-nickname-box">
          <h1 className="set-nickname-title">닉네임 설정</h1>
          
          <p className="set-nickname-description">
            사용할 닉네임을 입력해주세요.
          </p>

          <form onSubmit={handleSubmit} className="set-nickname-form">
            <div className="nickname-form-group">
              <div className="nickname-input-wrapper">
                <div className="nickname-input-container">
                  <Input
                    type="text"
                    placeholder="닉네임을 입력하세요"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setIsNicknameAvailable(null);
                      setErrors({});
                    }}
                    error={errors.nickname}
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleCheckNickname}
                  disabled={isChecking || isSubmitting || !nickname}
                  className="button button-primary button-size-md nickname-check-button"
                >
                  {isChecking ? '확인 중...' : '중복 확인'}
                </Button>
              </div>
              
              {errors.nickname && (
                <p className="error-message-text">
                  {errors.nickname}
                </p>
              )}
              
              {isNicknameAvailable === true && (
                <p className="nickname-success-message">
                  사용 가능한 닉네임입니다.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isNicknameAvailable !== true}
              className="button button-primary button-size-md submit-button"
            >
              {isSubmitting ? '설정 중...' : '회원가입 완료'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
