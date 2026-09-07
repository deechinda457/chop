import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { SearchScreenParity } from '../search/SearchScreenParity';
import { SavedRecipesScreen } from '../saved/SavedRecipesScreen';
import { HistoryScreen } from '../history/HistoryScreen';

const sections = [
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved' },
  { id: 'history', label: 'History' },
] as const;

type SectionId = (typeof sections)[number]['id'];

// The active tab's "pop forward" lift, matching the soft-shadow language already
// used elsewhere in the app (Explore/Home cards) rather than inventing a new one.
const toggleActiveShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: -2 },
  elevation: 2,
};

export function ExploreScreen() {
  const theme = useThemeTokens();
  const [activeSection, setActiveSection] = useState<SectionId>('search');

  // Chrome-tabs styling: the strip behind the tabs is a muted tone (theme.cream),
  // the active tab's background matches the content area below it (theme.background)
  // with rounded top corners and no bottom edge, so it visually merges with the
  // content and appears to pop forward off the strip. Inactive tabs stay flat/muted.
  const toggle = (
    <View style={{ flexDirection: 'row', gap: 3, backgroundColor: theme.cream, paddingHorizontal: 8, paddingTop: 8 }}>
      {sections.map((section) => {
        const active = activeSection === section.id;
        return (
          <Pressable
            key={section.id}
            onPress={() => setActiveSection(section.id)}
            style={[
              {
                flex: 1,
                alignItems: 'center',
                paddingVertical: 12,
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                backgroundColor: active ? theme.background : 'transparent',
                borderWidth: active ? 1 : 0,
                borderColor: theme.border,
                borderBottomWidth: 0,
              },
              active ? toggleActiveShadow : null,
            ]}
          >
            <Text
              style={{
                color: active ? theme.textPrimary : theme.textSecondary,
                fontFamily: active ? theme.fonts.bodySemibold : theme.fonts.bodyMedium,
                fontSize: 13,
              }}
            >
              {section.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Toggle sits at the very top, shared and pinned across all three tabs, before any
  // per-tab heading -- so its position can never shift regardless of what each tab
  // renders below it (Search has a search bar, Saved/History don't).
  return (
    <Screen edges={['top', 'left', 'right']}>
      {toggle}
      <View style={{ flex: 1 }}>
        {activeSection === 'search' ? <SearchScreenParity /> : null}
        {activeSection === 'saved' ? <SavedRecipesScreen /> : null}
        {activeSection === 'history' ? <HistoryScreen /> : null}
      </View>
    </Screen>
  );
}
