import { create } from 'zustand';

// Ephemeral UI state only (not persisted): whichever tab screen is currently
// focused drives this from its own scroll position, and the shared bottom tab
// bar (rendered once, at the navigator level, outside any individual screen)
// reads it to animate in sync with that screen's own collapsing header.
interface ScrollVisibilityState {
  navHidden: boolean;
  setNavHidden: (hidden: boolean) => void;
}

export const useScrollVisibilityStore = create<ScrollVisibilityState>((set) => ({
  navHidden: false,
  setNavHidden: (hidden) => set((state) => (state.navHidden === hidden ? state : { navHidden: hidden })),
}));
