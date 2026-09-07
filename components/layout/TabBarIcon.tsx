import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useThemeTokens } from '../../lib/theme';

interface TabBarIconProps {
  focused: boolean;
  label: string;
  icon: LucideIcon;
}

export function TabBarIcon({ focused, label, icon: Icon }: TabBarIconProps) {
  const theme = useThemeTokens();

  return (
    <View className="items-center justify-center gap-1">
      <Icon color={focused ? theme.primary : '#999999'} size={20} strokeWidth={focused ? 2.4 : 2} />
      <View className="h-[3px] rounded-full" style={{ width: focused ? 18 : 0, backgroundColor: theme.primary }} />
      <Text className="text-[10px] font-medium" style={{ color: focused ? theme.primary : '#999999' }}>
        {label}
      </Text>
    </View>
  );
}
