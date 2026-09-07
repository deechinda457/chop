import { supabase } from '../lib/supabase';
import type { UserProfile } from '../context/AuthContext';
import { requireCurrentUser } from './serviceUtils';

export type UserStats = {
  recipesCooked: number;
  savedRecipes: number;
  streakDays: number;
};

function pickProfileUpdates(updates: Partial<UserProfile>) {
  const next: Record<string, unknown> = {};
  const keys = [
    'full_name',
    'username',
    'avatar_url',
    'bio',
    'household_id',
    'tier',
    'tier_expires_at',
    'username_changed_at',
    'onboarding_completed',
    'diet_type',
    'allergies',
    'health_goals',
    'measurement_units',
    'default_servings',
  ];
  for (const key of keys) {
    if (key in updates) next[key] = updates[key];
  }
  if ('dietary_preferences' in updates && !('diet_type' in updates)) {
    next.diet_type = (updates.dietary_preferences as string[] | undefined)?.[0] ?? 'none';
  }
  return next;
}

export const userService = {
  async getProfile() {
    const user = await requireCurrentUser();
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    return {
      id: user.id,
      email: user.email ?? null,
      ...(profile ?? {}),
      allergies: profile?.allergies ?? [],
    } as UserProfile;
  },

  async updateProfile(updates: Partial<UserProfile>) {
    const user = await requireCurrentUser();
    const profileUpdates = pickProfileUpdates(updates);

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', user.id);
      if (error) throw error;
    }

    return userService.getProfile();
  },

  async getStats(): Promise<UserStats> {
    const user = await requireCurrentUser();
    const [{ count: savedRecipes, error: savedError }, { data: logs, error: logsError }] = await Promise.all([
      supabase.from('saved_recipes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('cook_logs').select('completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }),
    ]);
    if (savedError) throw savedError;
    if (logsError) throw logsError;

    const normalizedDays = Array.from(
      new Set(
        (logs ?? []).map((row) => {
          const date = new Date(row.completed_at);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      )
    ).sort((a, b) => b - a);

    let streakDays = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (const day of normalizedDays) {
      if (day === cursor.getTime()) {
        streakDays += 1;
        cursor = new Date(cursor.getTime() - 86400000);
        continue;
      }
      if (day > cursor.getTime()) continue;
      break;
    }

    return {
      recipesCooked: logs?.length ?? 0,
      savedRecipes: savedRecipes ?? 0,
      streakDays,
    };
  },
};
