import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, CalendarDays, CheckCircle2, ChefHat, ChevronDown, ChevronUp, Clock3, Compass, Flame, Repeat, X } from 'lucide-react-native';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore, getPantryInventoryNames, type PantryItemRecord, type PlannedMeal } from '../../store/app-store';
import { useAuth } from '../../context/AuthContext';
import { recipeService, type SearchRecipeCard } from '../../services/recipeService';
import { userService } from '../../services/userService';
import { recentlyViewedService, type RecentlyViewedEntry } from '../../services/recentlyViewedService';
import { getRecipePrimaryImage } from '../../services/recipeImages';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/layout';
import { MealSheet } from '../planner/MealSheet';

type MealTimeSlot = 'breakfast' | 'lunch' | 'dinner';
type SavedRecipeCard = Awaited<ReturnType<typeof recipeService.getSavedRecipeCards>>[number];

const mealTypeLabel: Record<MealTimeSlot, PlannedMeal['type']> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const mealEmoji: Record<PlannedMeal['type'], string> = {
  Breakfast: '🥑',
  Lunch: '🍜',
  Dinner: '🍽️',
  Snack: '🥜',
};

const mealTypeOrder: PlannedMeal['type'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Shared card depth per CLAUDE.md's design system ("soft shadows/gradients rather
// than flat color blocks"), matching the constant already established on Explore.
const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function badgePillStyle(badgeColor: 'green' | 'amber') {
  return badgeColor === 'green'
    ? { backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ECC71' }
    : { backgroundColor: 'rgba(232, 163, 23, 0.15)', color: '#E8A317' };
}

// Time-aware only for now -- region-aware cuisine biasing is deferred to Day 10,
// where expo-localization actually gets wired in app-wide.
function mealSlotForHour(hour: number): MealTimeSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 17) return 'lunch';
  return 'dinner';
}

function heroEyebrow(mealSlot: MealTimeSlot) {
  if (mealSlot === 'breakfast') return "This morning's pick — from what you have";
  if (mealSlot === 'lunch') return "Today's lunch pick — from what you have";
  return "Tonight's pick — from what you have";
}

function formatIngredientList(names: string[], max = 3) {
  if (names.length === 0) return '';
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? `${shown} +${names.length - max} more` : shown;
}

