import { configureStore } from '@reduxjs/toolkit';
import authSlice from '@/store/slices/authSlice';
import uiSlice from '@/store/slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

