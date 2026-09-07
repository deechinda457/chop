import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpDown, Bookmark, Heart, Search, X } from 'lucide-react-native';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import { recipeService } from '../../services/recipeService';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/layout';

const filters = ['All', 'Can Make Now', 'Use It Up', 'Recently Saved'] as const;
const sortOptions = ['Recently Saved', 'A-Z', 'Cook Time', 'Calories'] as const;

type SavedRecipeCard = Awaited<ReturnType<typeof recipeService.getSavedRecipeCards>>[number];

export function SavedRecipesScreen() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { onScroll, onScrollEndDrag, onMomentumScrollEnd, onGroupLayout, onCollapsibleLayout, reserveHeight, headerStyle } = useCollapsibleHeader();
  const savedRecipeIds = useAppStore((state) => state.savedRecipeIds);
  const toggleSavedRecipe = useAppStore((state) => state.toggleSavedRecipe);
  const historyEntries = useAppStore((state) => state.cookingHistoryEntries);
  const pantryItems = useAppStore((state) => state.pantryItems);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All');
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]>('Recently Saved');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeCard[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void recipeService
      .getSavedRecipeCards()
      .then((data) => {
        if (!active) return;
        setSavedRecipes(data);
      })
      .catch(() => {
        if (!active) return;
        setSavedRecipes([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [savedRecipeIds]);

  const pantryNames = useMemo(() => new Set(pantryItems.map((item) => item.name.toLowerCase())), [pantryItems]);
  const expiringNames = useMemo(
    () => new Set(pantryItems.filter((item) => item.daysLeft <= 3).map((item) => item.name.toLowerCase())),
    [pantryItems]
  );

  const getCategory = useCallback((recipe: SavedRecipeCard) => {
    const names = recipe.ingredientNames.map((item) => item.toLowerCase());
    if (names.some((name) => expiringNames.has(name))) return 'Use It Up';
    const pantryMatches = names.filter((name) => pantryNames.has(name)).length;
    if (names.length > 0 && pantryMatches >= Math.max(1, Math.ceil(names.length / 2))) return 'Can Make Now';
    return 'Recently Saved';
  }, [expiringNames, pantryNames]);

  const visibleRecipes = useMemo(() => {
    let next = savedRecipes.map((recipe) => ({ ...recipe, category: getCategory(recipe) }));
    if (activeFilter !== 'All') next = next.filter((recipe) => recipe.category === activeFilter);
    const query = searchQuery.trim().toLowerCase();
    if (query) next = next.filter((recipe) => recipe.title.toLowerCase().includes(query));
    if (sortBy === 'A-Z') next = [...next].sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'Cook Time') next = [...next].sort((a, b) => parseInt(a.cookTime, 10) - parseInt(b.cookTime, 10));
    else if (sortBy === 'Calories') next = [...next].sort((a, b) => parseInt(a.calories, 10) - parseInt(b.calories, 10));
    else next = [...next].sort((a, b) => b.savedAt - a.savedAt);
    return next;
  }, [activeFilter, savedRecipes, sortBy, getCategory, searchQuery]);

  return (
    <View style={{ flex: 1 }}>
      {/* Fixed: heading + count + search toggle. Stays put while the filter row
          below collapses, per the "heading stays fixed" instruction. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: theme.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '700' }}>Saved Recipes</Text>
            <View style={{ borderRadius: 999, backgroundColor: '#FFF8EC', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{visibleRecipes.length}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setSearchOpen((value) => !value)}
            style={{ height: 40, width: 40, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            {searchOpen ? <X size={18} color={theme.textSecondary} /> : <Search size={18} color={theme.textSecondary} />}
          </Pressable>
        </View>
        {searchOpen ? (
          <View style={{ marginTop: 12, height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 14 }}>
            <Search size={16} color={theme.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search saved recipes..."
              placeholderTextColor={theme.textSecondary}
              autoFocus
              style={{ flex: 1, color: theme.textPrimary, fontSize: 14 }}
            />
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, overflow: 'hidden' }}>
        {/* Collapsible: filter row. "Filter" (opens the sort sheet -- same feature
            as before, moved from an icon into this row as a chip) comes first,
            then the category chips. */}
        <Animated.View
          onLayout={(event) => {
            onGroupLayout(event);
            onCollapsibleLayout(event);
          }}
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, backgroundColor: theme.background, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12 }, headerStyle]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable
              onPress={() => setShowSortSheet(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 8, paddingVertical: 8 }}
            >
              <ArrowUpDown size={13} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>Filter</Text>
            </Pressable>
            {filters.map((filter) => {
              const active = activeFilter === filter;
              return (
                <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={{ borderRadius: 999, borderWidth: 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.surface, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 13, fontWeight: '500' }}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: reserveHeight, paddingBottom: 120 + TAB_BAR_CONTENT_HEIGHT + insets.bottom }}
        >
          <View style={{ paddingHorizontal: 8 }}>
            {loading ? (
              <View style={{ minHeight: 320, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#E8A020" />
              </View>
            ) : visibleRecipes.length === 0 ? (
              <View style={{ minHeight: 440, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ marginBottom: 20, height: 96, width: 96, borderRadius: 999, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' }}>
                  <Bookmark size={34} color={theme.primary} />
                </View>
                <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '600' }}>No saved recipes yet</Text>
                <Pressable onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16, borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 12 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Explore Recipes</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 }}>
                {visibleRecipes.map((recipe) => (
                  <Pressable key={recipe.id} onPress={() => router.push(`/recipe/${recipe.id}`)} style={{ width: '48%', overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
                    <View style={{ position: 'relative', height: 150 }}>
                      <Image source={recipe.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      <Pressable
                        onPress={() => {
                          toggleSavedRecipe(recipe.id);
                          setSavedRecipes((current) => current.filter((entry) => entry.id !== recipe.id));
                        }}
                        style={{ position: 'absolute', top: 12, right: 12, height: 32, width: 32, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Bookmark size={16} color={theme.primary} fill={theme.primary} />
                      </Pressable>
                      {historyEntries.find((entry) => entry.recipeId === recipe.id)?.favorite ? (
                        <View style={{ position: 'absolute', left: 12, top: 12, height: 28, width: 28, borderRadius: 999, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center' }}>
                          <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                    <View style={{ padding: 12 }}>
                      <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: recipe.category === 'Can Make Now' ? 'rgba(46,204,113,0.15)' : 'rgba(232,160,32,0.15)' }}>
                        <Text style={{ color: recipe.category === 'Can Make Now' ? '#2ECC71' : theme.primary, fontSize: 10, fontWeight: '700' }}>{recipe.category}</Text>
                      </View>
                      <Text numberOfLines={2} style={{ marginTop: 8, color: theme.textPrimary, fontSize: 14, fontWeight: '600', lineHeight: 20, minHeight: 40 }}>{recipe.title}</Text>
                      <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 11 }}>{recipe.calories} · {recipe.cookTime}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {showSortSheet ? (
        <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowSortSheet(false)} />
          <View style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 28 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: '#D1D5DB' }} />
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ArrowUpDown size={18} color="#666666" />
              <Text style={{ color: '#1A1814', fontSize: 18, fontWeight: '600' }}>Sort Recipes</Text>
            </View>
            <View style={{ gap: 8 }}>
              {sortOptions.map((option) => {
                const active = sortBy === option;
                return (
                  <Pressable key={option} onPress={() => { setSortBy(option); setShowSortSheet(false); }} style={{ borderRadius: 16, borderWidth: 1, borderColor: active ? theme.primary : '#E8E2D8', backgroundColor: active ? '#F5F0E8' : '#FFFFFF', paddingHorizontal: 8, paddingVertical: 14 }}>
                    <Text style={{ color: '#1A1814', fontSize: 14, fontWeight: '500' }}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
