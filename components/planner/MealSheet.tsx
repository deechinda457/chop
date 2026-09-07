import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, Repeat, Search, Trash2 } from 'lucide-react-native';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore, type PlannedMeal } from '../../store/app-store';
import { recipeService } from '../../services/recipeService';

const mealTypeOrder: PlannedMeal['type'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const mealEmoji: Record<PlannedMeal['type'], string> = {
  Breakfast: '🥑',
  Lunch: '🍜',
  Dinner: '🍽️',
  Snack: '🥜',
};

type PlannerRecipe = Awaited<ReturnType<typeof recipeService.searchSpoonacularRecipes>>[number];

// Shared by Home's "View full day" expansion and the Planner's day list, so
// meal management (view/swap/remove/add) behaves identically everywhere it
// appears rather than being reimplemented per screen.
export function MealSheet({
  week,
  day,
  dayLabel,
  meal,
  initialType,
  restrictToTypes,
  onClose,
}: {
  week: 'thisWeek' | 'nextWeek';
  day: number;
  dayLabel: string;
  meal: PlannedMeal | null;
  initialType?: PlannedMeal['type'];
  restrictToTypes?: PlannedMeal['type'][];
  onClose: () => void;
}) {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const setMealSlot = useAppStore((state) => state.setMealSlot);
  const clearMealSlot = useAppStore((state) => state.clearMealSlot);
  const [mode, setMode] = useState<'options' | 'picker'>(meal ? 'options' : 'picker');
  const [selectedType, setSelectedType] = useState<PlannedMeal['type']>(meal?.type ?? initialType ?? 'Snack');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<PlannerRecipe[]>([]);
  const [searched, setSearched] = useState(false);

  const typeChips = restrictToTypes ?? mealTypeOrder;

  useEffect(() => {
    if (mode === 'picker' && !searched) runSearch('');
    // Only ever fires once, right after mount, when opened directly in "add" mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = (query: string) => {
    setLoading(true);
    setSearched(true);
    void recipeService
      .searchSpoonacularRecipes({ query, number: 20 })
      .then((data) => setRecipes(data))
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false));
  };

  const openPicker = () => {
    setMode('picker');
    if (!searched) runSearch('');
  };

  const handleView = () => {
    if (!meal?.recipeId) return;
    const recipeId = meal.recipeId;
    onClose();
    router.push(`/recipe/${recipeId}`);
  };

  const handleRemove = () => {
    if (!meal) return;
    clearMealSlot(week, day, meal.type);
    onClose();
  };

  const handlePick = (recipe: PlannerRecipe) => {
    setMealSlot(week, day, selectedType, {
      id: `${week}-${day}-${selectedType}`,
      type: selectedType,
      name: recipe.title,
      emoji: mealEmoji[selectedType],
      time: recipe.cookTime,
      cal: recipe.calories,
      recipeId: recipe.id,
    });
    onClose();
  };

  return (
    // A plain absolutely-positioned View stacks within this component's own
    // render tree, so a tab screen's bottom nav bar (rendered by the Tab
    // Navigator as a sibling above individual screens) can cover it. Modal
    // renders in its own top-level native layer, always above everything --
    // same pattern Kitchen's add-item/coming-soon sheets already use.
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
      <Pressable style={{ position: 'absolute', inset: 0 }} onPress={onClose} />
      <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.surface, paddingHorizontal: 8, paddingTop: 12, paddingBottom: insets.bottom + 20 }}>
        <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: theme.border }} />

        {mode === 'options' && meal ? (
          <>
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>{meal.emoji || mealEmoji[meal.type]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: theme.fonts.bodySemibold, textTransform: 'uppercase' }}>{meal.type} · {dayLabel}</Text>
                <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>{meal.name}</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable
                onPress={handleView}
                disabled={!meal.recipeId}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 14, opacity: meal.recipeId ? 1 : 0.4 }}
              >
                <Eye size={18} color={theme.textPrimary} />
                <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: theme.fonts.bodyMedium }}>View recipe</Text>
              </Pressable>
              <Pressable onPress={openPicker} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 14 }}>
                <Repeat size={18} color={theme.textPrimary} />
                <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: theme.fonts.bodyMedium }}>Swap meal</Text>
              </Pressable>
              <Pressable onPress={handleRemove} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 14 }}>
                <Trash2 size={18} color="#E11D48" />
                <Text style={{ color: '#E11D48', fontSize: 14, fontFamily: theme.fonts.bodyMedium }}>Remove from plan</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={{ marginBottom: 14, color: theme.textPrimary, fontSize: 18, fontFamily: theme.fonts.headingBold }}>
              {meal ? `Swap ${dayLabel}'s ${meal.type.toLowerCase()}` : `Add to ${dayLabel}`}
            </Text>
            <View style={{ marginBottom: 14, flexDirection: 'row', gap: 8 }}>
              {typeChips.map((type) => {
                const active = selectedType === type;
                return (
                  <Pressable key={type} onPress={() => setSelectedType(type)} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primarySoft : theme.background, paddingVertical: 10 }}>
                    <Text style={{ textAlign: 'center', color: active ? theme.primary : theme.textSecondary, fontSize: 12, fontFamily: theme.fonts.bodySemibold }}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, paddingHorizontal: 14 }}>
              <Search size={16} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => runSearch(searchQuery)}
                returnKeyType="search"
                placeholder="Search recipes..."
                placeholderTextColor={theme.textMuted}
                style={{ flex: 1, color: theme.textPrimary, fontSize: 14 }}
              />
            </View>
            <ScrollView style={{ marginTop: 16, maxHeight: 320 }}>
              {loading ? (
                <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : recipes.length === 0 && searched ? (
                <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.body }}>No recipes found. Try a different search.</Text>
                </View>
              ) : (
                recipes.map((recipe) => (
                  <Pressable
                    key={recipe.id}
                    onPress={() => handlePick(recipe)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 12 }}
                  >
                    <View>
                      <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: theme.fonts.bodySemibold }}>{recipe.title}</Text>
                      <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12, fontFamily: theme.fonts.body }}>{recipe.calories}</Text>
                    </View>
                    <Text style={{ fontSize: 22 }}>{mealEmoji[selectedType]}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </>
        )}
      </View>
    </View>
    </Modal>
  );
}
