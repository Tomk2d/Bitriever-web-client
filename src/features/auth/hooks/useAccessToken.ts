import { useSyncExternalStore } from 'react';
import { tokenStore } from '@/lib/tokenStore';

export const useAccessToken = () =>
  useSyncExternalStore(tokenStore.subscribe, tokenStore.getAccessToken, () => null);

export const useHasAccessToken = () =>
  useSyncExternalStore(tokenStore.subscribe, tokenStore.hasAccessToken, () => false);
