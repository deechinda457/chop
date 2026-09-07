const recipeList = require('./recipeList');
const loadRecipeSource = require('./loadRecipeSource');
const fetchImages = require('./fetchImages');
const insertRecipe = require('./insertRecipe');
const verify = require('./verify');
const { loadProgress, isCompleted, markCompleted } = require('./progress');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedRegion(region, recipes, progress) {
  console.log(`\nStarting ${region}: ${recipes.length} recipes`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < recipes.length; index += 1) {
    const recipeName = recipes[index];
    if (isCompleted(progress, recipeName)) {
      console.log(`[${region}] Skipping completed recipe ${index + 1}/${recipes.length}: ${recipeName}`);
      skipped += 1;
      continue;
    }

    console.log(`[${region}] Processing ${index + 1}/${recipes.length}: ${recipeName}`);

    try {
      const generated = await loadRecipeSource(recipeName, region);
      if (!generated) {
        console.log(`- No source found (add scripts/anchorRecipes/${region}/<slug>.json): ${recipeName}`);
        failed += 1;
        continue;
      }

      const images = await fetchImages(recipeName, region, 3);
      generated.image_urls = images;

      const id = await insertRecipe(generated);
      if (id) {
        console.log(`✓ Seeded: ${recipeName}`);
        success += 1;
        markCompleted(progress, recipeName);
      } else {
        console.log(`- Skipped duplicate: ${recipeName}`);
        skipped += 1;
        markCompleted(progress, recipeName);
      }

      await sleep(1500);
    } catch (error) {
      console.error(`✗ Error: ${recipeName}`, error.message);
      failed += 1;
    }
  }

  console.log(`\n${region} complete: ✓ ${success} seeded | - ${skipped} skipped | ✗ ${failed} failed`);
}

async function main() {
  const targetRegion = process.argv[2];
  const progress = loadProgress();

  if (targetRegion) {
    if (!recipeList[targetRegion]) {
      throw new Error(`Unknown region: ${targetRegion}`);
    }
    await seedRegion(targetRegion, recipeList[targetRegion], progress);
  } else {
    for (const [region, recipes] of Object.entries(recipeList)) {
      await seedRegion(region, recipes, progress);
      await sleep(5000);
    }
  }

  console.log('\nRunning seed verification...');
  await verify();
  console.log('\nAll seeding complete!');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = main;
