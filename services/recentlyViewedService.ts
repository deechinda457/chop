import AsyncStorage from '@react-native-async-storage/async-storage';

// Local-only, per-device log (not synced to Supabase) -- same pattern as
// Home's day-status tracking and the old skip flag. Nothing in this app
// currently logs recipe *views* (only cook_logs, tied to completing Cook
// Mode), so this is a new, standalone list rather than reading existing data.
const STORAGE_KEY = 'chop_recently_viewed';
const MAX_ENTRIES = 15;

export interface RecentlyViewedEntry {
  id: string;
  title: string;
  image: string | null;
  viewedAt: number;
}

export const recentlyViewedService = {
  async getRecentlyViewed(): Promise<RecentlyViewedEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecentlyViewedEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  // Moves an already-present entry back to the top with a fresh timestamp
  // instead of duplicating it; evicts the oldest entry once past MAX_ENTRIES.
  async recordView(entry: { id: string; title: string; image: string | null }): Promise<void> {
    try {
      const current = await recentlyViewedService.getRecentlyViewed();
      const withoutThisRecipe = current.filter((item) => item.id !== entry.id);
      const next = [{ ...entry, viewedAt: Date.now() }, ...withoutThisRecipe].slice(0, MAX_ENTRIES);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Best-effort only -- a failed write just means this recipe won't show
      // up in Recently Viewed, not something worth surfacing to the user.
    }
  },
};
