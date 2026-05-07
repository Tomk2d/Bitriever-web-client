type TokenListener = () => void;

let accessToken: string | null = null;
const listeners = new Set<TokenListener>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },
  hasAccessToken(): boolean {
    return !!accessToken;
  },
  setAccessToken(token: string): void {
    accessToken = token;
    notify();
  },
  clearAccessToken(): void {
    if (!accessToken) return;
    accessToken = null;
    notify();
  },
  subscribe(listener: TokenListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
