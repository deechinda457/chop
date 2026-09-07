import { router } from 'expo-router';
import { Bell, Camera, ChevronRight, Clock3, Crown, Moon, Star } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import { mockUser } from '../../store/mock-user';

function Toggle({ checked }: { checked: boolean }) {
  return (
    <View className="h-7 w-12 rounded-full" style={{ backgroundColor: checked ? '#E8A020' : '#D8D3CA' }}>
      <View className="absolute top-[3px] h-5 w-5 rounded-full bg-white" style={{ left: checked ? 23 : 3 }} />
    </View>
  );
}

export function ProfileScreen() {
  const theme = useThemeTokens();
  const appTheme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
      <View className="px-5 pb-5 pt-2">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-[24px] font-bold" style={{ color: theme.textPrimary }}>
            Profile
          </Text>
          <Pressable onPress={() => router.push('/profile/edit')}>
            <Text className="text-[14px] font-semibold" style={{ color: theme.primary }}>
              Edit Profile
            </Text>
          </Pressable>
        </View>

        <View className="rounded-[24px] border p-[18px]" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <View className="flex-row items-start gap-4">
            <View className="relative h-16 w-16 items-center justify-center rounded-full bg-[#8B5E3C]">
              <Text className="text-[18px] font-bold text-white">{mockUser.initials}</Text>
              <View className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full bg-white">
                <Camera size={12} color={theme.primary} />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-[18px] font-bold" style={{ color: theme.textPrimary }}>
                {mockUser.fullName}
              </Text>
              <Text className="mt-1 text-[13px]" style={{ color: theme.textMuted }}>
                @{mockUser.username}
              </Text>
              {mockUser.tier !== 'free' ? (
                <View className="mt-2 self-start rounded-full bg-[#E8A020] px-3 py-1">
                  <Text className="text-[12px] font-semibold text-white">{mockUser.tier === 'family' ? 'Family Plan' : 'Pro Member'}</Text>
                </View>
              ) : null}
              <Text className="mt-2 text-[13px]" style={{ color: theme.textMuted }}>
                {mockUser.email}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4 rounded-[24px] border p-5" style={{ backgroundColor: '#FFF8EC', borderColor: theme.primary }}>
          <View className="mb-3 flex-row items-center gap-2">
            <Crown size={18} color={theme.primary} />
            <Text className="text-[18px] font-bold" style={{ color: theme.textPrimary }}>
              Upgrade to Pro
            </Text>
          </View>
          <Text className="text-[13px] leading-5" style={{ color: theme.textSecondary }}>
            Unlimited AI searches, Cook Mode, Shopping Lists, Meal Planning and more
          </Text>
        </View>

        <Text className="mb-2 mt-5 px-1 text-[12px] font-bold uppercase" style={{ color: theme.textMuted }}>
          Notifications
        </Text>
        <View className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <View className="flex-row items-center px-4 py-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: theme.primarySoft }}>
              <Bell size={16} color={theme.primary} />
            </View>
            <Text className="ml-3 flex-1 text-[14px] font-semibold" style={{ color: theme.textPrimary }}>
              Expiry Alerts
            </Text>
            <Toggle checked />
          </View>
        </View>

        <Text className="mb-2 mt-5 px-1 text-[12px] font-bold uppercase" style={{ color: theme.textMuted }}>
          Preferences
        </Text>
        <View className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <Pressable onPress={() => setTheme(appTheme === 'dark' ? 'light' : 'dark')} className="flex-row items-center border-b px-4 py-4" style={{ borderColor: theme.border }}>
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: theme.primarySoft }}>
              <Moon size={16} color={theme.primary} />
            </View>
            <Text className="ml-3 flex-1 text-[14px] font-semibold" style={{ color: theme.textPrimary }}>
              Dark Mode
            </Text>
            <Toggle checked={appTheme === 'dark'} />
          </Pressable>
          <Pressable className="flex-row items-center border-b px-4 py-4" style={{ borderColor: theme.border }}>
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: theme.primarySoft }}>
              <Star size={16} color={theme.primary} />
            </View>
            <Text className="ml-3 flex-1 text-[14px] font-semibold" style={{ color: theme.textPrimary }}>
              Rate Us
            </Text>
            <ChevronRight size={16} color={theme.textMuted} />
          </Pressable>
          <Pressable onPress={() => router.push('/history')} className="flex-row items-center px-4 py-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: theme.primarySoft }}>
              <Clock3 size={16} color={theme.primary} />
            </View>
            <Text className="ml-3 flex-1 text-[14px] font-semibold" style={{ color: theme.textPrimary }}>
              Cooking History
            </Text>
            <ChevronRight size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
