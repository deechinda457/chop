# Anchor recipes

Founder-written recipe content for the Homeland Dishes collection (CLAUDE.md).
No AI is used to generate anything in this directory — every file here should be
either written by hand or transcribed from a real, licensed source (a cookbook,
a permissively-licensed open dataset, a community submission).

## File layout

One file per dish: `scripts/anchorRecipes/<region>/<slug>.json`, where `<region>`
matches a key in `scripts/recipeList.js` (currently `nigerian` or `ghanaian`) and
`<slug>` is the dish name lowercased with non-alphanumeric characters replaced by
hyphens (e.g. "Egusi Soup" -> `egusi-soup.json`, "Asaro (Yam Porridge)" ->
`asaro-yam-porridge.json`).

`scripts/loadRecipeSource.js` looks up files by this exact convention. A dish in
`scripts/recipeList.js` with no matching file is skipped by `scripts/seed.js`
(reported as "No source found"), not substituted with anything invented.

## Expected shape

```json
{
  "title": "Egusi Soup",
  "description": "Two to three sentences, appetizing and accurate.",
  "cuisine_type": "nigerian",
  "meal_type": ["lunch", "dinner"],
  "diet_tags": ["gluten-free"],
  "difficulty": "medium",
  "prep_time_mins": 20,
  "cook_time_mins": 45,
  "default_servings": 4,
  "equipment": ["pot", "blender"],
  "ingredients": [
    { "name": "Ground egusi (melon seeds)", "quantity": 2, "unit": "cup", "notes": null, "is_optional": false }
  ],
  "steps": [
    { "step_number": 1, "instruction": "...", "tip": null, "duration_mins": 10 }
  ],
  "nutrition_per_serving": {
    "calories": 420,
    "protein_g": 18,
    "carbs_g": 12,
    "fat_g": 30,
    "fiber_g": 4,
    "sugar_g": 2,
    "sodium_mg": 380
  }
}
```

`meal_type` must be drawn from `breakfast, lunch, dinner, snack, dessert, drink`;
`diet_tags` from `vegetarian, vegan, halal, kosher, gluten-free, dairy-free,
nut-free, high-protein, low-carb, keto, quick`; `difficulty` from `easy, medium,
hard`. See `scripts/recipeSchema.js` for the exact validation.

## Not built yet

Open-source dataset ingestion (the other CLAUDE.md-approved source, alongside
anchor files) has no loader yet — `scripts/loadRecipeSource.js` only reads this
directory. Add a dataset loader there once a specific licensed dataset is chosen.
