import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ExchangeTypeInfo } from '@/features/auth/types';

interface AuthState {
  user: {
    userId: string | null;
    email: string | null;
    nickname: string | null;
    connectedExchanges: ExchangeTypeInfo[];
  } | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthState['user']>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setUserFromAuthResponse: (state, action: PayloadAction<{ userId: string; email: string; nickname: string }>) => {
      state.user = {
        userId: action.payload.userId,
        email: action.payload.email,
        nickname: action.payload.nickname,
        connectedExchanges: [],
      };
      state.isAuthenticated = true;
    },
  },
});

export const { setUser, clearUser, setUserFromAuthResponse } = authSlice.actions;
export default authSlice.reducer;

