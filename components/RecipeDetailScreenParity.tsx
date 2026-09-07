import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, Check, Heart, Minus, Plus, Share2 } from 'lucide-react-native';
import { Screen } from './layout/Screen';
import { useThemeTokens } from '../lib/theme';
import { useAppStore, getPantryInventoryNames } from '../store/app-store';
import type { RecipeDetailRecord, ShoppingListItem } from '../store/recipe-types';
import { recipeService } from '../services/recipeService';
import { recentlyViewedService } from '../services/recentlyViewedService';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';

function scaleQuantity(quantity: string, from: number, to: number) {
  const factor = to / from;
  const match = quantity.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return quantity;
  return `${Math.round(Number(match[1]) * factor * 100) / 100}${match[2]}`;
}

export function RecipeDetailScreenParity() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string }>();
  const savedRecipeIds = useAppStore((state) => state.savedRecipeIds);
  const toggleSavedRecipe = useAppStore((state) => state.toggleSavedRecipe);
  const saveRecipeShoppingList = useAppStore((state) => state.saveRecipeShoppingList);
  const historyEntries = useAppStore((state) => state.cookingHistoryEntries);
  const pantryItems = useAppStore((state) => state.pantryItems);

  const [recipe, setRecipe] = useState<RecipeDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [servings, setServings] = useState(2);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showShoppingSheet, setShowShoppingSheet] = useState(false);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [stickyBarHeight, setStickyBarHeight] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Reuses the exact hide/show state machine (thresholds, idle-reveal, the works)
  // that drives Home/Kitchen/Explore's collapsing headers -- it's direction-agnostic
  // internally, so the button below just negates the sign to hide *downward*
  // instead of upward, and feeds it the button's own height instead of a header's.
  const { onScroll: onHideScroll, onScrollEndDrag: onHideScrollEndDrag, onMomentumScrollEnd: onHideMomentumScrollEnd, onCollapsibleLayout: onStickyBarLayout, headerStyle: hideUpStyle } = useCollapsibleHeader();
  const stickyBarTranslateY = Animated.multiply(hideUpStyle.transform[0].translateY, -1);

  const pantryNames = useMemo(() => getPantryInventoryNames(pantryItems), [pantryItems]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void recipeService
      .getRecipeDetail(params.id, pantryNames)
      .then((data) => {
        if (!active) return;
        setRecipe(data);
        setServings(data?.servings ?? 2);
        if (data) void recentlyViewedService.recordView({ id: data.id, title: data.title, image: data.images[0] ?? null });
      })
      .catch(() => {
        if (!active) return;
        setRecipe(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id, pantryNames]);

  const historyEntry = historyEntries.find((entry) => entry.recipeId === params.id || entry.recipeId === recipe?.id);

  const ingredientRows = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((ingredient, index) => ({
      id: `${recipe.id}-${index}`,
      name: ingredient.name,
      quantity: scaleQuantity(ingredient.quantity, recipe.servings, servings),
      have: pantryNames.some((item) => item.toLowerCase() === ingredient.name.toLowerCase()),
    }));
  }, [recipe, servings, pantryNames]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#E8A020" />
        </View>
      </Screen>
    );
  }

  if (!recipe) return null;

  const imageCount = recipe.images.length;
  const heroChips = [
    recipe.prepTime,
    recipe.cookTime,
    recipe.totalTime,
    recipe.difficulty,
  ];
  const nutritionCards = recipe.nutrition ?? [];
  const openShoppingSheet = () => {
    // `checked` here means "include in the list I'm about to save" -- Need
    // items default included, Have items default excluded (already own them).
    // This is intentionally NOT the same "already purchased" meaning `checked`
    // carries once an item lands in the real Kitchen > Need list (see save below).
    setShoppingItems(
      ingredientRows.map((item) => ({
        id: `${recipe.id}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: item.name,
        quantity: item.quantity,
        category: 'Recipe Items',
        checked: !item.have,
      }))
    );
    setShowShoppingSheet(true);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        onScroll={onHideScroll}
        onScrollEndDrag={onHideScrollEndDrag}
        onMomentumScrollEnd={onHideMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: stickyBarHeight + 16 }}
      >
        <View style={{ position: 'relative', height: 400 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)))}
            scrollEventThrottle={16}
          >
            {recipe.images.map((image, index) => (
              <View key={`${recipe.id}-${index}`} style={{ width, height: 400, overflow: 'hidden' }}>
                <Image source={image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.22)' }} />
              </View>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', left: 16, right: 16, top: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.85)' }}>
              <ArrowLeft size={18} color="#14213D" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => Share.share({ message: `${recipe.title}\n\n${recipe.description}` })} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.85)' }}>
                <Share2 size={18} color="#14213D" />
              </Pressable>
              <Pressable onPress={() => toggleSavedRecipe(recipe.id, { title: recipe.title, image: recipe.images[0] ?? null })} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.85)' }}>
                <Bookmark size={18} color={savedRecipeIds.has(recipe.id) ? theme.primary : '#14213D'} fill={savedRecipeIds.has(recipe.id) ? theme.primary : 'none'} />
              </Pressable>
            </View>
          </View>
          {historyEntry?.favorite ? (
            <View style={{ position: 'absolute', bottom: 120, right: 8, height: 28, width: 28, borderRadius: 999, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          ) : null}
          <View style={{ position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ width: '100%', paddingHorizontal: 8 }}>
              <View style={{ borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(17,16,8,0.88)', padding: 18 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ borderRadius: 999, backgroundColor: recipe.badgeColor === 'green' ? 'rgba(46, 204, 113, 0.16)' : 'rgba(232, 160, 32, 0.16)', paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: recipe.badgeColor === 'green' ? '#2ECC71' : '#E8A020', fontSize: 11, fontWeight: '700' }}>{recipe.badge}</Text>
                  </View>
                  <View style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{recipe.matched}</Text>
                  </View>
                  <View style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{imageCount} photos</Text>
                  </View>
                </View>
                <Text style={{ marginTop: 10, color: '#FFFFFF', fontSize: 20, fontWeight: '800', lineHeight: 26 }}>{recipe.title}</Text>
                <Text numberOfLines={descriptionExpanded ? undefined : 2} style={{ marginTop: 8, color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 20 }}>
                  {recipe.description}
                </Text>
                {recipe.description && recipe.description.length > 75 ? (
                  <Pressable onPress={() => setDescriptionExpanded((value) => !value)}>
                    <Text style={{ marginTop: 4, color: '#E8A020', fontSize: 12, fontWeight: '700' }}>
                      {descriptionExpanded ? 'Show less' : 'Read more'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
              {recipe.images.map((_, index) => (
                <View key={`${recipe.id}-dot-${index}`} style={{ height: 8, width: 8, borderRadius: 999, backgroundColor: index === galleryIndex ? '#E8A020' : 'rgba(255,255,255,0.5)' }} />
              ))}
            </View>
          </View>
        </View>
        <View style={{ marginTop: -18, paddingHorizontal: 8 }}>
          <View style={{ borderRadius: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16, shadowColor: '#000', shadowOpacity: theme.theme === 'dark' ? 0.18 : 0.06, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 2 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {heroChips.map((item) => (
                <View key={item} style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, borderRadius: 20, backgroundColor: theme.theme === 'dark' ? '#1C1A14' : '#FBF8F2', padding: 14 }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Recipe match</Text>
                <Text style={{ marginTop: 6, color: theme.textPrimary, fontSize: 16, fontWeight: '700' }}>{recipe.matched}</Text>
                <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12 }}>
                  {pantryNames.length > 0
                    ? `${ingredientRows.filter((ingredient) => pantryNames.some((item) => item.toLowerCase() === ingredient.name.toLowerCase())).length} ingredients match your pantry`
                    : 'No pantry items yet, so this recipe starts as a clean shopping list.'}
                </Text>
              </View>
              <View style={{ width: 110, borderRadius: 20, backgroundColor: theme.theme === 'dark' ? '#1C1A14' : '#FBF8F2', padding: 14 }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Calories</Text>
                <Text style={{ marginTop: 6, color: theme.textPrimary, fontSize: 20, fontWeight: '800' }}>{recipe.calories}</Text>
                <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12 }}>Per serving</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Servings</Text>
                <Text style={{ marginTop: 4, color: theme.textPrimary, fontSize: 18, fontWeight: '700' }}>{servings} people</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 999, backgroundColor: theme.cream, padding: 6 }}>
                <Pressable onPress={() => setServings((value) => Math.max(1, value - 1))} style={{ height: 34, width: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: theme.surface }}>
                  <Minus size={16} color={theme.textPrimary} />
                </Pressable>
                <Text style={{ minWidth: 26, textAlign: 'center', color: theme.textPrimary, fontSize: 15, fontWeight: '700' }}>{servings}</Text>
                <Pressable onPress={() => setServings((value) => value + 1)} style={{ height: 34, width: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: theme.surface }}>
                  <Plus size={16} color={theme.textPrimary} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 12 }}>
            <View style={{ flexDirection: 'row', backgroundColor: theme.cream, borderRadius: 18, padding: 4 }}>
              {(['ingredients', 'steps'] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: active ? theme.surface : 'transparent',
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: active ? theme.textPrimary : theme.textMuted, fontSize: 13, fontWeight: active ? '700' : '600' }}>
                      {tab === 'ingredients' ? 'Ingredients' : 'Steps'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {activeTab === 'ingredients' ? (
              <View style={{ marginTop: 16, gap: 8 }}>
                {ingredientRows.map((ingredient) => (
                  <View
                    key={ingredient.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: ingredient.have ? '#2ECC71' : theme.border,
                      backgroundColor: theme.background,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                    }}
                  >
                    <View style={{ height: 24, width: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: ingredient.have ? '#2ECC71' : theme.cream }}>
                      {ingredient.have ? <Check size={13} color="#FFFFFF" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>{ingredient.name}</Text>
                      <Text style={{ marginTop: 3, color: ingredient.have ? '#2ECC71' : theme.textMuted, fontSize: 12, fontWeight: ingredient.have ? '600' : '400' }}>
                        {ingredient.have ? 'In your Kitchen' : 'Need to buy'}
                      </Text>
                    </View>
                    <View style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{ingredient.quantity || 'As needed'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ marginTop: 16, gap: 12 }}>
                {recipe.steps.map((step) => (
                  <View
                    key={`${recipe.id}-step-${step.stepNumber}`}
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.theme === 'dark' ? '#17150F' : '#FCFAF6',
                      padding: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ height: 30, width: 30, borderRadius: 999, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{step.stepNumber}</Text>
                        </View>
                        <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Step {step.stepNumber}</Text>
                      </View>
                      {step.durationMins ? (
                        <View style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{step.durationMins} min</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ marginTop: 12, color: theme.textPrimary, fontSize: 15, lineHeight: 24 }}>{step.instruction}</Text>
                    {step.tip ? (
                      <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: theme.cream, padding: 12 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Tip</Text>
                        <Text style={{ marginTop: 4, color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>{step.tip}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700' }}>Shopping List</Text>
                <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12 }}>
                  {ingredientRows.length > 0 ? `${ingredientRows.length} ingredients in this recipe.` : 'No ingredients available for this recipe.'}
                </Text>
              </View>
              <Pressable onPress={openShoppingSheet} style={{ borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 12 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Generate Shopping List</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ingredientRows.slice(0, 4).map((item) => (
                <View key={item.id} style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    {item.name}
                    {item.quantity ? ` • ${item.quantity}` : ''}
                  </Text>
                </View>
              ))}
              {ingredientRows.length > 4 ? (
                <View style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>+{ingredientRows.length - 4} more</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700' }}>Nutrition</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>Per serving</Text>
            </View>
            <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {nutritionCards.map((item) => (
                <View key={item.label} style={{ width: '47.5%', borderRadius: 20, backgroundColor: theme.theme === 'dark' ? '#17150F' : '#FCFAF6', padding: 16 }}>
                  <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</Text>
                  <Text style={{ marginTop: 6, color: theme.textPrimary, fontSize: 22, fontWeight: '800' }}>{item.value}</Text>
                  <View style={{ marginTop: 12, height: 4, overflow: 'hidden', borderRadius: 999, backgroundColor: theme.cream }}>
                    <View style={{ height: '100%', width: `${item.percent}%`, borderRadius: 999, backgroundColor: theme.primary }} />
                  </View>
                </View>
              ))}
            </View>
            <Text style={{ marginTop: 10, color: theme.textMuted, fontSize: 12 }}>These values are stored with the recipe and are easy to scan at a glance.</Text>
          </View>

          <View style={{ marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700' }}>Equipment</Text>
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(recipe.equipment.length > 0 ? recipe.equipment : ['Pan', 'Knife', 'Cutting Board']).map((item) => (
                <View key={item} style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700' }}>Tags</Text>
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {recipe.tags.length > 0 ? (
                recipe.tags.map((tag) => (
                  <View key={tag} style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 8 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>No tags available for this recipe.</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <Animated.View
        onLayout={(event) => {
          setStickyBarHeight(event.nativeEvent.layout.height);
          onStickyBarLayout(event);
        }}
        style={[
          { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 8, paddingTop: 12, paddingBottom: Math.max(insets.bottom - 16, 8), backgroundColor: theme.background },
          { transform: [{ translateY: stickyBarTranslateY }] },
        ]}
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => router.push(`/cook/${recipe.id}`)} style={{ flex: 1, borderRadius: 999, backgroundColor: theme.primary, paddingVertical: 15 }}>
            <Text style={{ textAlign: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Start Cooking</Text>
          </Pressable>
        </View>
      </Animated.View>
      {showShoppingSheet ? (
        <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowShoppingSheet(false)} />
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.surface, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: theme.border }} />
            <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '800' }}>Shopping List Builder</Text>
                <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12 }}>{shoppingItems.filter((item) => item.checked).length} selected</Text>
              </View>
              <Pressable
                onPress={() =>
                  Share.share({
                    message: shoppingItems
                      .filter((item) => item.checked)
                      .map((item) => `${item.name} - ${item.quantity}`)
                      .join('\n'),
                  })
                }
              >
                <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>Copy All</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
              {shoppingItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setShoppingItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, checked: !entry.checked } : entry)))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: item.checked ? theme.primary : theme.border, backgroundColor: theme.background, opacity: item.checked ? 1 : 0.65, paddingHorizontal: 14, paddingVertical: 14 }}
                >
                  <View style={{ height: 22, width: 22, borderRadius: 999, borderWidth: 2, borderColor: item.checked ? theme.primary : theme.border, backgroundColor: item.checked ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {item.checked ? <Check size={12} color="#FFFFFF" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: item.checked ? theme.textPrimary : theme.textMuted, fontSize: 14, fontWeight: '600', textDecorationLine: item.checked ? 'none' : 'line-through' }}>{item.name}</Text>
                    <Text style={{ marginTop: 2, color: theme.textMuted, fontSize: 12 }}>{item.checked ? item.category : 'Already in your Kitchen'}</Text>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>{item.quantity}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => {
                // `checked` above means "included in the list I'm saving" -- once
                // saved, `checked` switches meaning to "already purchased" (per
                // NeedView/ShoppingScreen), so every saved item must start false.
                const selectedItems = shoppingItems.filter((item) => item.checked).map((item) => ({ ...item, checked: false }));
                if (selectedItems.length === 0) return;
                saveRecipeShoppingList({
                  id: `recipe-list-${recipe.id}`,
                  recipeId: recipe.id,
                  recipeTitle: recipe.title,
                  createdAt: Date.now(),
                  items: selectedItems,
                });
                setShowShoppingSheet(false);
                router.push('/(tabs)/pantry?view=need');
              }}
              style={{ marginTop: 16, height: 52, borderRadius: 26, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Save Selected to Shopping List</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

