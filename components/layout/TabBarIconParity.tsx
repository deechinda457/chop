import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useThemeTokens } from '../../lib/theme';

export function TabBarIconParity({ focused, label, icon: Icon }: { focused: boolean; label: string; icon: LucideIcon }) {
  const theme = useThemeTokens();

  return (
    <View style={{ position: 'relative', width: 66, height: 54, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Icon
        size={21}
        strokeWidth={focused ? 2.35 : 1.8}
        color={focused ? theme.primary : '#8A8A8A'}
        fill={focused ? 'rgba(232, 160, 32, 0.12)' : 'none'}
      />
      <Text style={{ color: focused ? theme.primary : '#8A8A8A', fontSize: 10, fontWeight: focused ? '700' : '500' }}>{label}</Text>
      <View
        style={{
          position: 'absolute',
          bottom: 1,
          height: 3,
          width: focused ? 18 : 0,
          borderRadius: 999,
          backgroundColor: '#E8A020',
        }}
      />
    </View>
  );
}
