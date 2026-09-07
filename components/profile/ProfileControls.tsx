import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useThemeTokens } from '../../lib/theme';

// Shared by ProfileScreenParity's main list and the Preferences-&-Diet /
// Notifications sub-screens (ProfileSubScreens.tsx), so the row/toggle/card
// look stays identical everywhere in Profile rather than being reimplemented.

// Same soft-depth shadow already established on Home/Explore's cards.
export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export function Toggle({ checked, onPress }: { checked: boolean; onPress?: () => void }) {
  const theme = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'relative',
        height: 28,
        width: 48,
        borderRadius: 999,
        backgroundColor: checked ? theme.primary : theme.cream,
        borderWidth: 1,
        borderColor: checked ? theme.primary : theme.border,
      }}
    >
      <View style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, height: 20, width: 20, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
    </Pressable>
  );
}

export function Row({
  icon,
  label,
  value,
  onPress,
  right,
  divider = true,
  destructive = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  divider?: boolean;
  destructive?: boolean;
}) {
  const theme = useThemeTokens();
  return (
    <Pressable onPress={onPress} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: divider ? 1 : 0, borderBottomColor: theme.border }}>
      <View style={{ height: 34, width: 34, borderRadius: 10, borderWidth: 1, borderColor: destructive ? 'rgba(229,62,62,0.3)' : theme.border, backgroundColor: destructive ? 'rgba(229,62,62,0.12)' : theme.cream, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <Text style={{ flex: 1, color: destructive ? '#E53E3E' : theme.textPrimary, fontSize: 14, fontFamily: theme.fonts.bodySemibold }}>{label}</Text>
      {value ? <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.bodyMedium }}>{value}</Text> : null}
      {right ?? <ChevronRight size={16} color={theme.textMuted} />}
    </Pressable>
  );
}
