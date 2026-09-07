import { StatusBar } from 'expo-status-bar';
import { useSegments } from 'expo-router';
import { useAppStore } from '../../store/app-store';

export function StatusBarBridge() {
  const theme = useAppStore((state) => state.theme);
  const segments = useSegments();
  const isDark = segments[0] === 'cook' || segments[0] === 'completion' || theme === 'dark';

  return <StatusBar style={isDark ? 'light' : 'dark'} translucent />;
}
