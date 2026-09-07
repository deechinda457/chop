import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useScrollVisibilityStore } from '../../store/scroll-visibility-store';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/layout';

// Wraps the default tab bar in a floating, absolutely-positioned container so it
// can slide fully off-screen -- a bar that's part of normal layout flow can't do
// this via transform alone (its reserved space wouldn't move with it, leaving a
// dead gap). Each tab screen is responsible for reserving TAB_BAR_CONTENT_HEIGHT +
// its own bottom safe-area inset worth of scroll padding so content isn't hidden
// underneath the bar while it's visible.
export function AnimatedTabBar(props: BottomTabBarProps) {
  const navHidden = useScrollVisibilityStore((state) => state.navHidden);
  const translateY = useRef(new Animated.Value(0)).current;
  const barHeight = TAB_BAR_CONTENT_HEIGHT + props.insets.bottom;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: navHidden ? barHeight : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [navHidden, translateY, barHeight]);

  return (
    // React Navigation's BottomTabBar reserves the full safe-area bottom inset
    // internally (not something exposed to override via tabBarStyle) -- same
    // "too much cushion" issue trimmed on Recipe Detail's and Planner's sticky
    // buttons. Pulling the whole bar down by a fixed amount from its natural
    // bottom:0 rest position tightens that gap the same way, without touching
    // barHeight (which still needs the untrimmed full inset so hiding slides
    // it completely off-screen, not just mostly).
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: -16, transform: [{ translateY }] }}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}
