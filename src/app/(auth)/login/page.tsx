'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { Input, Button } from '@/shared/components/ui';
import { authService } from '@/features/auth/services/authService';
import { assetService } from '@/features/asset/services/assetService';
import { setUser, setUserFromAuthResponse } from '@/store/slices/authSlice';
import './LoginPage.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [isSignup, setIsSignup] = useState(false);
  
  // 로그인 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  // 회원가입 상태
  const [signupEmail, setSignupEmail] = useState('');
  const [signupNickname, setSignupNickname] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupErrors, setSignupErrors] = useState<{ 
    email?: string; 
    nickname?: string; 
    password?: string; 
    passwordConfirm?: string;
  }>({});
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameSuccessMessage, setNicknameSuccessMessage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // URL 쿼리 파라미터에서 에러 메시지 확인
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error && message) {
      // 에러 메시지 표시
      setSubmitError(decodeURIComponent(message));
      
      // URL에서 에러 파라미터 제거 (깔끔한 URL 유지)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('message');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      
      const response = await authService.login({ email: trimmedEmail, password: trimmedPassword });
      
      // Redux에 사용자 정보 저장 (로그인 응답에서)
      dispatch(setUserFromAuthResponse({
        userId: response.userId,
        email: response.email,
        nickname: response.nickname ?? '',
        profileUrl: response.profileUrl ?? '',
      }));
      
      // /api/auth/me 호출하여 전체 사용자 정보 가져오기
      try {
        const userData = await authService.getCurrentUser();
        
        // Redux에 전체 사용자 정보 저장
        dispatch(setUser({
          userId: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          profileUrl: userData.profileUrl ?? null,
          connectedExchanges: userData.connectedExchanges || [],
        }));
        
        // 자산 동기화 API 호출 (is_connect_exchange가 true이고 connected_exchanges가 null이 아닐 때만)
        if (userData.isConnectExchange === true && 
            userData.connectedExchanges && 
            userData.connectedExchanges.length > 0) {
          assetService.syncAssets().catch((error) => {
            // 에러는 조용히 처리 (로그인 플로우에는 영향 없음)
            console.error('자산 동기화 실패:', error);
          });
        }
      } catch (error) {
        // getCurrentUser 실패 시에도 로그인은 성공한 상태이므로 계속 진행
        console.error('사용자 정보 조회 실패:', error);
      }
      
      // 로그인 성공 시 렌딩 페이지로 이동
      router.push('/');
    } catch (error: any) {
      setSubmitError(
        error.message || 
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    window.location.href = '/api/auth/oauth2/kakao';
  };

  const handleNaverLogin = () => {
    window.location.href = '/api/auth/oauth2/naver';
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/oauth2/google';
  };

  // 애플 로그인은 Apple Developer Program 가입 필요 (일단 비활성화)
  // const handleAppleLogin = () => {
  //   window.location.href = '/api/auth/oauth2/apple';
  // };

  const handleSwitchToSignup = () => {
    setIsSignup(true);
    setSubmitError(null);
    setErrors({});
    setSignupErrors({});
  };

  const handleSwitchToLogin = () => {
    setIsSignup(false);
    setSubmitError(null);
    setErrors({});
    setSignupErrors({});
  };

  const handleCheckNickname = async () => {
    setNicknameSuccessMessage(null);
    
    if (!signupNickname.trim()) {
      setSignupErrors(prev => ({ ...prev, nickname: '닉네임을 입력해주세요.' }));
      return;
    }

    if (signupNickname.length < 2) {
      setSignupErrors(prev => ({ ...prev, nickname: '닉네임은 최소 2자 이상이어야 합니다.' }));
      return;
    }

    try {
      const response = await fetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(signupNickname.trim())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error?.message || '닉네임 중복 확인에 실패했습니다.');
      }

      const isAvailable = result.data;

      if (isAvailable) {
        setIsNicknameChecked(true);
        setSignupErrors(prev => ({ ...prev, nickname: undefined }));
        setNicknameSuccessMessage('사용 가능한 닉네임입니다.');
      } else {
        setIsNicknameChecked(false);
        setSignupErrors(prev => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }));
        setNicknameSuccessMessage(null);
      }
    } catch (error: any) {
      setIsNicknameChecked(false);
      setSignupErrors(prev => ({ 
        ...prev, 
        nickname: error.message || '닉네임 중복 확인에 실패했습니다.' 
      }));
      setNicknameSuccessMessage(null);
    }
  };

  const isSignupFormValid = () => {
    // 이메일 형식 검증
    const isEmailValid = signupEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail);
    
    // 닉네임 중복확인 완료
    const isNicknameValid = signupNickname.trim() && signupNickname.length >= 2 && isNicknameChecked;
    
    // 비밀번호 검증 (8자 이상, 영문+숫자+특수문자)
    const hasLetter = /[a-zA-Z]/.test(signupPassword);
    const hasNumber = /[0-9]/.test(signupPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupPassword);
    const isPasswordValid = signupPassword.length >= 8 && hasLetter && hasNumber && hasSpecial;
    
    // 비밀번호 확인 일치
    const isPasswordConfirmValid = signupPasswordConfirm && signupPassword === signupPasswordConfirm;
    
    return isEmailValid && isNicknameValid && isPasswordValid && isPasswordConfirmValid;
  };

  const validateSignupForm = () => {
    const newErrors: { 
      email?: string; 
      nickname?: string; 
      password?: string; 
      passwordConfirm?: string;
    } = {};

    if (!signupEmail.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!signupNickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요.';
    } else if (signupNickname.length < 2) {
      newErrors.nickname = '닉네임은 최소 2자 이상이어야 합니다.';
    } else if (!isNicknameChecked) {
      newErrors.nickname = '닉네임 중복 확인을 해주세요.';
    }

    if (!signupPassword) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (signupPassword.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    } else {
      // 영문, 숫자, 특수문자 조합 검증
      const hasLetter = /[a-zA-Z]/.test(signupPassword);
      const hasNumber = /[0-9]/.test(signupPassword);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupPassword);
      
      if (!hasLetter || !hasNumber || !hasSpecial) {
        newErrors.password = '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.';
      }
    }

    if (!signupPasswordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.';
    } else if (signupPassword !== signupPasswordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }

    setSignupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateSignupForm()) {
      return;
    }

    setLoading(true);
    try {
      await authService.signup({
        email: signupEmail.trim(),
        nickname: signupNickname.trim(),
        password: signupPassword,
      });
      
      // 회원가입 성공 시 로그인 화면으로 전환
      setIsSignup(false);
      setSubmitError(null);
      setSignupErrors({});
      setSignupEmail('');
      setSignupNickname('');
      setSignupPassword('');
      setSignupPasswordConfirm('');
      setIsNicknameChecked(false);
      setNicknameSuccessMessage(null);
    } catch (error: any) {
      setSubmitError(
        error.message || 
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        '회원가입에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">{isSignup ? '회원가입' : '로그인'}</h1>
          
          {!isSignup ? (
            <>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <Input
                type="email"
                label="이메일"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
            </div>
            <div className="form-group">
              <Input
                type="password"
                label="비밀번호"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
            </div>
            {submitError && (
              <div className="error-message">
                {submitError}
              </div>
            )}
            <div className="form-actions">
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className="login-submit-button"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="signup-button"
                    onClick={handleSwitchToSignup}
                  >
                    회원가입
              </Button>
            </div>
          </form>
          
          <div className="social-login">
            <div className="social-divider">
              <span>또는</span>
            </div>
            <div className="social-buttons">
              <button
                type="button"
                onClick={handleKakaoLogin}
                className="social-button-unified kakao-btn"
                aria-label="카카오 로그인"
              >
                <span className="social-icon-wrapper">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M12 3c-5.52 0-10 3.59-10 8 0 2.83 1.89 5.31 4.71 6.71-.18.67-.67 2.42-.77 2.8-.12.47.18.46.37.34.15-.1 2.42-1.64 3.4-2.31.74.11 1.51.16 2.29.16 5.52 0 10-3.59 10-8s-4.48-8-10-8z"/>
                  </svg>
                </span>
                <span className="social-text">카카오 로그인</span>
              </button>
              <button
                type="button"
                onClick={handleNaverLogin}
                className="social-button-unified naver-btn"
                aria-label="네이버 로그인"
              >
                <span className="social-icon-wrapper">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M16.273 12.845L7.376 3H4v18h3.727V12.155L16.624 21H20V3h-3.727z"/>
                  </svg>
                </span>
                <span className="social-text">네이버 로그인</span>
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="social-button-unified google-btn"
                aria-label="구글 로그인"
              >
                <span className="social-icon-wrapper">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </span>
                <span className="social-text">구글 로그인</span>
              </button>
              {/* 애플 로그인은 Apple Developer Program 가입 필요 (일단 비활성화) */}
              {/* <button
                type="button"
                onClick={handleAppleLogin}
                className="social-button-unified apple-btn"
                aria-label="애플 로그인"
              >
                <span className="social-icon-wrapper">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </span>
                <span className="social-text">Apple 로그인</span>
              </button> */}
            </div>
          </div>
            </>
          ) : (
            <form onSubmit={handleSignupSubmit} className="login-form">
              <div className="form-group">
                <Input
                  type="email"
                  label="이메일"
                  placeholder="이메일을 입력하세요"
                  value={signupEmail}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setSignupEmail(newEmail);
                    
                    // 실시간 이메일 형식 검증
                    if (!newEmail) {
                      setSignupErrors(prev => ({ ...prev, email: undefined }));
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                      setSignupErrors(prev => ({ ...prev, email: '올바른 이메일 형식이 아닙니다.' }));
                    } else {
                      setSignupErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  error={signupErrors.email}
                />
              </div>
              <div className="form-group">
                <div className="nickname-input-group">
                  <label className="block text-sm font-medium mb-1">닉네임</label>
                  <div className="nickname-input-wrapper">
                    <input
                      type="text"
                      placeholder="닉네임을 입력하세요"
                      value={signupNickname}
                      onChange={(e) => {
                        setSignupNickname(e.target.value);
                        setIsNicknameChecked(false);
                        setSignupErrors(prev => ({ ...prev, nickname: undefined }));
                        setNicknameSuccessMessage(null);
                      }}
                      className={`w-full px-3 py-2 border rounded ${
                        signupErrors.nickname ? 'border-red-500' : 'border-gray-300'
                      } nickname-input`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="nickname-check-button"
                      onClick={handleCheckNickname}
                    >
                      중복확인
                    </Button>
                  </div>
                  {signupErrors.nickname && (
                    <p className="mt-1 text-sm text-red-500">{signupErrors.nickname}</p>
                  )}
                  {nicknameSuccessMessage && !signupErrors.nickname && (
                    <p className="nickname-success-message">{nicknameSuccessMessage}</p>
                  )}
                </div>
              </div>
              <div className="form-group">
                <Input
                  type="password"
                  label="비밀번호"
                  placeholder="비밀번호를 입력하세요"
                  value={signupPassword}
                  onChange={(e) => {
                    const newPassword = e.target.value;
                    setSignupPassword(newPassword);
                    
                    // 실시간 비밀번호 검증
                    if (!newPassword) {
                      setSignupErrors(prev => ({ ...prev, password: undefined }));
                    } else if (newPassword.length < 8) {
                      setSignupErrors(prev => ({ ...prev, password: '비밀번호는 8자 이상이어야 합니다.' }));
                    } else {
                      // 영문, 숫자, 특수문자 조합 검증
                      const hasLetter = /[a-zA-Z]/.test(newPassword);
                      const hasNumber = /[0-9]/.test(newPassword);
                      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
                      
                      if (!hasLetter || !hasNumber || !hasSpecial) {
                        setSignupErrors(prev => ({ ...prev, password: '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.' }));
                      } else {
                        setSignupErrors(prev => ({ ...prev, password: undefined }));
                      }
                    }
                    
                    // 비밀번호가 변경되면 비밀번호 확인도 다시 검증
                    if (signupPasswordConfirm) {
                      if (newPassword !== signupPasswordConfirm) {
                        setSignupErrors(prev => ({ ...prev, passwordConfirm: '비밀번호가 일치하지 않습니다.' }));
                      } else {
                        setSignupErrors(prev => ({ ...prev, passwordConfirm: undefined }));
                      }
                    }
                  }}
                  error={signupErrors.password}
                />
              </div>
              <div className="form-group">
                <Input
                  type="password"
                  label="비밀번호 확인"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={signupPasswordConfirm}
                  onChange={(e) => {
                    const newPasswordConfirm = e.target.value;
                    setSignupPasswordConfirm(newPasswordConfirm);
                    
                    // 실시간 비밀번호 확인 검증
                    if (!newPasswordConfirm) {
                      setSignupErrors(prev => ({ ...prev, passwordConfirm: undefined }));
                    } else if (signupPassword && newPasswordConfirm !== signupPassword) {
                      setSignupErrors(prev => ({ ...prev, passwordConfirm: '비밀번호가 일치하지 않습니다.' }));
                    } else if (signupPassword && newPasswordConfirm === signupPassword) {
                      setSignupErrors(prev => ({ ...prev, passwordConfirm: undefined }));
                    }
                  }}
                  error={signupErrors.passwordConfirm}
                />
              </div>
              {submitError && (
                <div className="error-message">
                  {submitError}
                </div>
              )}
              <div className="form-actions">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="login-submit-button"
                  disabled={loading || !isSignupFormValid()}
                >
                  {loading ? '가입 중...' : '회원가입'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="signup-button"
                  onClick={handleSwitchToLogin}
                >
                  로그인으로 돌아가기
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

