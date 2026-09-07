import type { CookingHistoryEntry } from '../store/mock-user';
import type { RecipeDetailRecord, RecipeNutritionItem, RecipeVideo } from '../store/recipe-types';
import { supabase } from '../lib/supabase';
import { requireCurrentUser, resolveRemoteRecipeId } from './serviceUtils';
import { getRecipeImages, getRecipePrimaryImage } from './recipeImages';
import { imageService } from './imageService';

function getRecipeJoin<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatMinutes(minutes?: number | null) {
  return minutes ? `${minutes} min` : '20 min';
}

function formatCalories(calories?: number | null) {
  return calories ? `${Math.round(calories)} cal` : '320 cal';
}

function badgeFromMatch(matchCount: number, totalCount: number) {
  const threshold = Math.max(1, Math.ceil(totalCount / 2));
  if (matchCount >= threshold) {
    return {
      badge: 'Can Make Now' as const,
      badgeColor: 'green' as const,
    };
  }

  return {
    badge: 'Use It Up' as const,
    badgeColor: 'amber' as const,
  };
}

function difficultyLabel(value?: string | null): RecipeDetailRecord['difficulty'] {
  if (!value) return 'Medium';
  const normalized = value.toLowerCase();
  if (normalized === 'easy') return 'Easy';
  if (normalized === 'hard') return 'Hard';
  return 'Medium';
}

function normalizeDietTags(dietTags?: string[] | null, mealType?: string[] | null) {
  return [...(dietTags ?? []), ...(mealType ?? [])].filter(Boolean);
}

// Spoonacular is a live, licensed third-party source: its terms forbid persisting
// full recipe content, so its results never get an id in the local `recipes` table.
// Instead every Spoonacular recipe is addressed by a client-side "spoon-<id>" route
// id, branched on throughout this file, backed by a short in-memory cache (not
// Supabase) so re-viewing something within a session doesn't re-spend API points.
const SPOONACULAR_ID_PREFIX = 'spoon-';

function isSpoonacularRecipeId(recipeId: string) {
  return recipeId.startsWith(SPOONACULAR_ID_PREFIX);
}

function toSpoonacularNumericId(recipeId: string) {
  return Number(recipeId.slice(SPOONACULAR_ID_PREFIX.length));
}

function difficultyFromMinutes(minutes?: number | null): RecipeDetailRecord['difficulty'] {
  if (!minutes) return 'Medium';
  if (minutes <= 20) return 'Easy';
  if (minutes <= 45) return 'Medium';
  return 'Hard';
}

type CacheEntry<T> = { data: T; expiresAt: number };
const SPOONACULAR_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SPOONACULAR_DETAIL_CACHE_TTL_MS = 15 * 60 * 1000;
const SPOONACULAR_VIDEO_CACHE_TTL_MS = 30 * 60 * 1000;
const spoonacularSearchCache = new Map<string, CacheEntry<SpoonacularRawSearchResult[]>>();
const spoonacularDetailCache = new Map<number, CacheEntry<SpoonacularRawDetail>>();
const spoonacularVideoCache = new Map<string, CacheEntry<RecipeVideo>>();

function readCache<T>(cache: Map<string, CacheEntry<T>> | Map<number, CacheEntry<T>>, key: string | number): T | null {
  const entry = (cache as Map<string | number, CacheEntry<T>>).get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    (cache as Map<string | number, CacheEntry<T>>).delete(key);
    return null;
  }
  return entry.data;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>> | Map<number, CacheEntry<T>>, key: string | number, data: T, ttlMs: number) {
  (cache as Map<string | number, CacheEntry<T>>).set(key, { data, expiresAt: Date.now() + ttlMs });
}

type SpoonacularRawSearchResult = {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  dietTags: string[];
  cuisines: string[];
  ingredientNames: string[];
  nutrition: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null };
};

type SpoonacularRawDetail = {
  id: number;
  title: string;
  image: string | null;
  servings: number;
  readyInMinutes: number | null;
  preparationMinutes: number | null;
  cookingMinutes: number | null;
  description: string;
  sourceUrl: string | null;
  dietTags: string[];
  dishTypes: string[];
  ingredients: { name: string; amount: number | null; unit: string; original: string }[];
  steps: { stepNumber: number; instruction: string }[];
  nutrition: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null };
};

