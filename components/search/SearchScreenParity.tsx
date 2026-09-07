import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Bookmark, Camera, Clock3, Flame, Mic, Search, Sparkles, X } from 'lucide-react-native';
import { ActivityIndicator, Alert, Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/app-store';
import { useThemeTokens } from '../../lib/theme';
import { recipeService, type SearchRecipeCard } from '../../services/recipeService';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/layout';

const filterChips = ['All', 'Quick', 'Healthy', 'Vegetarian', 'High Protein', 'Low Carb', 'Dessert'];
const voiceQueries = ['quick chicken dinner under 30 minutes', 'something vegan with pasta', 'garlic onions tomatoes'];
const scanResults = [['Tomatoes', 'Garlic', 'Spinach'], ['Chicken Breast', 'Rice', 'Broccoli'], [] as string[]];

// Soft depth for cards, per CLAUDE.md's design system ("subtle depth via soft
// shadows/gradients rather than flat color blocks") — same shadow shape as
// KitchenScreen's FAB, tuned lighter for cards resting on the page.
const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function getCountLabel(count: number) {
  return `${count} ingredient${count === 1 ? '' : 's'}`;
}

function matchesFilter(recipe: SearchRecipeCard, filter: string) {
  const tags = recipe.tags.map((tag) => tag.toLowerCase());
  const title = recipe.title.toLowerCase();
  const cookTimeValue = parseInt(recipe.cookTime, 10);

  switch (filter) {
    case 'Quick':
      return !Number.isNaN(cookTimeValue) && cookTimeValue <= 30;
    case 'Healthy':
      return tags.some((tag) => ['healthy', 'low carb', 'high protein', 'vegetarian', 'vegan'].includes(tag));
    case 'Vegetarian':
      return tags.includes('vegetarian') || tags.includes('vegan');
    case 'High Protein':
      return tags.includes('high protein') || tags.includes('protein');
    case 'Low Carb':
      return tags.includes('low carb');
    case 'Dessert':
      return tags.includes('dessert') || title.includes('cake') || title.includes('cookie') || title.includes('dessert');
    default:
      return true;
  }
}

function getSpeechRecognitionConstructor() {
  const speechWindow = globalThis as typeof globalThis & {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function SearchScreenParity() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { onScroll, onScrollEndDrag, onMomentumScrollEnd, onGroupLayout, onCollapsibleLayout, reserveHeight, headerStyle } = useCollapsibleHeader();
  const savedRecipeIds = useAppStore((state) => state.savedRecipeIds);
  const toggleSavedRecipe = useAppStore((state) => state.toggleSavedRecipe);
  const pantryItems = useAppStore((state) => state.pantryItems);
  const searchDraft = useAppStore((state) => state.searchDraft);
  const setSearchDraft = useAppStore((state) => state.setSearchDraft);
  const [catalogRecipes, setCatalogRecipes] = useState<SearchRecipeCard[]>([]);
  const [currentResults, setCurrentResults] = useState<SearchRecipeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeIngredients, setActiveIngredients] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [searchChips, setSearchChips] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [showDetectedSheet, setShowDetectedSheet] = useState(false);
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [scanIndex, setScanIndex] = useState(0);
  const [lastCaptureSource, setLastCaptureSource] = useState<'camera' | 'gallery' | null>(null);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const pantryNames = pantryItems.map((item) => item.name);
    void recipeService
      .searchSpoonacularRecipes({ pantryNames })
      .then((data) => {
        if (!active) return;
        setCatalogRecipes(data);
        setCurrentResults(data);
      })
      .catch(() => {
        if (!active) return;
        setCatalogRecipes([]);
        setCurrentResults([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // Cached per query+ingredients (see recipeService.searchSpoonacularRecipes), so a
    // pantry edit re-running this effect recomputes match badges from cache instead
    // of re-spending Spoonacular API points on a fresh network call.
  }, [pantryItems]);

  const performSearch = useCallback(async (options?: { query?: string; ingredients?: string[] }) => {
    const query = options?.query?.trim() ?? keywordQuery.trim() ?? '';
    const ingredients = (options?.ingredients ?? searchChips).map((item) => item.trim()).filter(Boolean);
    const pantryNames = pantryItems.map((item) => item.name);
    setLoading(true);

    try {
      const matches = await recipeService.searchSpoonacularRecipes({ query, ingredients, pantryNames });
      setCurrentResults(matches);
      setCatalogRecipes((previous) => {
        const nextMap = new Map(previous.map((recipe) => [recipe.id, recipe]));
        for (const recipe of matches) nextMap.set(recipe.id, recipe);
        return Array.from(nextMap.values());
      });
    } catch {
      setCurrentResults([]);
    } finally {
      setLoading(false);
    }
  }, [keywordQuery, pantryItems, searchChips]);

  useEffect(() => {
    if (!searchDraft.trim()) return;
    setSearchInput(searchDraft);
    setKeywordQuery(searchDraft);
    setShowSuggestions(false);
    void performSearch({ query: searchDraft });
    setSearchDraft('');
  }, [searchDraft, performSearch, setSearchDraft]);

  const ingredientSuggestions = useMemo(() => {
    const pantryIngredients = Array.from(new Set(pantryItems.map((item) => item.name.trim()).filter(Boolean)));
    return pantryIngredients.slice(0, 12);
  }, [pantryItems]);

  const nextCameraSuggestions = useMemo(() => {
    if (ingredientSuggestions.length > 0) return ingredientSuggestions.slice(0, 5);
    return scanResults[scanIndex % scanResults.length];
  }, [ingredientSuggestions, scanIndex]);

  const runImageSearch = useCallback(
    async (source: 'camera' | 'gallery') => {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', source === 'camera' ? 'Camera access is required to scan ingredients.' : 'Photo access is required to pick an image.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });

      if (result.canceled) return;

      setCapturedImageUri(result.assets?.[0]?.uri ?? null);
      setLastCaptureSource(source);
      setScanIndex((value) => value + 1);
      setDetectedIngredients(nextCameraSuggestions);
      setShowCamera(false);
      setShowDetectedSheet(true);
    },
    [nextCameraSuggestions]
  );

  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
        if (!transcript) return;
        setSearchInput(transcript);
        setKeywordQuery(transcript);
        setSearchChips([]);
        setShowSuggestions(false);
        void performSearch({ query: transcript });
      };
      recognition.onerror = () => {
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.start();
      return;
    }

    setVoiceDraft(searchInput.trim());
    setShowVoiceSheet(true);
  }, [performSearch, searchInput]);

  const suggestions = useMemo(() => {
    if (!searchInput.trim() || searchChips.length > 0) return [];
    const pool = Array.from(new Set(catalogRecipes.flatMap((recipe) => [recipe.title, ...recipe.tags, ...recipe.ingredientNames])));
    return pool.filter((item) => item.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 6);
  }, [catalogRecipes, searchChips.length, searchInput]);

  const visibleRecipes = useMemo(() => {
    const keyword = keywordQuery.toLowerCase();
    return currentResults.filter((recipe) => {
      const chipMatches =
        searchChips.length === 0 ||
        searchChips.every((chip) => {
          const normalized = chip.toLowerCase();
          return (
            recipe.title.toLowerCase().includes(normalized) ||
            recipe.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
            recipe.ingredientNames.some((ingredient) => ingredient.toLowerCase().includes(normalized))
          );
        });

      const keywordMatches =
        !keyword ||
        recipe.title.toLowerCase().includes(keyword) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
        recipe.ingredientNames.some((ingredient) => ingredient.toLowerCase().includes(keyword));

      const filterMatches = activeFilter === 'All' || matchesFilter(recipe, activeFilter);

      const ingredientMatches =
        activeIngredients.size === 0 ||
        Array.from(activeIngredients).every((ingredient) =>
          recipe.ingredientNames.some((item) => item.toLowerCase().includes(ingredient.toLowerCase()))
        );

      return chipMatches && keywordMatches && filterMatches && ingredientMatches;
    });
  }, [activeFilter, activeIngredients, currentResults, keywordQuery, searchChips]);

  useEffect(() => {
    if (!isListening) return;
    const timer = setTimeout(() => {
      const transcript = voiceQueries[voiceIndex % voiceQueries.length];
      setSearchInput(transcript);
      setKeywordQuery(transcript);
      setSearchChips([]);
      setShowSuggestions(false);
      setIsListening(false);
      setVoiceIndex((current) => current + 1);
      void performSearch({ query: transcript });
    }, 1600);
    return () => clearTimeout(timer);
  }, [isListening, voiceIndex, performSearch]);

  const appendChip = (value: string) => {
    const trimmed = value.trim().replace(/,$/, '');
    if (!trimmed) return;
    setSearchChips((current) => [...current, trimmed]);
    setSearchInput('');
    setKeywordQuery('');
    setShowSuggestions(false);
  };

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View
        onLayout={(event) => {
          onGroupLayout(event);
          onCollapsibleLayout(event);
        }}
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, backgroundColor: theme.background, paddingTop: 8, paddingBottom: 8 }, headerStyle]}
      >
          <Text style={{ marginHorizontal: 16, marginBottom: 16, color: theme.textPrimary, fontFamily: theme.fonts.headingBold, fontSize: 24 }}>Discover Recipes</Text>
          <View style={{ paddingHorizontal: 8 }}>
          {searchChips.length > 0 ? <Text style={{ marginBottom: 4, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 11 }}>Searching by ingredients</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={[
                { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 8 },
                cardShadow,
              ]}
            >
              <Pressable
                onPress={() => {
                  const trimmed = searchInput.trim();
                  if (searchChips.length > 0) {
                    setKeywordQuery('');
                    setShowSuggestions(false);
                    void performSearch({ ingredients: searchChips });
                    return;
                  }
                  if (trimmed) {
                    setKeywordQuery(trimmed);
                    setSearchChips([]);
                    setShowSuggestions(false);
                    void performSearch({ query: trimmed });
                  }
                }}
              >
                <Search size={18} color={theme.textSecondary} />
              </Pressable>
              {!isListening ? (
                <TextInput
                  value={searchInput}
                  onChangeText={(value) => {
                    if (value.includes(',')) {
                      const segments = value.split(',');
                      const ready = segments.slice(0, -1).map((item) => item.trim()).filter(Boolean);
                      if (ready.length > 0) {
                        setSearchChips((current) => [...current, ...ready]);
                        setSearchInput(segments[segments.length - 1] ?? '');
                        setKeywordQuery('');
                        setShowSuggestions(false);
                        return;
                      }
                    }
                    setSearchInput(value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => { setIsFocused(true); setShowSuggestions(true); }}
                  onBlur={() => setIsFocused(false)}
                  placeholder="garlic, onion, tomato..."
                  placeholderTextColor={theme.textSecondary}
                  style={{ flex: 1, color: theme.textPrimary, fontFamily: theme.fonts.body, fontSize: 14 }}
                  onSubmitEditing={() => {
                    if (searchInput.includes(',') || searchChips.length > 0) {
                      appendChip(searchInput);
                      return;
                    }
                    const trimmed = searchInput.trim();
                    if (!trimmed) return;
                    setKeywordQuery(trimmed);
                    setSearchChips([]);
                    setShowSuggestions(false);
                    void performSearch({ query: trimmed });
                  }}
                />
              ) : (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                  {[10, 16, 12, 18, 9, 15, 11].map((height, index) => (
                    <View key={`${height}-${index}`} style={{ width: 4, height, borderRadius: 999, backgroundColor: theme.primary, opacity: index % 2 === 0 ? 1 : 0.45 }} />
                  ))}
                </View>
              )}
              {!isListening ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={startVoiceSearch}><Mic size={18} color={theme.primary} /></Pressable>
                  <Pressable onPress={() => setShowCamera(true)}><Camera size={18} color={theme.primary} /></Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setIsListening(false)}><X size={18} color={theme.primary} /></Pressable>
              )}
            </View>
            {searchChips.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{getCountLabel(searchChips.length)}</Text>
                </View>
                {searchChips.length >= 2 ? (
                  <Pressable onPress={() => { setSearchChips([]); setKeywordQuery(''); setSearchInput(''); setCurrentResults(catalogRecipes); }}><Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 12 }}>Clear All</Text></Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          {searchChips.length === 0 && isFocused && !isListening ? <Text style={{ marginTop: 8, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 12 }}>Separate ingredients with a comma</Text> : null}
          {isListening ? <Text style={{ marginTop: 8, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 12 }}>Listening...</Text> : null}
          {searchChips.length > 0 ? (
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {searchChips.map((chip) => (
                <View key={chip} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{chip}</Text>
                  <Pressable onPress={() => setSearchChips((current) => current.filter((item) => item !== chip))}><X size={12} color="#FFFFFF" /></Pressable>
                </View>
              ))}
            </View>
          ) : null}
          {showSuggestions && suggestions.length > 0 && !isListening && searchChips.length === 0 ? (
            <View style={[{ marginTop: 6, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, cardShadow]}>
              {suggestions.map((suggestion, index) => (
                <Pressable key={suggestion} onPress={() => { setSearchInput(suggestion); setKeywordQuery(suggestion); setShowSuggestions(false); void performSearch({ query: suggestion }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: index < suggestions.length - 1 ? 1 : 0, borderBottomColor: theme.border }}>
                  <Search size={15} color={theme.textSecondary} />
                  <Text style={{ color: theme.textPrimary, fontFamily: theme.fonts.body, fontSize: 13 }}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: reserveHeight, paddingBottom: 88 + TAB_BAR_CONTENT_HEIGHT + insets.bottom }}
      >
        <View style={{ paddingHorizontal: 8, paddingVertical: 12 }}>
          <View style={[{ borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14 }, cardShadow]}>
            <View style={{ marginBottom: ingredientSuggestions.length > 0 ? 10 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ height: 28, width: 28, borderRadius: 999, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={14} color={theme.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: theme.textPrimary, fontFamily: theme.fonts.bodySemibold, fontSize: 13 }}>Ingredient Filters</Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 11, flexShrink: 1 }} numberOfLines={2}>
                    {ingredientSuggestions.length > 0 ? 'Tap pantry ingredients to narrow results faster' : 'Add items to your pantry to unlock ingredient filters'}
                  </Text>
                </View>
              </View>
              {activeIngredients.size > 0 ? (
                <Pressable onPress={() => setActiveIngredients(new Set())}>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            {ingredientSuggestions.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 2 }}>
                {ingredientSuggestions.map((ingredient) => {
                  const active = activeIngredients.has(ingredient);
                  return (
                    <Pressable
                      key={ingredient}
                      onPress={() =>
                        setActiveIngredients((prev) => {
                          const next = new Set(prev);
                          if (next.has(ingredient)) next.delete(ingredient);
                          else next.add(ingredient);
                          return next;
                        })
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.primarySoft : theme.surface,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: active ? theme.primary : theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{ingredient}</Text>
                      {active ? <X size={12} color={theme.primary} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>
                  Use the search bar, voice input, or camera scan to build ingredient-based results.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 8, paddingBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filterChips.map((chip) => {
              const active = activeFilter === chip;
              return (
                <Pressable key={chip} onPress={() => setActiveFilter(chip)} style={{ borderRadius: 999, borderWidth: 1.5, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.surface, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 13 }}>{chip}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Text style={{ paddingHorizontal: 8, paddingBottom: 12, color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 13 }}>{visibleRecipes.length} recipes found</Text>

        <View style={{ paddingHorizontal: 8, gap: 12 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            visibleRecipes.map((recipe) => {
              const isSaved = savedRecipeIds.has(recipe.id);
              const badgeStyle = recipe.badgeColor === 'green' ? { backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ECC71' } : { backgroundColor: theme.primarySoft, color: theme.primary };

              return (
                <Pressable key={recipe.id} onPress={() => router.push(`/recipe/${recipe.id}`)} style={[{ flexDirection: 'row', gap: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 12 }, cardShadow]}>
                  <View style={{ position: 'relative', height: 92, width: 92, overflow: 'hidden', borderRadius: 16 }}>
                    <Image source={recipe.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    <Pressable onPress={() => toggleSavedRecipe(recipe.id, { title: recipe.title, image: recipe.image })} style={{ position: 'absolute', right: 8, top: 8, height: 32, width: 32, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' }}>
                      <Bookmark size={15} color={isSaved ? theme.primary : '#FFFFFF'} fill={isSaved ? theme.primary : 'none'} />
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <Text numberOfLines={2} style={{ flex: 1, color: theme.textPrimary, fontFamily: theme.fonts.bodySemibold, fontSize: 14, lineHeight: 18, minHeight: 36 }}>
                        {recipe.title}
                      </Text>
                      <View style={{ borderRadius: 999, backgroundColor: badgeStyle.backgroundColor, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: badgeStyle.color, fontFamily: theme.fonts.bodySemibold, fontSize: 10 }}>{recipe.badge}</Text>
                      </View>
                    </View>
                    <Text numberOfLines={1} style={{ marginTop: 4, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 11 }}>
                      {recipe.matched}
                    </Text>
                    <View style={{ marginTop: 8, flexDirection: 'row', gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock3 size={12} color={theme.textSecondary} />
                        <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 11 }}>{recipe.cookTime}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Flame size={12} color={theme.textSecondary} />
                        <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 11 }}>{recipe.calories}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {recipe.tags.slice(0, 4).map((tag) => (
                        <View key={tag} style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 10 }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {showCamera ? (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: '#000000' }}>
          <Pressable onPress={() => setShowCamera(false)} style={{ position: 'absolute', left: 20, top: 56, zIndex: 3, height: 40, width: 40, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#FFFFFF" />
          </Pressable>
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <View style={{ position: 'absolute', left: '11%', top: '30%', height: 280, width: '78%', borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontFamily: theme.fonts.body, fontSize: 13, textAlign: 'center' }}>Choose a photo to search from</Text>
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 42, alignItems: 'center' }}>
            <Pressable onPress={() => runImageSearch('gallery')}>
              <Text style={{ color: '#FFFFFF', fontFamily: theme.fonts.bodyMedium, fontSize: 13, marginBottom: 16 }}>or choose from gallery</Text>
            </Pressable>
            <Pressable onPress={() => runImageSearch('camera')} style={{ height: 64, width: 64, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ height: 48, width: 48, borderRadius: 999, borderWidth: 2, borderColor: theme.primary }} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={showVoiceSheet} transparent animationType="fade" onRequestClose={() => setShowVoiceSheet(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowVoiceSheet(false)} />
          <View style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: theme.surface, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: theme.border }} />
            <Text style={{ marginBottom: 8, color: theme.textPrimary, fontFamily: theme.fonts.headingBold, fontSize: 18 }}>Voice Search</Text>
            <Text style={{ marginBottom: 16, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>Say it out loud on supported browsers, or type the phrase below.</Text>
            <TextInput
              value={voiceDraft}
              onChangeText={setVoiceDraft}
              placeholder="e.g. quick chicken dinner under 30 minutes"
              placeholderTextColor={theme.textSecondary}
              style={{ height: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, color: theme.textPrimary, fontFamily: theme.fonts.body }}
            />
            <Pressable
              onPress={() => {
                const transcript = voiceDraft.trim();
                if (!transcript) return;
                setShowVoiceSheet(false);
                setSearchInput(transcript);
                setKeywordQuery(transcript);
                setSearchChips([]);
                setShowSuggestions(false);
                void performSearch({ query: transcript });
              }}
              style={{ marginTop: 16, height: 52, borderRadius: 999, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: theme.fonts.bodySemibold, fontSize: 15 }}>Search Voice Query</Text>
            </Pressable>
            <Pressable onPress={() => setShowVoiceSheet(false)} style={{ marginTop: 10, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 13 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showDetectedSheet ? (
          <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowDetectedSheet(false)} />
            <View style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: theme.surface, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 24 }}>
              <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: theme.border }} />
              <Text style={{ marginBottom: 16, color: theme.textPrimary, fontFamily: theme.fonts.headingBold, fontSize: 18 }}>Ingredients Found</Text>
              {capturedImageUri ? (
                <View style={{ marginBottom: 14, height: 120, overflow: 'hidden', borderRadius: 18, backgroundColor: theme.cream }}>
                  <Image source={capturedImageUri} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
              ) : null}
              {detectedIngredients.length > 0 ? (
                <>
                  <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 8 }}>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{getCountLabel(detectedIngredients.length)}</Text>
                  </View>
                  {detectedIngredients.length >= 2 ? <Pressable onPress={() => setDetectedIngredients([])}><Text style={{ color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 12 }}>Clear All</Text></Pressable> : null}
                </View>
                <View style={{ marginBottom: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {detectedIngredients.map((ingredient) => (
                    <View key={ingredient} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 8 }}>
                      <Text style={{ color: '#FFFFFF', fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{ingredient}</Text>
                      <Pressable onPress={() => setDetectedIngredients((current) => current.filter((item) => item !== ingredient))}><X size={12} color="#FFFFFF" /></Pressable>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => { setSearchChips(detectedIngredients); setKeywordQuery(''); setSearchInput(''); setShowDetectedSheet(false); void performSearch({ ingredients: detectedIngredients }); }} style={{ height: 52, borderRadius: 999, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.fonts.bodySemibold, fontSize: 15 }}>Search These Ingredients</Text>
                </Pressable>
                {lastCaptureSource === 'camera' ? (
                  <Pressable onPress={() => { setLastCaptureSource('gallery'); setDetectedIngredients(['Pasta', 'Basil', 'Parmesan']); }}>
                    <Text style={{ marginTop: 12, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, textAlign: 'center' }}>or choose from gallery</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <Text style={{ marginBottom: 16, color: theme.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>Nothing detected - try a clearer photo</Text>
                <Pressable onPress={() => { setShowDetectedSheet(false); setShowCamera(true); }} style={{ height: 52, borderRadius: 999, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.fonts.bodySemibold, fontSize: 15 }}>Retake</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
