export interface User {
  id: string;
  email: string;
  nickname: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface ExchangeTypeInfo {
  code: number;
  name: string;
  koreanName: string;
}

export interface UserResponse {
  id: string;
  email: string;
  nickname: string;
  signupType: number | null;
  createdAt: string;
  isActive: boolean | null;
  isConnectExchange: boolean | null;
  connectedExchanges: ExchangeTypeInfo[];
}