async function fetchSpoonacularSearch(
  query: string,
  ingredients: string[],
  number: number,
  maxReadyTime?: number,
  type?: string
): Promise<SpoonacularRawSearchResult[]> {
  const cacheKey = `${query.toLowerCase()}|${ingredients.map((item) => item.toLowerCase()).sort().join(',')}|${number}|${maxReadyTime ?? ''}|${type ?? ''}`;
  const cached = readCache(spoonacularSearchCache, cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('spoonacular-search', {
    body: { query, ingredients, number, maxReadyTime, type },
  });
  if (error) throw error;

  const results = (data?.results ?? []) as SpoonacularRawSearchResult[];
  writeCache(spoonacularSearchCache, cacheKey, results, SPOONACULAR_SEARCH_CACHE_TTL_MS);
  return results;
}

async function fetchSpoonacularDetail(numericId: number): Promise<SpoonacularRawDetail | null> {
  const cached = readCache(spoonacularDetailCache, numericId);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('spoonacular-recipe', {
    body: { id: numericId },
  });
  if (error) throw error;

  const recipe = (data?.recipe ?? null) as SpoonacularRawDetail | null;
  if (!recipe) return null;
  writeCache(spoonacularDetailCache, numericId, recipe, SPOONACULAR_DETAIL_CACHE_TTL_MS);
  return recipe;
}

// Matched by title against Spoonacular's food-video index (per CLAUDE.md --
// no separate YouTube API integration). Works for any recipe regardless of
// whether it's Spoonacular- or locally-sourced, since it's a title search.
async function fetchRecipeVideo(title: string): Promise<RecipeVideo | null> {
  const cacheKey = title.trim().toLowerCase();
  if (!cacheKey) return null;
  const cached = readCache(spoonacularVideoCache, cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('spoonacular-video', {
    body: { query: title },
  });
  if (error) throw error;

  const video = (data?.video ?? null) as RecipeVideo | null;
  if (video) writeCache(spoonacularVideoCache, cacheKey, video, SPOONACULAR_VIDEO_CACHE_TTL_MS);
  return video;
}

function mapSpoonacularResultsToCards(results: SpoonacularRawSearchResult[], pantryNames: string[]): SearchRecipeCard[] {
  const pantrySet = new Set(pantryNames.map((name) => name.toLowerCase()));
  return results.map((result) => {
    const ingredientNames = result.ingredientNames;
    const matchedCount = ingredientNames.filter((name) => pantrySet.has(name.toLowerCase())).length;
    const matchTotal = Math.max(ingredientNames.length, 1);
    const { badge, badgeColor } = badgeFromMatch(matchedCount, matchTotal);

    return {
      id: `${SPOONACULAR_ID_PREFIX}${result.id}`,
      title: result.title,
      image: result.image ?? getRecipeImages(null, result.title)[0],
      badge,
      badgeColor,
      cookTime: formatMinutes(result.readyInMinutes),
      calories: formatCalories(result.nutrition.calories),
      matched: `${matchedCount}/${matchTotal} ingredients matched`,
      matchCount: matchedCount,
      matchTotal,
      tags: Array.from(new Set([...result.dietTags, ...result.cuisines])),
      ingredientNames,
      servings: result.servings,
    } satisfies SearchRecipeCard;
  });
}

function mapNutrition(nutrition?: {
  calories_per_serving?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
} | null): RecipeNutritionItem[] {
  const calories = nutrition?.calories_per_serving ?? 320;
  const protein = nutrition?.protein_g ?? 18;
  const carbs = nutrition?.carbs_g ?? 35;
  const fat = nutrition?.fat_g ?? 14;

  return [
    { label: 'Calories', value: String(Math.round(calories)), percent: Math.min(100, Math.round((calories / 2000) * 100)) },
    { label: 'Protein', value: `${Math.round(protein)}g`, percent: Math.min(100, Math.round((protein / 50) * 100)) },
    { label: 'Carbs', value: `${Math.round(carbs)}g`, percent: Math.min(100, Math.round((carbs / 275) * 100)) },
    { label: 'Fat', value: `${Math.round(fat)}g`, percent: Math.min(100, Math.round((fat / 78) * 100)) },
  ];
}

type SavedRecipeCard = {
  id: string;
  title: string;
  image: string;
  shortDescription: string;
  cookTime: string;
  calories: string;
  savedAt: number;
  ingredientNames: string[];
  badge: 'Can Make Now' | 'Use It Up' | 'Recently Saved';
  badgeColor: 'green' | 'amber';
};

type HistoryRecipePreview = {
  title: string;
  image: string;
  cookTime: string;
};

export type SearchRecipeCard = {
  id: string;
  title: string;
  image: string;
  badge: 'Can Make Now' | 'Use It Up';
  badgeColor: 'green' | 'amber';
  cookTime: string;
  calories: string;
  matched: string;
  matchCount: number;
  matchTotal: number;
  tags: string[];
  ingredientNames: string[];
  servings: number | null;
};

export type HomeSuggestionCard = {
  id: string;
  title: string;
  shortDescription: string;
  image: string;
  badge: string;
  badgeColor: 'green' | 'amber';
};

export type DiscoveredRecipePayload = {
  title: string;
  description: string;
  cuisineType?: string | null;
  mealTypes?: string[];
  dietTags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  prepTimeMins?: number | null;
  cookTimeMins?: number | null;
  totalTimeMins?: number | null;
  defaultServings?: number | null;
  equipment?: string[];
  imageUrls?: string[];
  sourceUrl?: string | null;
  ingredients: {
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string | null;
  }[];
  steps: {
    stepNumber: number;
    instruction: string;
    tip?: string | null;
    durationMins?: number | null;
  }[];
  nutrition?: {
    caloriesPerServing?: number | null;
    proteinG?: number | null;
    carbsG?: number | null;
    fatG?: number | null;
  } | null;
};

async function fetchRecipePieces(recipeId: string) {
  const remoteId = await resolveRemoteRecipeId(recipeId);
  if (!remoteId) return null;

  const [{ data: recipe, error: recipeError }, { data: ingredients, error: ingredientError }, { data: steps, error: stepError }, { data: nutrition, error: nutritionError }] =
    await Promise.all([
      supabase
        .from('recipes')
        .select('id, title, description, cuisine_type, meal_type, diet_tags, difficulty, prep_time_mins, cook_time_mins, total_time_mins, default_servings, equipment, image_urls, created_at')
        .eq('id', remoteId)
        .single(),
      supabase.from('recipe_ingredients').select('id, name, quantity, unit, notes, sort_order').eq('recipe_id', remoteId).order('sort_order', { ascending: true }),
      supabase.from('recipe_steps').select('id, step_number, instruction, tip, duration_mins').eq('recipe_id', remoteId).order('step_number', { ascending: true }),
      supabase.from('recipe_nutrition').select('calories_per_serving, protein_g, carbs_g, fat_g').eq('recipe_id', remoteId).maybeSingle(),
    ]);

  if (recipeError) throw recipeError;
  if (ingredientError) throw ingredientError;
  if (stepError) throw stepError;
  if (nutritionError) throw nutritionError;

  return {
    recipe,
    ingredients: ingredients ?? [],
    steps: steps ?? [],
    nutrition: nutrition ?? null,
  };
}

export const recipeService = {
  async getHomeSuggestions({
    dietType,
    allergies,
  }: {
    dietType?: string | null;
    allergies?: string[];
  }): Promise<HomeSuggestionCard[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, title, description, diet_tags, image_urls')
      .limit(8)
      .order('view_count', { ascending: false });
    if (error) throw error;

    const normalizedDiet = dietType?.split(',')[0]?.trim().toLowerCase();
    const filtered = (data ?? []).filter((recipe) => {
      const tags = (recipe.diet_tags ?? []).map((tag: string) => tag.toLowerCase());
      if (normalizedDiet && normalizedDiet !== 'none' && normalizedDiet !== 'balanced' && !tags.includes(normalizedDiet)) {
        return false;
      }
      return !(allergies ?? []).some((allergy) => tags.includes(allergy.toLowerCase()));
    });

    const source = filtered.length > 0 ? filtered : data ?? [];
    return source.map((recipe, index) => ({
      id: String(recipe.id),
      title: recipe.title,
      shortDescription: recipe.description ?? 'Fresh ideas tailored to your kitchen.',
      image: getRecipePrimaryImage(recipe.image_urls as string[] | null | undefined, recipe.title),
      badge: index % 2 === 0 ? 'Can Make Now' : 'Use It Up',
      badgeColor: index % 2 === 0 ? 'green' : 'amber',
    }));
  },

  async getRecipeDetail(recipeId: string, pantryNames: string[] = []): Promise<RecipeDetailRecord | null> {
    if (isSpoonacularRecipeId(recipeId)) {
      const numericId = toSpoonacularNumericId(recipeId);
      if (!Number.isFinite(numericId)) return null;

      const recipe = await fetchSpoonacularDetail(numericId);
      if (!recipe) return null;

      const pantrySet = new Set(pantryNames.map((item) => item.toLowerCase()));
      const ingredientNames = recipe.ingredients.map((ingredient) => ingredient.name);
      const matchCount = ingredientNames.filter((name) => pantrySet.has(name.toLowerCase())).length;
      const { badge, badgeColor } = badgeFromMatch(matchCount, Math.max(ingredientNames.length, 1));
      const prepMinutes = recipe.preparationMinutes ?? Math.round((recipe.readyInMinutes ?? 20) * 0.3);
      const cookMinutes = recipe.cookingMinutes ?? Math.max((recipe.readyInMinutes ?? 20) - prepMinutes, 0);

      return {
        id: recipeId,
        remoteId: recipeId,
        title: recipe.title,
        shortDescription: recipe.description || 'Fresh ideas tailored to your kitchen.',
        description: recipe.description || 'Fresh ideas tailored to your kitchen.',
        prepTime: formatMinutes(prepMinutes),
        cookTime: formatMinutes(cookMinutes),
        totalTime: formatMinutes(recipe.readyInMinutes),
        servings: recipe.servings ?? 2,
        difficulty: difficultyFromMinutes(recipe.readyInMinutes),
        calories: formatCalories(recipe.nutrition.calories),
        matched: `${matchCount}/${Math.max(ingredientNames.length, 1)} ingredients matched`,
        tags: Array.from(new Set([...recipe.dietTags, ...recipe.dishTypes])),
        badge,
        badgeColor,
        images: recipe.image ? [recipe.image] : getRecipeImages(null, recipe.title),
        ingredients: recipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.amount ? `${ingredient.amount} ${ingredient.unit}`.trim() : ingredient.original,
          pantryMatch: pantrySet.has(ingredient.name.toLowerCase()),
        })),
        steps: recipe.steps.map((step) => ({
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          tip: null,
          durationMins: null,
        })),
        nutrition: mapNutrition({
          calories_per_serving: recipe.nutrition.calories,
          protein_g: recipe.nutrition.proteinG,
          carbs_g: recipe.nutrition.carbsG,
          fat_g: recipe.nutrition.fatG,
        }),
        savedAt: Date.now(),
        equipment: [],
      };
    }

    const pieces = await fetchRecipePieces(recipeId);
    if (!pieces) return null;

    const pantrySet = new Set(pantryNames.map((item) => item.toLowerCase()));
    const ingredientNames = pieces.ingredients.map((ingredient) => ingredient.name);
    const matchCount = ingredientNames.filter((ingredient) => pantrySet.has(ingredient.toLowerCase())).length;
    const { badge, badgeColor } = badgeFromMatch(matchCount, Math.max(ingredientNames.length, 1));

    return {
      id: String(pieces.recipe.id),
      remoteId: String(pieces.recipe.id),
      title: pieces.recipe.title,
      shortDescription: pieces.recipe.description ?? 'Fresh ideas tailored to your kitchen.',
      description: pieces.recipe.description ?? 'Fresh ideas tailored to your kitchen.',
      prepTime: formatMinutes(pieces.recipe.prep_time_mins),
      cookTime: formatMinutes(pieces.recipe.cook_time_mins),
      totalTime: formatMinutes(pieces.recipe.total_time_mins),
      servings: pieces.recipe.default_servings ?? 2,
      difficulty: difficultyLabel(pieces.recipe.difficulty),
      calories: formatCalories(pieces.nutrition?.calories_per_serving),
      matched: `${matchCount}/${Math.max(ingredientNames.length, 1)} ingredients matched`,
      tags: normalizeDietTags(pieces.recipe.diet_tags as string[] | null | undefined, pieces.recipe.meal_type as string[] | null | undefined),
      badge,
      badgeColor,
      images: getRecipeImages(pieces.recipe.image_urls as string[] | null | undefined, pieces.recipe.title),
      ingredients: pieces.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity ? `${ingredient.quantity}${ingredient.unit ? ` ${ingredient.unit}` : ''}` : ingredient.unit ?? '',
        pantryMatch: pantrySet.has(ingredient.name.toLowerCase()),
      })),
      steps: pieces.steps.map((step) => ({
        stepNumber: step.step_number,
        instruction: step.instruction,
        tip: step.tip,
        durationMins: step.duration_mins,
      })),
      nutrition: mapNutrition(pieces.nutrition),
      savedAt: new Date(pieces.recipe.created_at ?? Date.now()).getTime(),
      equipment: (pieces.recipe.equipment as string[] | null | undefined) ?? [],
    };
  },

  async getRecipeVideo(title: string): Promise<RecipeVideo | null> {
    return fetchRecipeVideo(title);
  },

  async getSavedRecipeIds() {
    const user = await requireCurrentUser();
    const [{ data: localRows, error: localError }, { data: spoonRows, error: spoonError }] = await Promise.all([
      supabase.from('saved_recipes').select('recipe_id').eq('user_id', user.id),
      supabase.from('saved_spoonacular_recipes').select('spoonacular_id').eq('user_id', user.id),
    ]);
    if (localError) throw localError;
    if (spoonError) throw spoonError;
    return [
      ...(localRows ?? []).map((row) => String(row.recipe_id)),
      ...(spoonRows ?? []).map((row) => `${SPOONACULAR_ID_PREFIX}${row.spoonacular_id}`),
    ];
  },

  async getSpoonacularSavedRecipeCards(): Promise<SavedRecipeCard[]> {
    const user = await requireCurrentUser();
    const { data, error } = await supabase
      .from('saved_spoonacular_recipes')
      .select('spoonacular_id, title, image_url, saved_at')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: `${SPOONACULAR_ID_PREFIX}${row.spoonacular_id}`,
      title: row.title,
      image: row.image_url || getRecipeImages(null, row.title)[0],
      shortDescription: 'A saved recipe ready whenever you are.',
      // Full detail (cook time, calories, ingredients) is intentionally not stored —
      // only fetched live when the recipe is actually opened. See CLAUDE.md's
      // saved-recipe storage rule.
      cookTime: '—',
      calories: '—',
      savedAt: new Date(row.saved_at).getTime(),
      ingredientNames: [],
      badge: 'Recently Saved',
      badgeColor: 'amber',
    }));
  },

  async getSavedRecipeCards(): Promise<SavedRecipeCard[]> {
    const spoonacularCards = await recipeService.getSpoonacularSavedRecipeCards();
    const user = await requireCurrentUser();
    const { data: savedRows, error: savedError } = await supabase
      .from('saved_recipes')
      .select('recipe_id, saved_at')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });
    if (savedError) throw savedError;

    const recipeIds = Array.from(new Set((savedRows ?? []).map((row) => String(row.recipe_id))));
    if (recipeIds.length === 0) return spoonacularCards.sort((a, b) => b.savedAt - a.savedAt);

    const [{ data: recipeRows, error: recipeError }, { data: nutritionRows, error: nutritionError }, { data: ingredientRows, error: ingredientError }] =
      await Promise.all([
        supabase.from('recipes').select('id, title, description, image_urls, cook_time_mins').in('id', recipeIds),
        supabase.from('recipe_nutrition').select('recipe_id, calories_per_serving').in('recipe_id', recipeIds),
        supabase.from('recipe_ingredients').select('recipe_id, name').in('recipe_id', recipeIds),
      ]);
    if (recipeError) throw recipeError;
    if (nutritionError) throw nutritionError;
    if (ingredientError) throw ingredientError;

    const nutritionMap = new Map((nutritionRows ?? []).map((row) => [String(row.recipe_id), row.calories_per_serving as number | null | undefined]));
    const ingredientMap = new Map<string, string[]>();
    for (const row of ingredientRows ?? []) {
      const key = String(row.recipe_id);
      const next = ingredientMap.get(key) ?? [];
      next.push(String(row.name));
      ingredientMap.set(key, next);
    }

    const cards: SavedRecipeCard[] = [];
    for (const savedRow of savedRows ?? []) {
      const recipe = (recipeRows ?? []).find((row) => String(row.id) === String(savedRow.recipe_id));
      if (!recipe) continue;
      cards.push({
        id: String(recipe.id),
        title: recipe.title,
        image: getRecipePrimaryImage(recipe.image_urls as string[] | null | undefined, recipe.title),
        shortDescription: recipe.description ?? 'A saved recipe ready whenever you are.',
        cookTime: formatMinutes(recipe.cook_time_mins),
        calories: formatCalories(nutritionMap.get(String(recipe.id))),
        savedAt: new Date(savedRow.saved_at).getTime(),
        ingredientNames: ingredientMap.get(String(recipe.id)) ?? [],
        badge: 'Recently Saved',
        badgeColor: 'amber',
      });
    }
    return [...cards, ...spoonacularCards].sort((a, b) => b.savedAt - a.savedAt);
  },

  async setSavedRecipe(recipeId: string, saved: boolean, meta?: { title: string; image: string | null }) {
    const user = await requireCurrentUser();

    if (isSpoonacularRecipeId(recipeId)) {
      const numericId = toSpoonacularNumericId(recipeId);
      if (!Number.isFinite(numericId)) return;

      if (saved) {
        const { error } = await supabase.from('saved_spoonacular_recipes').upsert(
          { user_id: user.id, spoonacular_id: numericId, title: meta?.title ?? 'Recipe', image_url: meta?.image ?? null },
          { onConflict: 'user_id,spoonacular_id' }
        );
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('saved_spoonacular_recipes')
        .delete()
        .eq('user_id', user.id)
        .eq('spoonacular_id', numericId);
      if (error) throw error;
      return;
    }

    const remoteRecipeId = await resolveRemoteRecipeId(recipeId);
    if (!remoteRecipeId) return;

    if (saved) {
      const { error } = await supabase
        .from('saved_recipes')
        .upsert({ user_id: user.id, recipe_id: remoteRecipeId }, { onConflict: 'user_id,recipe_id' });
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', remoteRecipeId);
    if (error) throw error;
  },

  async getCookingHistory() {
    const user = await requireCurrentUser();
    const { data, error } = await supabase
      .from('cook_logs')
      .select('id, recipe_id, servings_cooked, rating, is_favourite, completed_at, recipes(title, total_time_mins)')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });
    if (error) throw error;

    const aggregated = new Map<string, CookingHistoryEntry>();
    for (const row of data ?? []) {
      const recipe = getRecipeJoin(row.recipes);
      const title = (recipe?.title as string | undefined) ?? 'Recipe';
      const routeId = String(row.recipe_id);
      const existing = aggregated.get(routeId);
      if (existing) {
        existing.cookedCount = (existing.cookedCount ?? 1) + 1;
        continue;
      }

      aggregated.set(routeId, {
        id: String(row.id),
        recipeId: routeId,
        title,
        cookedOn: new Date(row.completed_at).toLocaleDateString(),
        servings: row.servings_cooked ? `${row.servings_cooked} servings` : '2 servings',
        duration: recipe?.total_time_mins ? `${String(recipe.total_time_mins)} min` : '20 min',
        rating: row.rating ?? undefined,
        cookedCount: 1,
        favorite: row.is_favourite ?? false,
      });
    }

    return Array.from(aggregated.values());
  },

  async getHistoryRecipePreviews(recipeIds: string[]) {
    const remoteIds = Array.from(new Set(await Promise.all(recipeIds.map((recipeId) => resolveRemoteRecipeId(recipeId)))));
    const filteredIds = remoteIds.filter((id): id is string => Boolean(id));
    if (filteredIds.length === 0) return {} as Record<string, HistoryRecipePreview>;

    const { data, error } = await supabase
      .from('recipes')
      .select('id, title, image_urls, total_time_mins')
      .in('id', filteredIds);
    if (error) throw error;

    const byRemoteId = new Map(
      (data ?? []).map((row) => [
        String(row.id),
        {
          title: row.title,
          image: getRecipePrimaryImage(row.image_urls as string[] | null | undefined, row.title),
          cookTime: formatMinutes(row.total_time_mins),
        } satisfies HistoryRecipePreview,
      ])
    );

    const entries = await Promise.all(
      recipeIds.map(async (recipeId) => {
        const remoteId = await resolveRemoteRecipeId(recipeId);
        return [
          recipeId,
          remoteId
            ? byRemoteId.get(remoteId) ?? { title: 'Recipe', image: getRecipePrimaryImage(null, remoteId), cookTime: '20 min' }
            : { title: 'Recipe', image: getRecipePrimaryImage(null, remoteId), cookTime: '20 min' },
        ] as const;
      })
    );

    return Object.fromEntries(entries) as Record<string, HistoryRecipePreview>;
  },

  // Primary recipe discovery source (CLAUDE.md): live results via the
  // spoonacular-search edge function, which holds SPOONACULAR_API_KEY server-side.
  // Results are cached in-memory per query+ingredients+number for a few minutes so
  // re-running the same search (e.g. after a pantry edit re-renders this screen)
  // doesn't re-spend API points; pass pantryNames on every call and the match
  // badges recompute for free against that cache.
  async searchSpoonacularRecipes(params: {
    query?: string;
    ingredients?: string[];
    number?: number;
    pantryNames?: string[];
    maxReadyTime?: number;
    type?: string;
  }): Promise<SearchRecipeCard[]> {
    const query = params.query?.trim() ?? '';
    const ingredients = (params.ingredients ?? []).map((item) => item.trim()).filter(Boolean);
    const number = params.number ?? 12;
    const results = await fetchSpoonacularSearch(query, ingredients, number, params.maxReadyTime, params.type);
    return mapSpoonacularResultsToCards(results, params.pantryNames ?? []);
  },

  async searchRecipes(params?: { query?: string; ingredients?: string[] }): Promise<SearchRecipeCard[]> {
    const [{ data: recipeRows, error: recipeError }, { data: nutritionRows, error: nutritionError }, { data: ingredientRows, error: ingredientError }] =
      await Promise.all([
        supabase
          .from('recipes')
          .select('id, title, description, diet_tags, meal_type, image_urls, cook_time_mins')
          .order('view_count', { ascending: false })
          .limit(40),
        supabase.from('recipe_nutrition').select('recipe_id, calories_per_serving'),
        supabase.from('recipe_ingredients').select('recipe_id, name'),
      ]);
    if (recipeError) throw recipeError;
    if (nutritionError) throw nutritionError;
    if (ingredientError) throw ingredientError;

    const nutritionMap = new Map((nutritionRows ?? []).map((row) => [String(row.recipe_id), row.calories_per_serving as number | null | undefined]));
    const ingredientMap = new Map<string, string[]>();
    for (const row of ingredientRows ?? []) {
      const key = String(row.recipe_id);
      const next = ingredientMap.get(key) ?? [];
      next.push(String(row.name));
      ingredientMap.set(key, next);
    }

    const query = params?.query?.trim().toLowerCase() ?? '';
    const ingredients = (params?.ingredients ?? []).map((item) => item.toLowerCase()).filter(Boolean);

    return (recipeRows ?? [])
      .filter((recipe) => {
        const ingredientNames = ingredientMap.get(String(recipe.id)) ?? [];
        const tags = normalizeDietTags(recipe.diet_tags as string[] | null | undefined, recipe.meal_type as string[] | null | undefined).map((tag) =>
          tag.toLowerCase()
        );

        const keywordMatches =
          !query ||
          recipe.title.toLowerCase().includes(query) ||
          (recipe.description ?? '').toLowerCase().includes(query) ||
          tags.some((tag) => tag.includes(query)) ||
          ingredientNames.some((ingredient) => ingredient.toLowerCase().includes(query));

        const ingredientMatches =
          ingredients.length === 0 ||
          ingredients.every((ingredient) =>
            ingredientNames.some((item) => item.toLowerCase().includes(ingredient))
          );

        return keywordMatches && ingredientMatches;
      })
      .map((recipe, index) => {
      const ingredientNames = ingredientMap.get(String(recipe.id)) ?? [];
      const matchCount = Math.min(ingredientNames.length, 4);
      const matchTotal = Math.max(ingredientNames.length, 4);
      return {
        id: String(recipe.id),
        title: recipe.title,
        image: getRecipePrimaryImage(recipe.image_urls as string[] | null | undefined, recipe.title),
        badge: index % 2 === 0 ? 'Can Make Now' : 'Use It Up',
        badgeColor: index % 2 === 0 ? 'green' : 'amber',
        cookTime: formatMinutes(recipe.cook_time_mins),
        calories: formatCalories(nutritionMap.get(String(recipe.id))),
        matched: `${matchCount}/${matchTotal} ingredients matched`,
        matchCount,
        matchTotal,
        tags: normalizeDietTags(recipe.diet_tags as string[] | null | undefined, recipe.meal_type as string[] | null | undefined),
        ingredientNames,
        servings: null,
      } satisfies SearchRecipeCard;
    });
  },

  async createRecipeFromDiscovery(payload: DiscoveredRecipePayload): Promise<SearchRecipeCard | null> {
    const trimmedTitle = payload.title.trim();
    if (!trimmedTitle) return null;
    const user = await requireCurrentUser();
    const derivedIngredients = payload.ingredients.map((ingredient) => ingredient.name);
    const discoveredImages =
      (payload.imageUrls?.filter(Boolean).length ? payload.imageUrls!.filter(Boolean) : []) ||
      (await imageService.searchRecipeImages({
        title: trimmedTitle,
        description: payload.description,
        ingredients: derivedIngredients,
      }));
    const imageUrls = discoveredImages.length > 0 ? discoveredImages : getRecipeImages(null, trimmedTitle);

    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('id')
      .ilike('title', trimmedTitle)
      .limit(1)
      .maybeSingle();
    if (existingRecipe?.id) {
      const existingResults = await recipeService.searchRecipes({ query: trimmedTitle });
      return existingResults.find((recipe) => recipe.id === String(existingRecipe.id)) ?? existingResults[0] ?? null;
    }

    const { data: createdRecipe, error: createRecipeError } = await supabase
      .from('recipes')
      .insert({
        title: trimmedTitle,
        description: payload.description,
        cuisine_type: payload.cuisineType ?? null,
        meal_type: payload.mealTypes ?? [],
        diet_tags: payload.dietTags ?? [],
        difficulty: payload.difficulty ?? 'medium',
        prep_time_mins: payload.prepTimeMins ?? null,
        cook_time_mins: payload.cookTimeMins ?? null,
        total_time_mins: payload.totalTimeMins ?? null,
        default_servings: payload.defaultServings ?? 2,
        equipment: payload.equipment ?? [],
        image_urls: imageUrls,
        source_url: payload.sourceUrl ?? null,
        is_user_generated: true,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (createRecipeError) throw createRecipeError;

    const recipeId = String(createdRecipe.id);

    if (payload.ingredients.length > 0) {
      const { error: ingredientError } = await supabase.from('recipe_ingredients').insert(
        payload.ingredients.map((ingredient, index) => ({
          recipe_id: recipeId,
          name: ingredient.name,
          quantity: ingredient.quantity ?? null,
          unit: ingredient.unit ?? null,
          notes: ingredient.notes ?? null,
          sort_order: index,
        }))
      );
      if (ingredientError) throw ingredientError;
    }

    if (payload.steps.length > 0) {
      const { error: stepError } = await supabase.from('recipe_steps').insert(
        payload.steps.map((step, index) => ({
          recipe_id: recipeId,
          step_number: step.stepNumber || index + 1,
          instruction: step.instruction,
          tip: step.tip ?? null,
          duration_mins: step.durationMins ?? null,
        }))
      );
      if (stepError) throw stepError;
    }

    if (payload.nutrition) {
      const { error: nutritionError } = await supabase.from('recipe_nutrition').insert({
        recipe_id: recipeId,
        calories_per_serving: payload.nutrition.caloriesPerServing ?? null,
        protein_g: payload.nutrition.proteinG ?? null,
        carbs_g: payload.nutrition.carbsG ?? null,
        fat_g: payload.nutrition.fatG ?? null,
        generated_by: 'ai',
      });
      if (nutritionError) throw nutritionError;
    }

    const results = await recipeService.searchRecipes({ query: trimmedTitle });
    return results.find((recipe) => recipe.id === recipeId) ?? results[0] ?? null;
  },

  async backfillMissingRecipeImages(limit = 12) {
    const user = await requireCurrentUser();
    const { data, error } = await supabase
      .from('recipes')
      .select('id, title, description, image_urls, created_by')
      .eq('created_by', user.id)
      .limit(Math.max(limit * 2, limit));
    if (error) throw error;

    const targets = (data ?? [])
      .filter((recipe) => {
        const images = getRecipeImages(recipe.image_urls as string[] | null | undefined, recipe.title);
        const rawImages = (recipe.image_urls as string[] | null | undefined)?.filter(
          (item) => Boolean(item) && !String(item).includes('source.unsplash.com')
        ) ?? [];
        return rawImages.length === 0 || images.length === 0;
      })
      .slice(0, limit);

    for (const recipe of targets) {
      const discoveredImages = await imageService.searchRecipeImages({
        title: recipe.title,
        description: recipe.description ?? undefined,
      });
      const imageUrls = discoveredImages.length > 0 ? discoveredImages : getRecipeImages(null, recipe.title);
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ image_urls: imageUrls })
        .eq('id', recipe.id)
        .eq('created_by', user.id);
      if (updateError) throw updateError;
    }
  },

  async addCookingLog(entry: CookingHistoryEntry) {
    const user = await requireCurrentUser();
    const remoteRecipeId = await resolveRemoteRecipeId(entry.recipeId);
    if (!remoteRecipeId) return;

    const servingsCount = Number.parseInt(entry.servings, 10);
    const { error } = await supabase.from('cook_logs').insert({
      user_id: user.id,
      recipe_id: remoteRecipeId,
      servings_cooked: Number.isNaN(servingsCount) ? null : servingsCount,
      rating: entry.rating ?? null,
      is_favourite: entry.favorite ?? false,
    });
    if (error) throw error;
  },

  async setCookingHistoryFavorite(recipeId: string, favorite: boolean) {
    const user = await requireCurrentUser();
    const remoteRecipeId = await resolveRemoteRecipeId(recipeId);
    if (!remoteRecipeId) return;

    const { error } = await supabase
      .from('cook_logs')
      .update({ is_favourite: favorite })
      .eq('user_id', user.id)
      .eq('recipe_id', remoteRecipeId);
    if (error) throw error;
  },
};
