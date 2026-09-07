import { useState } from 'react';
import { router } from 'expo-router';
import { ArrowLeft, MoreHorizontal, Plus, Sparkles } from 'lucide-react-native';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore, type PlannedMeal } from '../../store/app-store';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { MealSheet } from './MealSheet';

type MealType = PlannedMeal['type'];
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const mealTypeOrder: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const EMPTY_MEALS: PlannedMeal[] = [];
const mealEmoji: Record<MealType, string> = {
  Breakfast: '🥑',
  Lunch: '🍜',
  Dinner: '🍽️',
  Snack: '🥜',
};

export function PlannerScreenParity() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { onScroll, onScrollEndDrag, onMomentumScrollEnd, onGroupLayout, onCollapsibleLayout, reserveHeight, headerStyle } = useCollapsibleHeader();
  const mealPlans = useAppStore((state) => state.mealPlans);
  const [activeWeek, setActiveWeek] = useState<'thisWeek' | 'nextWeek'>('thisWeek');
  const [sheetTarget, setSheetTarget] = useState<{ day: number; meal: PlannedMeal | null; initialType?: MealType } | null>(null);
  const [showAutoPlanNotice, setShowAutoPlanNotice] = useState(false);

  const today = new Date();
  const getDate = (offset: number) => {
    const d = new Date(today);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(today.getDate() + mondayOffset + (activeWeek === 'nextWeek' ? 7 : 0) + offset);
    return d;
  };

  const openAddForDay = (day: number) => {
    const dayMeals = mealPlans[activeWeek]?.[day] ?? EMPTY_MEALS;
    const filledTypes = new Set(dayMeals.map((meal) => meal.type));
    const missing = mealTypeOrder.find((mealType) => !filledTypes.has(mealType));
    setSheetTarget({ day, meal: null, initialType: missing ?? 'Dinner' });
  };

  return (
    <Screen edges={['left', 'right']}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {/* Group: back+title (collapses) + This Week/Next Week toggle (stays
            visible, rises to the top edge as the heading slides away above it
            -- same pattern as Kitchen's heading-collapses-but-toggle-stays).
            The back+title row carries insets.top itself (Screen no longer
            reserves the top edge) so the whole safe-area allowance slides
            away with it, instead of leaving a permanent strip behind. */}
        <Animated.View onLayout={onGroupLayout} style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, backgroundColor: theme.background }, headerStyle]}>
          <View onLayout={onCollapsibleLayout} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12 }}>
            <Pressable onPress={() => router.back()} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
              <ArrowLeft size={18} color={theme.textPrimary} />
            </Pressable>
            <Text style={{ color: theme.textPrimary, fontSize: 17, fontFamily: theme.fonts.headingSemibold }}>Weekly Meal Plan</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={{ paddingHorizontal: 8, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 4 }}>
              {(['thisWeek', 'nextWeek'] as const).map((week) => {
                const active = activeWeek === week;
                return (
                  <Pressable key={week} onPress={() => setActiveWeek(week)} style={{ flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? theme.primary : 'transparent' }}>
                    <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>{week === 'thisWeek' ? 'This Week' : 'Next Week'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 8, paddingTop: reserveHeight + 12, paddingBottom: 24 }}
        >
          <View style={{ gap: 10 }}>
            {dayLabels.map((label, dayIndex) => {
              const dayMeals = mealPlans[activeWeek]?.[dayIndex] ?? EMPTY_MEALS;
              const date = getDate(dayIndex);
              const isToday = activeWeek === 'thisWeek' && date.toDateString() === today.toDateString();

              return (
                <View key={label} style={{ flexDirection: 'row', gap: 12, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14 }}>
                  <View style={{ width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: isToday ? theme.primary : theme.cream, paddingVertical: 10 }}>
                    <Text style={{ color: isToday ? '#FFFFFF' : theme.textPrimary, fontSize: 17, fontFamily: theme.fonts.headingBold }}>{date.getDate()}</Text>
                    <Text style={{ color: isToday ? 'rgba(255,255,255,0.85)' : theme.textMuted, fontSize: 11, fontFamily: theme.fonts.bodyMedium }}>{label}</Text>
                  </View>

                  <View style={{ flex: 1, gap: 8 }}>
                    {dayMeals.length === 0 ? (
                      <Pressable onPress={() => openAddForDay(dayIndex)} style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.bodyMedium }}>Nothing planned yet</Text>
                        <View style={{ height: 22, width: 22, borderRadius: 999, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={13} color={theme.primary} />
                        </View>
                      </Pressable>
                    ) : (
                      <>
                        {mealTypeOrder
                          .map((type) => dayMeals.find((meal) => meal.type === type))
                          .filter((meal): meal is PlannedMeal => Boolean(meal))
                          .map((meal) => (
                            <Pressable key={meal.id} onPress={() => setSheetTarget({ day: dayIndex, meal })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: theme.background, paddingHorizontal: 10, paddingVertical: 8 }}>
                              <Text style={{ fontSize: 18 }}>{meal.emoji || mealEmoji[meal.type]}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: theme.fonts.bodySemibold, textTransform: 'uppercase' }}>{meal.type}</Text>
                                <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>{meal.name}</Text>
                                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: theme.fonts.body }}>{meal.time} · {meal.cal}</Text>
                              </View>
                              <MoreHorizontal size={16} color={theme.textMuted} />
                            </Pressable>
                          ))}
                        {dayMeals.length < mealTypeOrder.length ? (
                          <Pressable onPress={() => openAddForDay(dayIndex)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                            <Plus size={13} color={theme.primary} />
                            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: theme.fonts.bodySemibold }}>Add another meal</Text>
                          </Pressable>
                        ) : null}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: Math.max(insets.bottom - 16, 8), backgroundColor: theme.background }}>
        <Pressable
          onPress={() => setShowAutoPlanNotice(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 26, backgroundColor: theme.primary }}
        >
          <Sparkles size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Auto-plan my week</Text>
        </Pressable>
      </View>

      {showAutoPlanNotice ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 24 }}>
          <View style={{ width: '100%', borderRadius: 20, backgroundColor: theme.surface, padding: 20 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 18, fontFamily: theme.fonts.headingBold }}>Auto-plan — coming soon</Text>
            <Text style={{ marginTop: 8, color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.body }}>We&apos;re still building this. For now, add meals to your week manually.</Text>
            <Pressable onPress={() => setShowAutoPlanNotice(false)} style={{ marginTop: 18, height: 48, borderRadius: 24, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Got it</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {sheetTarget ? (
        <MealSheet
          week={activeWeek}
          day={sheetTarget.day}
          dayLabel={dayLabels[sheetTarget.day]}
          meal={sheetTarget.meal}
          initialType={sheetTarget.initialType}
          onClose={() => setSheetTarget(null)}
        />
      ) : null}
    </Screen>
  );
}
