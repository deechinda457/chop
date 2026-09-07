const { supabase } = require('./config');

function summarizeCounts(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row?.[key] ?? 'unknown');
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function logCounts(label, counts) {
  console.log(`\n${label}`);
  const entries = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [key, value] of entries) {
    console.log(`- ${key}: ${value}`);
  }
}

async function verify() {
  const [{ data: recipes, error: recipesError }, { data: ingredients, error: ingredientsError }, { data: steps, error: stepsError }, { data: nutrition, error: nutritionError }] =
    await Promise.all([
      supabase.from('recipes').select('id, title, cuisine_type, description, image_urls, prep_time_mins, cook_time_mins, total_time_mins, default_servings, equipment'),
      supabase.from('recipe_ingredients').select('recipe_id'),
      supabase.from('recipe_steps').select('recipe_id'),
      supabase.from('recipe_nutrition').select('recipe_id'),
    ]);

  if (recipesError) throw recipesError;
  if (ingredientsError) throw ingredientsError;
  if (stepsError) throw stepsError;
  if (nutritionError) throw nutritionError;

  const ingredientCounts = summarizeCounts(ingredients ?? [], 'recipe_id');
  const stepCounts = summarizeCounts(steps ?? [], 'recipe_id');
  const nutritionCounts = summarizeCounts(nutrition ?? [], 'recipe_id');
  const cuisineCounts = summarizeCounts(recipes ?? [], 'cuisine_type');

  const totalRecipes = recipes?.length ?? 0;
  const withImages = (recipes ?? []).filter((recipe) => Array.isArray(recipe.image_urls) && recipe.image_urls.filter(Boolean).length > 0).length;
  const withIngredients = (recipes ?? []).filter((recipe) => (ingredientCounts.get(String(recipe.id)) ?? 0) > 0).length;
  const withSteps = (recipes ?? []).filter((recipe) => (stepCounts.get(String(recipe.id)) ?? 0) > 0).length;
  const withNutrition = (recipes ?? []).filter((recipe) => (nutritionCounts.get(String(recipe.id)) ?? 0) > 0).length;

  console.log('\nSeed verification');
  console.log(`- Total recipes: ${totalRecipes}`);
  console.log(`- Recipes with images: ${withImages}`);
  console.log(`- Recipes with ingredients: ${withIngredients}`);
  console.log(`- Recipes with steps: ${withSteps}`);
  console.log(`- Recipes with nutrition: ${withNutrition}`);

  logCounts('Recipes per cuisine', cuisineCounts);

  const missingCritical = (recipes ?? []).filter((recipe) => {
    const title = String(recipe.title ?? '').trim();
    const description = String(recipe.description ?? '').trim();
    const images = Array.isArray(recipe.image_urls) ? recipe.image_urls.filter(Boolean) : [];
    const ingredientCount = ingredientCounts.get(String(recipe.id)) ?? 0;
    const stepCount = stepCounts.get(String(recipe.id)) ?? 0;
    const nutritionCount = nutritionCounts.get(String(recipe.id)) ?? 0;
    return !title || !description || images.length === 0 || ingredientCount === 0 || stepCount === 0 || nutritionCount === 0;
  });

  if (missingCritical.length > 0) {
    console.log('\nRecipes missing critical data');
    for (const recipe of missingCritical.slice(0, 25)) {
      console.log(`- ${recipe.title ?? recipe.id}`);
    }
    if (missingCritical.length > 25) {
      console.log(`- ...and ${missingCritical.length - 25} more`);
    }
  } else {
    console.log('\nNo recipes missing critical data.');
  }
}

if (require.main === module) {
  verify().catch((error) => {
    console.error('[verify] Failed:', error);
    process.exit(1);
  });
}

module.exports = verify;