function heroSubtitle(recipe: SearchRecipeCard) {
  const parts = [recipe.cookTime, `Serves ${recipe.servings ?? 2}`];
  const ingredientList = formatIngredientList(recipe.ingredientNames);
  if (ingredientList) parts.push(`Uses ${ingredientList}`);
  return parts.join(' · ');
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function confidenceLabel(confidence: PantryItemRecord['confidence']) {
  if (confidence === 'full') return 'Full';
  if (confidence === 'half') return 'Half';
  return 'Low';
}

// "Needs attention" = expiring soon (matches Kitchen's own danger/warning threshold)
// or low-confidence -- per CLAUDE.md's pantry rule that items unconfirmed for a
// while should read as uncertain rather than being assumed still full.
function pantryAttentionMeta(item: PantryItemRecord) {
  const label = confidenceLabel(item.confidence);
  if (item.daysLeft <= 3) {
    const expiryText = item.daysLeft <= 0 ? 'Expires today' : item.daysLeft === 1 ? '1 day left' : `${item.daysLeft} days left`;
    return `${label} · ${expiryText}`;
  }
  return `${label} · needs a check`;
}

// Per-device, per-(day, meal-slot) status only -- not synced to Supabase,
// matches the planner's own local-preference-only writes (there's no
// decision-log table). Snack has no time window, so it's never tracked here.
const STATUS_STORAGE_KEY_PREFIX = 'chop_home_hero_status_';
type MealSlotStatus = 'cooked' | 'skipped' | 'missed';
type DayStatusMap = Partial<Record<PlannedMeal['type'], MealSlotStatus>>;

function persistDayStatus(statusMap: DayStatusMap) {
  void AsyncStorage.setItem(`${STATUS_STORAGE_KEY_PREFIX}${todayKey()}`, JSON.stringify(statusMap));
}

export function HomeScreen() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { onScroll, onScrollEndDrag, onMomentumScrollEnd, onGroupLayout, onCollapsibleLayout, reserveHeight, headerStyle } = useCollapsibleHeader();
  const { profile } = useAuth();
  const pantryItems = useAppStore((state) => state.pantryItems);
  const mealPlans = useAppStore((state) => state.mealPlans);
  const savedRecipeIds = useAppStore((state) => state.savedRecipeIds);
  const toggleSavedRecipe = useAppStore((state) => state.toggleSavedRecipe);

  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [dayStatus, setDayStatus] = useState<DayStatusMap>({});
  const [now, setNow] = useState(() => new Date());
  const previousSlotRef = useRef<MealTimeSlot | null>(null);
  const [showFullDay, setShowFullDay] = useState(false);
  const [sheetTarget, setSheetTarget] = useState<{ day: number; meal: PlannedMeal | null; initialType?: PlannedMeal['type'] } | null>(null);

  const [heroCandidates, setHeroCandidates] = useState<SearchRecipeCard[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroLoading, setHeroLoading] = useState(true);

  const [useItUpRow, setUseItUpRow] = useState<SearchRecipeCard[]>([]);
  const [quickRow, setQuickRow] = useState<SearchRecipeCard[]>([]);
  const [becauseRow, setBecauseRow] = useState<{ title: string; recipes: SearchRecipeCard[] } | null>(null);
  const [rowsLoading, setRowsLoading] = useState(true);

  const [savedForLater, setSavedForLater] = useState<SavedRecipeCard[]>([]);
  const [savedForLaterLoading, setSavedForLaterLoading] = useState(true);

  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedEntry[]>([]);

  const hour = now.getHours();
  const mealSlot = mealSlotForHour(hour);
  const currentSlotType = mealTypeLabel[mealSlot];
  const currentSlotStatus = dayStatus[currentSlotType];
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = typeof profile?.full_name === 'string' ? profile.full_name.trim().split(' ')[0] : '';

  const today = new Date();
  const weekday = today.getDay();
  const mondayIndex = weekday === 0 ? 6 : weekday - 1;
  const todayMeals = mealPlans.thisWeek?.[mondayIndex] ?? [];
  const plannedMeal = todayMeals.find((meal) => meal.type === mealTypeLabel[mealSlot] && meal.recipeId);

  const pantryNames = useMemo(() => getPantryInventoryNames(pantryItems), [pantryItems]);

  const kitchenAttentionItems = useMemo(() => {
    const flagged = pantryItems.filter((item) => item.daysLeft <= 3 || item.confidence === 'low');
    return [...flagged]
      .sort((a, b) => (a.confidence === 'low' ? -1 : a.daysLeft) - (b.confidence === 'low' ? -1 : b.daysLeft))
      .slice(0, 8);
  }, [pantryItems]);

  useEffect(() => {
    void userService
      .getStats()
      .then((stats) => setStreakDays(stats.streakDays))
      .catch(() => setStreakDays(0));
  }, []);

  useEffect(() => {
    let active = true;
    setSavedForLaterLoading(true);
    void recipeService
      .getSavedRecipeCards()
      .then((data) => {
        if (active) setSavedForLater(data);
      })
      .catch(() => {
        if (active) setSavedForLater([]);
      })
      .finally(() => {
        if (active) setSavedForLaterLoading(false);
      });
    return () => {
      active = false;
    };
  }, [savedRecipeIds]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(`${STATUS_STORAGE_KEY_PREFIX}${todayKey()}`).then((value) => {
      if (!active || !value) return;
      try {
        setDayStatus(JSON.parse(value) as DayStatusMap);
      } catch {
        // corrupt/old-format value -- ignore, starts fresh
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Live auto-advance: re-derive `now` (and so `mealSlot`) on a timer while
  // Home is mounted, and again on focus in case a window boundary passed
  // while the screen was backgrounded -- otherwise `mealSlot` only ever
  // updates when something unrelated happens to re-render the component.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      void recentlyViewedService.getRecentlyViewed().then(setRecentlyViewed);
    }, [])
  );

  // Whenever the live slot advances, seal the *previous* slot as "missed" if
  // it closed with no cook/skip action recorded -- the concrete meaning of
  // "a window closed with no action taken" from the feature spec. Skipped on
  // the very first render (previousSlotRef starts null) so opening the app
  // fresh never manufactures a missed entry for a slot never actually seen.
  useEffect(() => {
    const previousSlot = previousSlotRef.current;
    if (previousSlot && previousSlot !== mealSlot) {
      const previousType = mealTypeLabel[previousSlot];
      setDayStatus((current) => {
        if (current[previousType]) return current;
        const next = { ...current, [previousType]: 'missed' as const };
        persistDayStatus(next);
        return next;
      });
    }
    previousSlotRef.current = mealSlot;
  }, [mealSlot]);

  // Only compute a suggestion when there's no already-decided planned meal for
  // this slot -- a planner-backed meal always wins as the "already decided" hero.
  useEffect(() => {
    if (plannedMeal) {
      setHeroLoading(false);
      return;
    }
    let active = true;
    setHeroLoading(true);
    // Deliberately not passing `ingredients` here: combining a text query with
    // Spoonacular's includeIngredients filter requires every included ingredient to
    // match its controlled vocabulary, and pantry names (which include non-standard
    // local units/terms per CLAUDE.md) easily zero out results. Personalize by
    // ranking on matchCount client-side instead, same as the rows below.
    void recipeService
      .searchSpoonacularRecipes({ query: mealSlot, pantryNames, number: 6 })
      .then((results) => {
        if (!active) return;
        setHeroCandidates([...results].sort((a, b) => b.matchCount - a.matchCount));
        setHeroIndex(0);
      })
      .catch(() => {
        if (active) setHeroCandidates([]);
      })
      .finally(() => {
        if (active) setHeroLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pantryNames is memoized on pantryItems
  }, [mealSlot, plannedMeal?.id, pantryItems]);

  useEffect(() => {
    let active = true;
    setRowsLoading(true);

    const expiringNames = pantryItems.filter((item) => item.daysLeft <= 7).map((item) => item.name);
    const useItUpPromise =
      expiringNames.length > 0
        ? recipeService.searchSpoonacularRecipes({ ingredients: expiringNames, pantryNames, number: 8 })
        : Promise.resolve<SearchRecipeCard[]>([]);

    const quickPromise = recipeService.searchSpoonacularRecipes({ query: mealSlot, maxReadyTime: 30, pantryNames, number: 8 });

    const becausePromise = recipeService.getCookingHistory().then(async (history) => {
      if (history.length === 0) return null;
      const top = [...history].sort((a, b) => (b.cookedCount ?? 1) - (a.cookedCount ?? 1))[0];
      const results = await recipeService.searchSpoonacularRecipes({ query: top.title, pantryNames, number: 8 });
      const filtered = results.filter((recipe) => recipe.title !== top.title);
      return filtered.length > 0 ? { title: top.title, recipes: filtered } : null;
    });

    Promise.all([useItUpPromise, quickPromise, becausePromise])
      .then(([useItUp, quick, because]) => {
        if (!active) return;
        setUseItUpRow(useItUp);
        setQuickRow(quick);
        setBecauseRow(because);
      })
      .catch(() => {
        if (!active) return;
        setUseItUpRow([]);
        setQuickRow([]);
        setBecauseRow(null);
      })
      .finally(() => {
        if (active) setRowsLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pantryNames is memoized on pantryItems
  }, [mealSlot, pantryItems]);

  const heroRecipe = plannedMeal ? null : heroCandidates[heroIndex] ?? null;

  const handleSwap = useCallback(() => {
    setHeroIndex((index) => (heroCandidates.length > 0 ? (index + 1) % heroCandidates.length : 0));
  }, [heroCandidates.length]);

  const handleSkip = useCallback(() => {
    setDayStatus((current) => {
      const next = { ...current, [currentSlotType]: 'skipped' as const };
      persistDayStatus(next);
      return next;
    });
  }, [currentSlotType]);

  const handleShowSuggestionAgain = useCallback(() => {
    setDayStatus((current) => {
      const next = { ...current };
      delete next[currentSlotType];
      persistDayStatus(next);
      return next;
    });
  }, [currentSlotType]);

  const handleCook = useCallback(
    (recipeId: string) => {
      setDayStatus((current) => {
        if (current[currentSlotType] === 'cooked') return current;
        const next = { ...current, [currentSlotType]: 'cooked' as const };
        persistDayStatus(next);
        return next;
      });
      router.push(`/recipe/${recipeId}`);
    },
    [currentSlotType]
  );

  const initials = firstName ? firstName.slice(0, 2).toUpperCase() : '👤';
  const streakLabel = streakDays === null ? null : streakDays > 0 ? `🔥 ${streakDays} day${streakDays === 1 ? '' : 's'} sorted` : '☑️ Get today sorted';

  // Fixed navy tones for the hero regardless of light/dark mode -- CLAUDE.md's dark-mode
  // navy gradient reused deliberately as the hero's brand treatment (like a spotlight
  // card), not tied to the page background. Dark mode gets a slightly lighter pair so
  // the card still reads as distinct from the (already navy) page behind it.
  const heroGradient: [string, string] = theme.theme === 'dark' ? ['#1B2947', '#14213D'] : ['#14213D', '#0B1226'];

  return (
    <Screen edges={['left', 'right']}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View
          onLayout={(event) => {
            onGroupLayout(event);
            onCollapsibleLayout(event);
          }}
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: 4, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerStyle]}
        >
          <View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: theme.fonts.bodyMedium }}>
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </Text>
            <Text style={{ marginTop: 2, color: theme.textPrimary, fontSize: 24, fontFamily: theme.fonts.headingBold }}>What&apos;s cooking?</Text>
          </View>
          <Pressable
            onPress={() => router.push('/profile')}
            style={[{ height: 44, width: 44, borderRadius: 999, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }, cardShadow]}
          >
            <Text style={{ color: theme.primary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>{initials}</Text>
          </Pressable>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 8, paddingTop: reserveHeight + 16, paddingBottom: 32 + TAB_BAR_CONTENT_HEIGHT + insets.bottom }}
        >
        {streakLabel ? (
          <View style={{ marginBottom: 16, alignSelf: 'flex-start', borderRadius: 999, backgroundColor: theme.primarySoft, paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: theme.fonts.bodySemibold }}>{streakLabel}</Text>
          </View>
        ) : null}

        {/* This week's plan */}
        <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: theme.fonts.headingSemibold }}>This week&apos;s plan</Text>
          <Pressable onPress={() => router.push('/planner')}>
            <Text style={{ color: theme.primary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>Open planner</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -8 }}
          contentContainerStyle={{ gap: 8, paddingLeft: 8, paddingRight: 0, paddingBottom: 4 }}
        >
          {weekDayLabels.map((label, index) => {
            const dayMeals = mealPlans.thisWeek?.[index] ?? [];
            const primary = dayMeals[0];
            return (
              <Pressable
                key={label}
                onPress={() => router.push('/planner')}
                style={[
                  { width: 88, borderRadius: 18, borderWidth: 1, borderColor: primary ? theme.primary : theme.border, backgroundColor: theme.surface, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
                  cardShadow,
                ]}
              >
                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: theme.fonts.bodySemibold, textTransform: 'uppercase' }}>{label}</Text>
                {primary ? (
                  <View style={{ marginTop: 6, height: 6, width: 6, borderRadius: 999, backgroundColor: theme.primary }} />
                ) : (
                  <Text style={{ marginTop: 6, color: theme.textMuted, fontSize: 14 }}>+</Text>
                )}
                <Text numberOfLines={2} style={{ marginTop: 6, textAlign: 'center', color: primary ? theme.textPrimary : theme.textMuted, fontSize: 11, fontFamily: theme.fonts.bodyMedium, minHeight: 28 }}>
                  {primary ? primary.name : 'Add meal'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Hero: Cook / Swap / Skip -- explicitly exempt from the page-margin
            reduction (currently 8px, down from the original 20px); this
            compensating +12px margin keeps the hero at its original inset
            regardless of what the page margin becomes elsewhere. */}
        <View style={{ marginTop: 22, marginHorizontal: 12 }}>
          {plannedMeal ? (
            <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 20, padding: 20, overflow: 'hidden' }, cardShadow]}>
              <Text style={{ color: theme.primaryLight, fontSize: 11, fontFamily: theme.fonts.bodySemibold, textTransform: 'uppercase' }}>Today&apos;s {mealTypeLabel[mealSlot]}</Text>
              <Text style={{ marginTop: 8, color: '#FDF6E9', fontSize: 21, fontFamily: theme.fonts.headingBold }}>{plannedMeal.name}</Text>
              <Pressable
                onPress={() => plannedMeal.recipeId && handleCook(plannedMeal.recipeId)}
                style={{ marginTop: 18, height: 48, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#1B1204', fontSize: 14, fontFamily: theme.fonts.bodySemibold }}>▶ Cook this</Text>
              </Pressable>
            </LinearGradient>
          ) : currentSlotStatus === 'skipped' ? (
            <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 20, paddingHorizontal: 20, paddingVertical: 28, alignItems: 'center', overflow: 'hidden' }, cardShadow]}>
              <View style={{ marginBottom: 12, height: 48, width: 48, borderRadius: 999, backgroundColor: 'rgba(232,163,23,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color={theme.primaryLight} />
              </View>
              <Text style={{ color: '#FDF6E9', fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Decide later — no rush</Text>
              <Pressable onPress={handleShowSuggestionAgain} style={{ marginTop: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 10 }}>
                <Text style={{ color: theme.primaryLight, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>Show a suggestion</Text>
              </Pressable>
            </LinearGradient>
          ) : heroLoading ? (
            <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ height: 220, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, cardShadow]}>
              <ActivityIndicator color={theme.primaryLight} />
            </LinearGradient>
          ) : heroRecipe ? (
            <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 20, padding: 20, overflow: 'hidden' }, cardShadow]}>
              <Text style={{ color: theme.primaryLight, fontSize: 11, fontFamily: theme.fonts.bodySemibold, textTransform: 'uppercase' }}>{heroEyebrow(mealSlot)}</Text>
              <View style={{ marginTop: 14, height: 160, borderRadius: 16, overflow: 'hidden' }}>
                <Image source={heroRecipe.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <View style={{ position: 'absolute', left: 12, bottom: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(20,33,61,0.55)' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: theme.fonts.bodySemibold }}>
                    {heroRecipe.matchCount > 0 ? `Uses ${heroRecipe.matchCount} pantry item${heroRecipe.matchCount === 1 ? '' : 's'}` : heroRecipe.badge}
                  </Text>
                </View>
              </View>
              <Text style={{ marginTop: 14, color: '#FDF6E9', fontSize: 21, fontFamily: theme.fonts.headingBold }}>{heroRecipe.title}</Text>
              <Text style={{ marginTop: 6, color: '#C9CEDD', fontSize: 13 }}>{heroSubtitle(heroRecipe)}</Text>
              <View style={{ marginTop: 18, flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={handleSwap}
                  style={{ flex: 0.72, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <Repeat size={15} color="#EDE7D8" />
                  <Text style={{ color: '#EDE7D8', fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>Swap</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleCook(heroRecipe.id)}
                  style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#1B1204', fontSize: 14, fontFamily: theme.fonts.bodySemibold }}>▶ Cook this</Text>
                </Pressable>
                <Pressable
                  onPress={handleSkip}
                  style={{ flex: 0.72, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <X size={15} color="#EDE7D8" />
                  <Text style={{ color: '#EDE7D8', fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>Skip</Text>
                </Pressable>
              </View>
            </LinearGradient>
          ) : (
            <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 20, paddingHorizontal: 20, paddingVertical: 28, alignItems: 'center', overflow: 'hidden' }, cardShadow]}>
              <View style={{ marginBottom: 12, height: 48, width: 48, borderRadius: 999, backgroundColor: 'rgba(232,163,23,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={20} color={theme.primaryLight} />
              </View>
              <Text style={{ color: '#FDF6E9', fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>No suggestion right now</Text>
              <Text style={{ marginTop: 4, color: '#C9CEDD', fontSize: 12, textAlign: 'center' }}>Recipe search may be temporarily unavailable.</Text>
              <Pressable onPress={() => router.push('/(tabs)/explore')} style={{ marginTop: 12, borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10 }}>
                <Text style={{ color: '#1B1204', fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>Browse Explore</Text>
              </Pressable>
            </LinearGradient>
          )}
        </View>

        <Pressable onPress={() => setShowFullDay((value) => !value)} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={14} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: theme.fonts.bodySemibold }}>View full day</Text>
          {showFullDay ? <ChevronUp size={14} color={theme.textSecondary} /> : <ChevronDown size={14} color={theme.textSecondary} />}
        </Pressable>

        {showFullDay ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            {mealTypeOrder.map((type) => {
              const meal = todayMeals.find((item) => item.type === type);
              if (meal) {
                return (
                  <Pressable key={type} onPress={() => setSheetTarget({ day: mondayIndex, meal })} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 12 }, cardShadow]}>
                    <Text style={{ fontSize: 22 }}>{meal.emoji || mealEmoji[type]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 10, fontFamily: theme.fonts.bodySemibold, textTransform: 'uppercase' }}>{type}</Text>
                      <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: theme.fonts.bodySemibold }}>{meal.name}</Text>
                    </View>
                  </Pressable>
                );
              }
              // Snack has no time window, so it's never tracked in dayStatus --
              // a "missed"/"skipped" tag only ever applies to Breakfast/Lunch/Dinner.
              const status = dayStatus[type];
              if (status !== 'missed' && status !== 'skipped') return null;
              return (
                <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 12, opacity: 0.6 }}>
                  <Text style={{ fontSize: 22 }}>{mealEmoji[type]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: theme.fonts.bodySemibold, textTransform: 'uppercase' }}>{type}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.bodyMedium }}>{status === 'missed' ? 'Missed' : 'Skipped'}</Text>
                  </View>
                </View>
              );
            })}
            {/* Standing add, always available regardless of the time-window model
                below -- this is how snacks (which don't fit a time window) get
                added, and how any meal can be added outside its normal window. */}
            <Pressable
              onPress={() => setSheetTarget({ day: mondayIndex, meal: null, initialType: 'Snack' })}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border, paddingVertical: 14 }}
            >
              <Text style={{ color: theme.primary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>+ Add to today</Text>
            </Pressable>
          </View>
        ) : null}

        {/* From your kitchen -- pantry items needing attention (expiring or unconfirmed) */}
        {kitchenAttentionItems.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ChefHat size={16} color={theme.primary} />
                <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: theme.fonts.headingSemibold }}>From your kitchen</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/pantry')}>
                <Text style={{ color: theme.primary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>See all</Text>
              </Pressable>
            </View>
            <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -8 }}
          contentContainerStyle={{ gap: 8, paddingLeft: 8, paddingRight: 0 }}
        >
              {kitchenAttentionItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push('/(tabs)/pantry')}
                  style={[{ width: 168, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 12 }, cardShadow]}
                >
                  <Text style={{ fontSize: 22 }}>{item.emoji || '📦'}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>{item.name}</Text>
                    <Text numberOfLines={1} style={{ marginTop: 2, color: theme.textMuted, fontSize: 11 }}>{pantryAttentionMeta(item)}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Secondary recipe rows */}
        <RecipeRow
          title="Use It Up"
          icon={<Flame size={16} color={theme.primary} />}
          recipes={useItUpRow}
          loading={rowsLoading}
          savedRecipeIds={savedRecipeIds}
          onToggleSave={toggleSavedRecipe}
          theme={theme}
        />
        <RecipeRow
          title="Quick this week"
          icon={<ChefHat size={16} color={theme.primary} />}
          recipes={quickRow}
          loading={rowsLoading}
          savedRecipeIds={savedRecipeIds}
          onToggleSave={toggleSavedRecipe}
          theme={theme}
        />

        {/* Saved for later -- already-saved recipes, per the storage rule this is
            just id/title/thumbnail, not full content. */}
        {savedForLaterLoading || savedForLater.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bookmark size={16} color={theme.primary} />
                <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: theme.fonts.headingSemibold }}>Saved for later</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/explore')}>
                <Text style={{ color: theme.primary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>See all</Text>
              </Pressable>
            </View>
            {savedForLaterLoading ? (
              <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -8 }}
          contentContainerStyle={{ gap: 8, paddingLeft: 8, paddingRight: 0 }}
        >
                {savedForLater.map((recipe) => (
                  <Pressable
                    key={recipe.id}
                    onPress={() => router.push(`/recipe/${recipe.id}`)}
                    style={[{ width: 160, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, cardShadow]}
                  >
                    <View style={{ height: 100 }}>
                      <Image source={recipe.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                    <View style={{ padding: 12 }}>
                      <Text numberOfLines={2} style={{ color: theme.textPrimary, fontSize: 13, fontFamily: theme.fonts.bodySemibold, lineHeight: 17, minHeight: 34 }}>
                        {recipe.title}
                      </Text>
                      <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 11 }}>{recipe.badge}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {becauseRow ? (
          <RecipeRow
            title={`Because You Cooked ${becauseRow.title}`}
            icon={<Flame size={16} color={theme.primary} />}
            recipes={becauseRow.recipes}
            loading={rowsLoading}
            savedRecipeIds={savedRecipeIds}
            onToggleSave={toggleSavedRecipe}
            theme={theme}
          />
        ) : null}

        {/* Recently viewed -- local-only view log (services/recentlyViewedService.ts),
            not synced to Supabase; nothing else in the app tracks recipe *views*
            (only cook_logs, tied to completing Cook Mode). */}
        {recentlyViewed.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock3 size={16} color={theme.primary} />
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: theme.fonts.headingSemibold }}>Recently viewed</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -8 }}
              contentContainerStyle={{ gap: 8, paddingLeft: 8, paddingRight: 0 }}
            >
              {recentlyViewed.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/recipe/${item.id}`)}
                  style={[{ width: 160, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, cardShadow]}
                >
                  <View style={{ height: 100 }}>
                    <Image source={item.image ?? getRecipePrimaryImage(null, item.id)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  </View>
                  <View style={{ padding: 12 }}>
                    <Text numberOfLines={2} style={{ color: theme.textPrimary, fontSize: 13, fontFamily: theme.fonts.bodySemibold, lineHeight: 17, minHeight: 34 }}>
                      {item.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        </ScrollView>
      </View>
      {sheetTarget ? (
        <MealSheet
          week="thisWeek"
          day={sheetTarget.day}
          dayLabel="Today"
          meal={sheetTarget.meal}
          initialType={sheetTarget.initialType}
          onClose={() => setSheetTarget(null)}
        />
      ) : null}
    </Screen>
  );
}

function RecipeRow({
  title,
  icon,
  recipes,
  loading,
  savedRecipeIds,
  onToggleSave,
  theme,
}: {
  title: string;
  icon: React.ReactNode;
  recipes: SearchRecipeCard[];
  loading: boolean;
  savedRecipeIds: Set<string>;
  onToggleSave: (id: string, meta?: { title: string; image: string | null }) => void;
  theme: ReturnType<typeof useThemeTokens>;
}) {
  if (!loading && recipes.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon}
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: theme.fonts.headingSemibold }}>{title}</Text>
      </View>
      {loading ? (
        <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -8 }}
          contentContainerStyle={{ gap: 8, paddingLeft: 8, paddingRight: 0 }}
        >
          {recipes.map((recipe) => {
            const isSaved = savedRecipeIds.has(recipe.id);
            const badge = badgePillStyle(recipe.badgeColor);
            return (
              <Pressable
                key={recipe.id}
                onPress={() => router.push(`/recipe/${recipe.id}`)}
                style={[{ width: 200, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, cardShadow]}
              >
                <View style={{ height: 100 }}>
                  <Image source={recipe.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <Pressable
                    onPress={() => onToggleSave(recipe.id, { title: recipe.title, image: recipe.image })}
                    style={{ position: 'absolute', top: 8, right: 8, height: 28, width: 28, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Bookmark size={13} color={isSaved ? theme.primary : '#FFFFFF'} fill={isSaved ? theme.primary : 'none'} />
                  </Pressable>
                </View>
                <View style={{ padding: 12 }}>
                  <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: badge.backgroundColor }}>
                    <Text style={{ color: badge.color, fontSize: 9, fontFamily: theme.fonts.bodySemibold }}>{recipe.badge}</Text>
                  </View>
                  <Text numberOfLines={2} style={{ marginTop: 6, color: theme.textPrimary, fontSize: 13, fontFamily: theme.fonts.bodySemibold, lineHeight: 17, minHeight: 34 }}>
                    {recipe.title}
                  </Text>
                  <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 11 }}>{recipe.cookTime} · {recipe.matched}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
