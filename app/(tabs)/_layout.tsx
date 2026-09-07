import { Tabs } from 'expo-router';
import { Compass, House, Package } from 'lucide-react-native';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { AnimatedTabBar } from '../../components/layout/AnimatedTabBar';
import { TabBarIconParity } from '../../components/layout/TabBarIconParity';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/layout';
import { useThemeTokens } from '../../lib/theme';

export default function TabsLayout() {
  const theme = useThemeTokens();

  return (
    <ProtectedRoute>
      <Tabs
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            height: TAB_BAR_CONTENT_HEIGHT,
            paddingTop: 4,
            paddingBottom: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabBarIconParity focused={focused} label="Home" icon={House} />,
          }}
        />
        <Tabs.Screen
          name="pantry"
          options={{
            title: 'Kitchen',
            tabBarIcon: ({ focused }) => <TabBarIconParity focused={focused} label="Kitchen" icon={Package} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ focused }) => <TabBarIconParity focused={focused} label="Explore" icon={Compass} />,
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
