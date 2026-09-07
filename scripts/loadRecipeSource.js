const fs = require('fs');
const path = require('path');
const { normalizeRecipe } = require('./recipeSchema');

const anchorDir = path.join(__dirname, 'anchorRecipes');

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function loadAnchorRecipe(recipeName, region) {
  const filePath = path.join(anchorDir, region, `${slugify(recipeName)}.json`);
  if (!fs.existsSync(filePath)) return null;

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[loadRecipeSource] Invalid JSON in ${filePath}: ${error.message}`);
    return null;
  }

  const normalized = normalizeRecipe(raw, { title: recipeName, cuisineType: region });
  if (!normalized) {
    console.error(`[loadRecipeSource] ${filePath} is missing required fields (title/description/cuisine_type/ingredients/steps/nutrition)`);
  }
  return normalized;
}

// Founder-written anchor files (scripts/anchorRecipes/<region>/<slug>.json) are the
// only source wired up so far. Open-source dataset ingestion (the other source
// CLAUDE.md calls for) isn't built yet — add a loadDatasetRecipe() here once a real
// licensed dataset file is chosen. Deliberately no AI fallback: if neither source has
// the dish, seed.js should skip it, not invent one.
module.exports = async function loadRecipeSource(recipeName, region) {
  return loadAnchorRecipe(recipeName, region);
};
