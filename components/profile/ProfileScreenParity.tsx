import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Camera,
  Clock3,
  Crown,
  Globe,
  Headphones,
  LogOut,
  Moon,
  Scale,
  Shield,
  Star,
  Users,
} from 'lucide-react-native';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import { userService, type UserStats } from '../../services/userService';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { cardShadow, Row, Toggle } from './ProfileControls';

function StatCard({ value, label }: { value: string; label: string }) {
  const theme = useThemeTokens();
  return (
    <View style={[{ flex: 1, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center' }, cardShadow]}>
      <Text style={{ color: theme.primary, fontSize: 20, fontFamily: theme.fonts.headingBold }}>{value}</Text>
      <Text style={{ marginTop: 2, color: theme.textMuted, fontSize: 10, fontFamily: theme.fonts.bodyMedium, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export function ProfileScreenParity() {
  const theme = useThemeTokens();
  const { onScroll, onScrollEndDrag, onMomentumScrollEnd, onGroupLayout, onCollapsibleLayout, reserveHeight, headerStyle } = useCollapsibleHeader();
  const { profile, signOut } = useAuth();
  const savedRecipeIds = useAppStore((state) => state.savedRecipeIds);
  const appTheme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const [stats, setStats] = useState<UserStats>({ recipesCooked: 0, savedRecipes: 0, streakDays: 0 });

  useEffect(() => {
    void userService.getStats().then(setStats).catch(() => undefined);
  }, []);

  const profileName = (profile?.full_name as string | undefined) ?? 'RecipeOS User';
  const profileUsername = (profile?.username as string | undefined) ?? 'recipe_user';
  const profileEmail = (profile?.email as string | undefined) ?? '';
  const measurementUnits = (profile?.measurement_units as string | undefined) ?? 'Metric';
  const tier = ((profile?.tier as string | undefined) ?? 'free').toLowerCase();
  const initials = useMemo(() => {
    const parts = profileName.split(' ').filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'RO';
  }, [profileName]);

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View
        onLayout={(event) => {
          onGroupLayout(event);
          onCollapsibleLayout(event);
        }}
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, backgroundColor: theme.background }, headerStyle]}
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
            <ArrowLeft size={18} color={theme.textPrimary} />
          </Pressable>
          <Text style={{ color: theme.textPrimary, fontSize: 17, fontFamily: theme.fonts.headingSemibold }}>Profile</Text>
          <Pressable onPress={() => router.push('/profile/edit')}>
            <Text style={{ color: theme.primary, fontSize: 14, fontFamily: theme.fonts.bodySemibold }}>Edit</Text>
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: reserveHeight + 8, paddingBottom: 32 }}
      >
      <View style={{ paddingHorizontal: 8 }}>
        {/* Centered avatar block matching the mockup's .profile-top treatment
            (76px circle, 3px amber ring, navy fill regardless of light/dark
            mode -- the same fixed-navy "spotlight" brand treatment Home's hero
            already uses) instead of the old side-by-side card layout. */}
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8 }}>
          <View style={{ position: 'relative', height: 76, width: 76, borderRadius: 999, backgroundColor: '#14213D', borderWidth: 3, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.primaryLight, fontSize: 24, fontFamily: theme.fonts.headingBold }}>{initials}</Text>
            <View style={{ position: 'absolute', right: -2, bottom: -2, height: 24, width: 24, borderRadius: 999, borderWidth: 2, borderColor: theme.background, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={12} color={theme.primary} />
            </View>
          </View>
          <Text style={{ marginTop: 12, color: theme.textPrimary, fontSize: 17, fontFamily: theme.fonts.headingBold }}>{profileName}</Text>
          <Text style={{ marginTop: 2, color: theme.textMuted, fontSize: 12, fontFamily: theme.fonts.body }}>@{profileUsername}</Text>
          {tier !== 'free' ? (
            <View style={{ marginTop: 8, borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {tier === 'family' ? <Users size={12} color="#FFFFFF" /> : <Crown size={12} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: theme.fonts.bodySemibold }}>{tier === 'family' ? 'Family Plan' : 'Pro Member'}</Text>
            </View>
          ) : null}
          <Text style={{ marginTop: 6, color: theme.textMuted, fontSize: 12, fontFamily: theme.fonts.body }}>{profileEmail}</Text>
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
          <StatCard value={String(stats.recipesCooked)} label={'Recipes\nCooked'} />
          <StatCard value={String(stats.streakDays)} label={'Days\nStreak'} />
          <StatCard value={String(savedRecipeIds.size || stats.savedRecipes)} label={'Saved\nRecipes'} />
        </View>

        <Pressable onPress={() => router.push('/plans')} style={[{ marginTop: 16, borderRadius: 24, padding: 20, backgroundColor: theme.primary }, cardShadow]}>
          <View style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Crown size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: theme.fonts.headingBold }}>Upgrade to Pro</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 20, fontFamily: theme.fonts.body }}>Unlimited AI searches, Cook Mode, Shopping Lists, Meal Planning and more</Text>
          <View style={{ alignSelf: 'flex-start', marginTop: 16, borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 10 }}>
            <Text style={{ color: theme.primary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>See Plans</Text>
          </View>
        </Pressable>

        {/* One continuous flat list per the mockup (a single menu, not separate
            labeled/boxed sections). "Preferences & Diet" navigates to a hub
            screen covering Diet Type + Allergies + Health Goals -- the three
            settings this row is meant to expose (all three lived under one
            "Dietary Preferences" group before this redesign; a single row
            can only carry one destination, so it now opens a small list of
            the three instead of jumping straight to Diet Type alone).
            "Notifications" similarly opens a hub with the three preference
            toggles (previously three separate rows here), matching the
            mockup's single "Notifications" menu item -- dark mode stays
            inline per request, since it's a one-tap control, not a group. */}
        <View style={[{ marginTop: 20, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, cardShadow]}>
          <Row label="Preferences & Diet" icon={<Scale size={16} color={theme.primary} />} onPress={() => router.push('/profile/preferences-diet')} />
          <Row label="Notifications" icon={<Bell size={16} color={theme.primary} />} onPress={() => router.push('/profile/notifications')} />
          <Row label="Cooking History" icon={<Clock3 size={16} color={theme.primary} />} onPress={() => router.replace('/(tabs)/explore')} />
          <Row label="Measurement Units" value={measurementUnits} icon={<Scale size={16} color={theme.primary} />} onPress={() => router.push('/profile/measurement-units')} />
          <Row label="Language" value="English" icon={<Globe size={16} color={theme.primary} />} onPress={() => router.push('/profile/language')} />
          <Row label="Dark Mode" icon={<Moon size={16} color={theme.primary} />} right={<Toggle checked={appTheme === 'dark'} onPress={() => setTheme(appTheme === 'dark' ? 'light' : 'dark')} />} />
          <Row label="Saved Recipes" icon={<Bookmark size={16} color={theme.primary} />} onPress={() => router.replace('/(tabs)/explore')} />
          <Row label="Privacy & Security" icon={<Shield size={16} color={theme.primary} />} onPress={() => router.push('/profile/password')} />
          <Row label="Support" icon={<Headphones size={16} color={theme.primary} />} onPress={() => router.push('/plans')} />
          <Row label="Rate Us" icon={<Star size={16} color={theme.primary} />} onPress={() => router.push('/plans')} />
          <Row label="Sign Out" icon={<LogOut size={16} color="#E53E3E" />} destructive divider={false} onPress={() => { setAuthenticated(false); void signOut(); }} right={<View />} />
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
