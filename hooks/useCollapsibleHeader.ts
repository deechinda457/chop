import { useCallback, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useScrollVisibilityStore } from '../store/scroll-visibility-store';

const DOWN_THRESHOLD = 12; // px of downward scroll before hiding, avoids jitter on tiny movements
const UP_THRESHOLD = 4; // reveal on a much smaller upward movement, per "scrolls up even a little"
// Fallback only: onScrollEndDrag/onMomentumScrollEnd are the real "scrolling has
// stopped" signal (fires exactly when the gesture concludes). A raw "no event for
// N ms" timer fires during ordinary pauses mid-drag too, which reads as a premature
// reveal -- this longer duration only catches cases those events don't fire for
// (e.g. a programmatic scrollTo with no gesture at all).
const IDLE_FALLBACK_MS = 600;

/**
 * Facebook/X-style collapsing header: hides on scroll-down past a small
 * threshold, reveals on any small scroll-up or once scrolling goes idle.
 *
 * Two heights are tracked separately because not everything under a header
 * always collapses (e.g. Kitchen's heading collapses but its Have/Need toggle
 * stays put): `onGroupLayout` measures the *whole* fixed-header group (used to
 * reserve matching scroll space so content never starts out hidden under it),
 * while `onCollapsibleLayout` measures only the portion that actually slides
 * away (used as the hide distance). For a header that collapses entirely,
 * point both at the same element.
 *
 * Every consumer also mirrors its hidden/shown state into the shared
 * scroll-visibility store so the bottom tab bar (rendered once, outside any
 * individual screen) animates in sync with whichever tab is focused, and
 * resets to shown whenever the screen regains focus so switching tabs never
 * leaves the bar stuck hidden.
 */
export function useCollapsibleHeader() {
  const translateY = useRef(new Animated.Value(0)).current;
  const collapseDistanceRef = useRef(0);
  const hiddenRef = useRef(false);
  const lastOffsetRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setNavHidden = useScrollVisibilityStore((state) => state.setNavHidden);
  const [reserveHeight, setReserveHeight] = useState(0);

  const setHidden = useCallback(
    (hidden: boolean) => {
      // Ignore a hide request before the header has measured its own height --
      // onLayout can lag the very first scroll event on a slow initial render.
      // Marking hiddenRef true here anyway (with nothing to animate to) would
      // stick: the header would sit fully visible but internally "hidden", so a
      // later genuine hide-past-threshold would no-op against that stale flag.
      if (hidden && collapseDistanceRef.current <= 0) return;
      if (hiddenRef.current === hidden) return;
      hiddenRef.current = hidden;
      Animated.timing(translateY, {
        toValue: hidden ? -collapseDistanceRef.current : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      setNavHidden(hidden);
    },
    [translateY, setNavHidden]
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const delta = offsetY - lastOffsetRef.current;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setHidden(false), IDLE_FALLBACK_MS);

      if (offsetY <= 0) {
        setHidden(false);
        lastOffsetRef.current = offsetY;
        return;
      }
      if (delta > DOWN_THRESHOLD) {
        setHidden(true);
        lastOffsetRef.current = offsetY;
      } else if (delta < -UP_THRESHOLD) {
        setHidden(false);
        lastOffsetRef.current = offsetY;
      }
    },
    [setHidden]
  );

  // The real "scrolling has stopped" signal -- fires once the drag is released
  // and (if it was moving fast enough to coast) once momentum finishes settling.
  const onScrollSettled = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setHidden(false);
  }, [setHidden]);

  const onGroupLayout = useCallback((event: LayoutChangeEvent) => {
    setReserveHeight(event.nativeEvent.layout.height);
  }, []);

  const onCollapsibleLayout = useCallback((event: LayoutChangeEvent) => {
    collapseDistanceRef.current = event.nativeEvent.layout.height;
  }, []);

  // Reset to shown on focus so leaving a tab scrolled-down-and-hidden doesn't
  // carry over stale state (own header or the shared bar) into the next visit.
  useFocusEffect(
    useCallback(() => {
      hiddenRef.current = false;
      lastOffsetRef.current = 0;
      translateY.setValue(0);
      setNavHidden(false);
    }, [translateY, setNavHidden])
  );

  return {
    onScroll,
    onScrollEndDrag: onScrollSettled,
    onMomentumScrollEnd: onScrollSettled,
    onGroupLayout,
    onCollapsibleLayout,
    reserveHeight,
    headerStyle: { transform: [{ translateY }] },
  };
}
