'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { Input, Button } from '@/shared/components/ui';
import { authService } from '@/features/auth/services/authService';
import { setUserFromAuthResponse } from '@/store/slices/authSlice';
import './LoginPage.css';

export default function LoginPage() {
  const router = useRouter();
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
      
      // Redux에 사용자 정보 저장
      dispatch(setUserFromAuthResponse({
        userId: response.userId,
        email: response.email,
        nickname: response.nickname,
      }));
      
      // 로그인 성공 시 대시보드로 이동
      router.push('/dashboard');
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
    // TODO: 카카오 로그인 연동
    console.log('카카오 로그인');
  };

  const handleNaverLogin = () => {
    // TODO: 네이버 로그인 연동
    console.log('네이버 로그인');
  };

  const handleGoogleLogin = () => {
    // TODO: 구글 로그인 연동
    console.log('구글 로그인');
  };

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
                className="social-button kakao-button"
              >
                <span className="social-icon">K</span>
              </button>
              <button
                type="button"
                onClick={handleNaverLogin}
                className="social-button naver-button"
              >
                <span className="social-icon">N</span>
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="social-button google-button"
              >
                <span className="social-icon">G</span>
              </button>
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

