import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useThemeTokens } from '../../lib/theme';

const defaultEdges: Edge[] = ['top', 'bottom', 'left', 'right'];

// `edges` defaults to reserving all four -- the right choice for a standalone route
// with no chrome of its own. Tab screens (Home/Kitchen/Explore) sit above a
// non-absolute tab bar that already reserves the true bottom safe-area inset itself,
// so reserving it again here would double up and leave a dead gap above the tab bar;
// those screens should pass edges={['top', 'left', 'right']}.
export function Screen({ children, edges = defaultEdges }: PropsWithChildren<{ edges?: Edge[] }>) {
  const theme = useThemeTokens();

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: 8 }}>{children}</View>
    </SafeAreaView>
  );
}
