import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

// Point cost: 1 + 0.1 (includeNutrition) = 1.1 points per call (docs, confirmed
// 2026-08-22). Callers are expected to cache this client-side for the session —
// this function itself does not persist anything (Spoonacular's terms forbid
// storing full recipe content; see recipeService.ts / CLAUDE.md).
type SpoonacularNutrient = { name: string; amount: number; unit: string };

type SpoonacularRecipeInfo = {
  id: number;
  title: string;
  image?: string;
  servings?: number;
  readyInMinutes?: number;
  preparationMinutes?: number | null;
  cookingMinutes?: number | null;
  summary?: string;
  sourceUrl?: string;
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  diets?: string[];
  cuisines?: string[];
  dishTypes?: string[];
  extendedIngredients?: { name: string; amount: number; unit: string; original: string }[];
  analyzedInstructions?: { steps: { number: number; step: string }[] }[];
  nutrition?: { nutrients?: SpoonacularNutrient[] };
};

function pickNutrient(nutrients: SpoonacularNutrient[] | undefined, name: string) {
  return nutrients?.find((item) => item.name === name)?.amount ?? null;
}

function stripHtml(value: string | undefined) {
  return (value ?? '').replace(/<[^>]*>/g, '').trim();
}

function normalizeRecipe(recipe: SpoonacularRecipeInfo) {
  const dietTags = [
    ...(recipe.diets ?? []),
    ...(recipe.vegetarian ? ['vegetarian'] : []),
    ...(recipe.vegan ? ['vegan'] : []),
    ...(recipe.glutenFree ? ['gluten-free'] : []),
    ...(recipe.dairyFree ? ['dairy-free'] : []),
  ];

  const steps = (recipe.analyzedInstructions ?? []).flatMap((group) =>
    group.steps.map((step) => ({ stepNumber: step.number, instruction: step.step }))
  );

  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image ?? null,
    servings: recipe.servings ?? 2,
    readyInMinutes: recipe.readyInMinutes ?? null,
    preparationMinutes: recipe.preparationMinutes ?? null,
    cookingMinutes: recipe.cookingMinutes ?? null,
    description: stripHtml(recipe.summary),
    sourceUrl: recipe.sourceUrl ?? null,
    dietTags: Array.from(new Set(dietTags)),
    dishTypes: recipe.dishTypes ?? [],
    ingredients: (recipe.extendedIngredients ?? []).map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount ?? null,
      unit: ingredient.unit ?? '',
      original: ingredient.original,
    })),
    steps,
    nutrition: {
      calories: pickNutrient(recipe.nutrition?.nutrients, 'Calories'),
      proteinG: pickNutrient(recipe.nutrition?.nutrients, 'Protein'),
      carbsG: pickNutrient(recipe.nutrition?.nutrients, 'Carbohydrates'),
      fatG: pickNutrient(recipe.nutrition?.nutrients, 'Fat'),
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

  let body: { id?: number | string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return jsonResponse({ error: 'A valid recipe id is required' }, 400);
  }

  const params = new URLSearchParams({ apiKey, includeNutrition: 'true' });
  const spoonacularResponse = await fetch(`https://api.spoonacular.com/recipes/${id}/information?${params.toString()}`);

  if (spoonacularResponse.status === 402) {
    return jsonResponse({ error: 'Daily recipe quota reached. Try again tomorrow.' }, 402);
  }
  if (spoonacularResponse.status === 404) {
    return jsonResponse({ error: 'Recipe not found' }, 404);
  }
  if (!spoonacularResponse.ok) {
    const details = await spoonacularResponse.text().catch(() => '');
    console.error(`[spoonacular-recipe] ${spoonacularResponse.status}: ${details}`);
    return jsonResponse({ error: 'Recipe details are temporarily unavailable' }, 502);
  }

  const payload = await spoonacularResponse.json();
  return jsonResponse({ recipe: normalizeRecipe(payload) });
});
