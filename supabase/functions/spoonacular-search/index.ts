import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

// Point costs (spoonacular.com/food-api/docs, confirmed 2026-08-22):
// complexSearch = 1 + 0.01/result, addRecipeInformation = +0.025/result,
// addRecipeNutrition = +0.025/result (also enables addRecipeInformation),
// fillIngredients = +0.025/result. fillIngredients is required here even though
// the docs imply addRecipeInformation alone includes an ingredients list -- live
// testing (2026-08-22) showed extendedIngredients comes back empty without it.
// Bundling all three into the search call itself (instead of a separate
// "get recipe information" call per card) is what keeps a 12-result search to
// ~1.9 points on the free tier's 50 points/day budget.
const MAX_RESULTS = 20;
const DEFAULT_RESULTS = 12;

type SpoonacularNutrient = { name: string; amount: number; unit: string };

type SpoonacularSearchResult = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  veryHealthy?: boolean;
  cheap?: boolean;
  diets?: string[];
  cuisines?: string[];
  nutrition?: { nutrients?: SpoonacularNutrient[] };
  extendedIngredients?: { name: string }[];
};

function pickNutrient(nutrients: SpoonacularNutrient[] | undefined, name: string) {
  return nutrients?.find((item) => item.name === name)?.amount ?? null;
}

function normalizeResult(result: SpoonacularSearchResult) {
  const dietTags = [
    ...(result.diets ?? []),
    ...(result.vegetarian ? ['vegetarian'] : []),
    ...(result.vegan ? ['vegan'] : []),
    ...(result.glutenFree ? ['gluten-free'] : []),
    ...(result.dairyFree ? ['dairy-free'] : []),
  ];

  return {
    id: result.id,
    title: result.title,
    image: result.image ?? null,
    readyInMinutes: result.readyInMinutes ?? null,
    servings: result.servings ?? null,
    dietTags: Array.from(new Set(dietTags)),
    cuisines: result.cuisines ?? [],
    ingredientNames: (result.extendedIngredients ?? []).map((ingredient) => ingredient.name).filter(Boolean),
    nutrition: {
      calories: pickNutrient(result.nutrition?.nutrients, 'Calories'),
      proteinG: pickNutrient(result.nutrition?.nutrients, 'Protein'),
      carbsG: pickNutrient(result.nutrition?.nutrients, 'Carbohydrates'),
      fatG: pickNutrient(result.nutrition?.nutrients, 'Fat'),
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'Spoonacular is not configured' }, 500);
  }

  let body: { query?: string; ingredients?: string[]; number?: number; maxReadyTime?: number; type?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients.map((item) => String(item).trim()).filter(Boolean) : [];
  const number = Math.min(Math.max(Number(body.number) || DEFAULT_RESULTS, 1), MAX_RESULTS);
  const maxReadyTime = Number(body.maxReadyTime);
  const type = typeof body.type === 'string' ? body.type.trim() : '';

  const params = new URLSearchParams({
    apiKey,
    number: String(number),
    addRecipeInformation: 'true',
    addRecipeNutrition: 'true',
    fillIngredients: 'true',
    instructionsRequired: 'true',
  });
  if (query) params.set('query', query);
  if (ingredients.length > 0) params.set('includeIngredients', ingredients.join(','));
  if (!query && ingredients.length === 0) params.set('sort', 'popularity');
  if (Number.isFinite(maxReadyTime) && maxReadyTime > 0) params.set('maxReadyTime', String(maxReadyTime));
  if (type) params.set('type', type);

  const spoonacularResponse = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`);

  if (spoonacularResponse.status === 402) {
    return jsonResponse({ error: 'Daily recipe search quota reached. Try again tomorrow.' }, 402);
  }
  if (!spoonacularResponse.ok) {
    const details = await spoonacularResponse.text().catch(() => '');
    console.error(`[spoonacular-search] ${spoonacularResponse.status}: ${details}`);
    return jsonResponse({ error: 'Recipe search is temporarily unavailable' }, 502);
  }

  const payload = await spoonacularResponse.json();
  const results = Array.isArray(payload?.results) ? payload.results.map(normalizeResult) : [];

  return jsonResponse({ results, totalResults: payload?.totalResults ?? results.length });
});
