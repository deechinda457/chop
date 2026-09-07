const { supabase } = require('./config');

async function insertRecipe(recipe) {
  if (!recipe || !recipe.title) {
    throw new Error('insertRecipe requires a generated recipe');
  }

  const { data: existing, error: existingError } = await supabase
    .from('recipes')
    .select('id')
    .ilike('title', recipe.title)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    console.log(`Skipped duplicate: ${recipe.title}`);
    return null;
  }

  const imageUrls = Array.isArray(recipe.image_urls) ? recipe.image_urls.filter(Boolean) : [];
  const totalTimeMins = Number(recipe.total_time_mins ?? recipe.prep_time_mins + recipe.cook_time_mins);

  const { data: createdRecipe, error: createError } = await supabase
    .from('recipes')
    .insert({
      title: recipe.title,
      description: recipe.description,
      cuisine_type: recipe.cuisine_type,
      meal_type: recipe.meal_type,
      diet_tags: recipe.diet_tags,
      difficulty: recipe.difficulty,
      prep_time_mins: recipe.prep_time_mins,
      cook_time_mins: recipe.cook_time_mins,
      total_time_mins: Number.isFinite(totalTimeMins) ? totalTimeMins : recipe.prep_time_mins + recipe.cook_time_mins,
      default_servings: recipe.default_servings,
      equipment: recipe.equipment,
      image_urls: imageUrls,
      source_url: recipe.source_url ?? null,
      is_user_generated: false,
      created_by: null,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  const recipeId = String(createdRecipe.id);

  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    const ingredientRows = recipe.ingredients.map((ingredient, index) => ({
      recipe_id: recipeId,
      name: ingredient.name,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      notes: ingredient.notes ?? null,
      is_optional: Boolean(ingredient.is_optional),
      sort_order: ingredient.sort_order ?? index,
    }));

    const { error: ingredientError } = await supabase.from('recipe_ingredients').insert(ingredientRows);
    if (ingredientError) {
      const fallbackRows = ingredientRows.map(({ is_optional, ...row }) => row);
      const { error: retryError } = await supabase.from('recipe_ingredients').insert(fallbackRows);
      if (retryError) throw retryError;
    }
  }

  if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
    const { error: stepError } = await supabase.from('recipe_steps').insert(
      recipe.steps.map((step, index) => ({
        recipe_id: recipeId,
        step_number: step.step_number ?? index + 1,
        instruction: step.instruction,
        tip: step.tip ?? null,
        duration_mins: step.duration_mins ?? null,
      }))
    );
    if (stepError) {
      throw stepError;
    }
  }

  if (recipe.nutrition_per_serving) {
    const baseNutrition = {
      recipe_id: recipeId,
      calories_per_serving: recipe.nutrition_per_serving.calories ?? null,
      protein_g: recipe.nutrition_per_serving.protein_g ?? null,
      carbs_g: recipe.nutrition_per_serving.carbs_g ?? null,
      fat_g: recipe.nutrition_per_serving.fat_g ?? null,
      generated_by: 'source',
    };

    const extendedNutrition = {
      ...baseNutrition,
      fiber_g: recipe.nutrition_per_serving.fiber_g ?? null,
      sugar_g: recipe.nutrition_per_serving.sugar_g ?? null,
      sodium_mg: recipe.nutrition_per_serving.sodium_mg ?? null,
    };

    const { error: nutritionError } = await supabase.from('recipe_nutrition').insert(extendedNutrition);
    if (nutritionError) {
      const { error: retryNutritionError } = await supabase.from('recipe_nutrition').insert(baseNutrition);
      if (retryNutritionError) throw retryNutritionError;
    }
  }

  return recipeId;
}

module.exports = insertRecipe;
