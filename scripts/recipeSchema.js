const allowedMealTypes = new Set(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink']);
const allowedDietTags = new Set([
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'high-protein',
  'low-carb',
  'keto',
  'quick',
]);
const allowedDifficulty = new Set(['easy', 'medium', 'hard']);

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

// Validates and normalizes a recipe object supplied by a real source (a founder-
// written anchor file, or an ingested open-source dataset row) into the shape
// insertRecipe.js expects. No AI is involved here — this only checks shape.
function normalizeRecipe(raw, { title: fallbackTitle, cuisineType: fallbackCuisine } = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const title = String(raw.title ?? fallbackTitle ?? '').trim();
  const description = String(raw.description ?? '').trim();
  const parsedCuisine = String(raw.cuisine_type ?? fallbackCuisine ?? '').trim();
  const mealType = normalizeStringArray(raw.meal_type)
    .map((item) => item.toLowerCase())
    .filter((item) => allowedMealTypes.has(item));
  const dietTags = normalizeStringArray(raw.diet_tags)
    .map((item) => item.toLowerCase())
    .filter((item) => allowedDietTags.has(item));
  const difficulty = String(raw.difficulty ?? 'medium').toLowerCase();
  const prepTimeMins = Number(raw.prep_time_mins);
  const cookTimeMins = Number(raw.cook_time_mins);
  const defaultServings = Number(raw.default_servings);
  const equipment = normalizeStringArray(raw.equipment);
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .map((ingredient, index) => ({
          name: String(ingredient?.name ?? '').trim(),
          quantity:
            ingredient?.quantity === undefined || ingredient?.quantity === null || Number.isNaN(Number(ingredient?.quantity))
              ? null
              : Number(ingredient.quantity),
          unit: String(ingredient?.unit ?? '').trim(),
          notes: ingredient?.notes === undefined || ingredient?.notes === null ? null : String(ingredient.notes).trim(),
          is_optional: Boolean(ingredient?.is_optional),
          sort_order: index,
        }))
        .filter((ingredient) => Boolean(ingredient.name))
    : [];
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((step, index) => ({
          step_number: Number(step?.step_number ?? index + 1) || index + 1,
          instruction: String(step?.instruction ?? '').trim(),
          tip: step?.tip === undefined || step?.tip === null ? null : String(step.tip).trim(),
          duration_mins:
            step?.duration_mins === undefined || step?.duration_mins === null || Number.isNaN(Number(step?.duration_mins))
              ? null
              : Number(step.duration_mins),
        }))
        .filter((step) => Boolean(step.instruction))
    : [];
  const nutrition =
    raw.nutrition_per_serving && typeof raw.nutrition_per_serving === 'object'
      ? {
          calories: Number(raw.nutrition_per_serving.calories),
          protein_g: Number(raw.nutrition_per_serving.protein_g),
          carbs_g: Number(raw.nutrition_per_serving.carbs_g),
          fat_g: Number(raw.nutrition_per_serving.fat_g),
          fiber_g:
            raw.nutrition_per_serving.fiber_g === undefined || raw.nutrition_per_serving.fiber_g === null || Number.isNaN(Number(raw.nutrition_per_serving.fiber_g))
              ? null
              : Number(raw.nutrition_per_serving.fiber_g),
          sugar_g:
            raw.nutrition_per_serving.sugar_g === undefined || raw.nutrition_per_serving.sugar_g === null || Number.isNaN(Number(raw.nutrition_per_serving.sugar_g))
              ? null
              : Number(raw.nutrition_per_serving.sugar_g),
          sodium_mg:
            raw.nutrition_per_serving.sodium_mg === undefined || raw.nutrition_per_serving.sodium_mg === null || Number.isNaN(Number(raw.nutrition_per_serving.sodium_mg))
              ? null
              : Number(raw.nutrition_per_serving.sodium_mg),
        }
      : null;

  if (!title || !description || !parsedCuisine || ingredients.length === 0 || steps.length === 0 || !nutrition) {
    return null;
  }

  return {
    title,
    description,
    cuisine_type: parsedCuisine,
    meal_type: mealType,
    diet_tags: dietTags,
    difficulty: allowedDifficulty.has(difficulty) ? difficulty : 'medium',
    prep_time_mins: Number.isFinite(prepTimeMins) ? prepTimeMins : 10,
    cook_time_mins: Number.isFinite(cookTimeMins) ? cookTimeMins : 20,
    default_servings: Number.isFinite(defaultServings) ? defaultServings : 2,
    equipment,
    ingredients,
    steps,
    nutrition_per_serving: {
      calories: Number.isFinite(nutrition.calories) ? nutrition.calories : 0,
      protein_g: Number.isFinite(nutrition.protein_g) ? nutrition.protein_g : 0,
      carbs_g: Number.isFinite(nutrition.carbs_g) ? nutrition.carbs_g : 0,
      fat_g: Number.isFinite(nutrition.fat_g) ? nutrition.fat_g : 0,
      fiber_g: nutrition.fiber_g,
      sugar_g: nutrition.sugar_g,
      sodium_mg: nutrition.sodium_mg,
    },
  };
}

module.exports = { normalizeRecipe };
