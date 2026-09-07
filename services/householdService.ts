import { supabase } from '../lib/supabase';
import { requireCurrentUser } from './serviceUtils';

export type HouseholdMember = {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  fullName: string;
  username: string;
  dietType: string;
};

export type HouseholdRecord = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode?: string | null;
  maxMembers: number;
};

export const householdService = {
  async getCurrentHousehold(): Promise<HouseholdRecord | null> {
    const user = await requireCurrentUser();
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile.household_id) return null;

    const { data, error } = await supabase
      .from('households')
      .select('id, name, owner_id, invite_code, max_members')
      .eq('id', profile.household_id)
      .single();
    if (error) throw error;

    return {
      id: String(data.id),
      name: data.name,
      ownerId: String(data.owner_id),
      inviteCode: data.invite_code ?? null,
      maxMembers: data.max_members ?? 5,
    };
  },

  async getMembers(householdId?: string): Promise<HouseholdMember[]> {
    const household = householdId ? { id: householdId } : await householdService.getCurrentHousehold();
    if (!household?.id) return [];

    const { data, error } = await supabase
      .from('household_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        user_profiles!inner(full_name, username),
        user_health_profiles(diet_type)
      `)
      .eq('household_id', household.id)
      .order('joined_at', { ascending: true });
    if (error) throw error;

    return (data ?? []).map((member) => {
      const profile = Array.isArray(member.user_profiles) ? member.user_profiles[0] : member.user_profiles;
      const health = Array.isArray(member.user_health_profiles) ? member.user_health_profiles[0] : member.user_health_profiles;
      return {
        id: String(member.id),
        userId: String(member.user_id),
        role: member.role,
        joinedAt: member.joined_at,
        fullName: profile?.full_name ?? 'Family Member',
        username: profile?.username ?? 'member',
        dietType: health?.diet_type ?? 'none',
      } satisfies HouseholdMember;
    });
  },
};

