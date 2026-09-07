import { useMemo } from 'react';
import { useAppStore } from '../store';

// Poppins (bold/semibold) for headlines and hero text, Inter for body/labels/buttons
// (CLAUDE.md design system). Loaded once via useFonts in app/_layout.tsx.
const fontFamily = {
  headingBold: 'Poppins_700Bold',
  headingSemibold: 'Poppins_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
};

export function useThemeTokens() {
  const theme = useAppStore((state) => state.theme);

  return useMemo(
    () =>
      theme === 'dark'
        ? {
            theme,
            background: '#14213D',
            surface: '#1B2947',
            textPrimary: '#FDF6E9',
            textSecondary: '#9AA6C4',
            textMuted: '#9AA6C4',
            border: '#24304F',
            cream: '#1B2947',
            primary: '#E8A317',
            primaryLight: '#F2B84B',
            primarySoft: '#24304F',
            fonts: fontFamily,
          }
        : {
            theme,
            background: '#FDF6E9',
            surface: '#FFFFFF',
            textPrimary: '#14213D',
            textSecondary: '#6B7597',
            textMuted: '#6B7597',
            border: '#E9DFC8',
            cream: '#F2E9D3',
            primary: '#E8A317',
            primaryLight: '#F2B84B',
            primarySoft: '#FBEBC9',
            fonts: fontFamily,
          },
    [theme]
  );
}
