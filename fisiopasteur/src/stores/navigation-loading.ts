'use client';

import { create } from 'zustand';

interface NavigationLoadingState {
  pendingHref: string | null;
  loadingCount: number;
  setPending: (href: string | null) => void;
  startLoading: () => void;
  endLoading: () => void;
}

export const useNavigationLoadingStore = create<NavigationLoadingState>((set) => ({
  pendingHref: null,
  loadingCount: 0,
  setPending: (href) => set({ pendingHref: href }),
  startLoading: () => set((state) => ({ loadingCount: state.loadingCount + 1 })),
  endLoading: () =>
    set((state) => ({ loadingCount: Math.max(0, state.loadingCount - 1) })),
}));
