import { getRecipeImages } from '../services/recipeImages';

export interface RecipeIngredient {
  name: string;
  quantity: string;
}

export interface RecipeNutritionItem {
  label: 'Calories' | 'Protein' | 'Carbs' | 'Fat';
  value: string;
  percent: number;
}

export interface RecipeRecord {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: string;
  matched: string;
  tags: string[];
  badge: 'Can Make Now' | 'Use It Up' | 'Healthy Pick' | 'Easy Dinner' | 'Fresh Pick';
  badgeColor: 'green' | 'amber';
  images: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  nutrition: RecipeNutritionItem[];
  savedAt: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

export interface RecipeShoppingList {
  id: string;
  recipeId: string;
  recipeTitle: string;
  items: ShoppingListItem[];
  createdAt: number;
}

export const pantryInventory = [
  'Pasta',
  'Garlic',
  'Parmesan',
  'Olive Oil',
  'Chicken Breast',
  'Rice',
  'Spinach',
  'Cherry Tomatoes',
  'Greek Yogurt',
  'Salmon',
  'Lemon',
  'Broccoli',
  'Sourdough Bread',
];

export const recipes: RecipeRecord[] = [
  {
    id: '1',
    title: 'Pasta Primavera',
    shortDescription: 'Fresh vegetables folded into a light, glossy pasta sauce.',
    description:
      'A quick skillet pasta with seasonal vegetables, garlic, lemon, and parmesan that comes together fast but still feels complete.',
    prepTime: '10 min',
    cookTime: '15 min',
    servings: 2,
    difficulty: 'Easy',
    calories: '380 cal',
    matched: '5/7 ingredients matched',
    tags: ['Quick', 'Vegetarian'],
    badge: 'Can Make Now',
    badgeColor: 'green',
    images: getRecipeImages(null, 'Pasta Primavera'),
    ingredients: [
      { quantity: '200g', name: 'Pasta' },
      { quantity: '2 cloves', name: 'Garlic' },
      { quantity: '1 cup', name: 'Cherry Tomatoes' },
      { quantity: '1 cup', name: 'Zucchini' },
      { quantity: '1/4 cup', name: 'Parmesan' },
      { quantity: '2 tbsp', name: 'Olive Oil' },
      { quantity: '1 tsp', name: 'Lemon Zest' },
    ],
    steps: [
      'Boil the pasta in salted water until al dente and reserve a little pasta water.',
      'Saute garlic, tomatoes, and zucchini in olive oil until softened and glossy.',
      'Add the drained pasta, splash in pasta water, then finish with parmesan and lemon zest.',
    ],
    nutrition: [
      { label: 'Calories', value: '380', percent: 19 },
      { label: 'Protein', value: '14g', percent: 28 },
      { label: 'Carbs', value: '52g', percent: 19 },
      { label: 'Fat', value: '13g', percent: 17 },
    ],
    savedAt: 1715430100000,
  },
  {
    id: '2',
    title: 'Chicken Stir-Fry',
    shortDescription: 'Fast seared chicken with crisp vegetables and a savory sauce.',
    description:
      'A weeknight pan dinner built around expiring chicken and vegetables, with just enough sauce to coat everything without feeling heavy.',
    prepTime: '12 min',
    cookTime: '8 min',
    servings: 2,
    difficulty: 'Easy',
    calories: '420 cal',
    matched: '4/6 ingredients matched',
    tags: ['High Protein', 'Quick'],
    badge: 'Use It Up',
    badgeColor: 'amber',
    images: getRecipeImages(null, 'Chicken Stir-Fry'),
    ingredients: [
      { quantity: '250g', name: 'Chicken Breast' },
      { quantity: '1 cup', name: 'Broccoli' },
      { quantity: '1', name: 'Bell Pepper' },
      { quantity: '2 tbsp', name: 'Soy Sauce' },
      { quantity: '1 tbsp', name: 'Sesame Oil' },
      { quantity: '1 cup', name: 'Rice' },
    ],
    steps: [
      'Sear the chicken in a hot skillet until browned and nearly cooked through.',
      'Add broccoli and bell pepper, cooking until crisp-tender.',
      'Pour in soy sauce and sesame oil, then serve over warm rice.',
    ],
    nutrition: [
      { label: 'Calories', value: '420', percent: 21 },
      { label: 'Protein', value: '31g', percent: 62 },
      { label: 'Carbs', value: '29g', percent: 11 },
      { label: 'Fat', value: '17g', percent: 22 },
    ],
    savedAt: 1715430200000,
  },
  {
    id: '3',
    title: 'Greek Salad Bowl',
    shortDescription: 'Bright vegetables, creamy yogurt dressing, and a clean finish.',
    description:
      'A crisp bowl layered with cucumber, tomato, herbs, and tangy dressing for a lighter lunch with enough structure to stay satisfying.',
    prepTime: '8 min',
    cookTime: '2 min',
    servings: 1,
    difficulty: 'Easy',
    calories: '290 cal',
    matched: '3/5 ingredients matched',
    tags: ['Healthy', 'Low Carb'],
    badge: 'Healthy Pick',
    badgeColor: 'green',
    images: getRecipeImages(null, 'Greek Salad Bowl'),
    ingredients: [
      { quantity: '1 cup', name: 'Cucumber' },
      { quantity: '1 cup', name: 'Cherry Tomatoes' },
      { quantity: '1/2 cup', name: 'Greek Yogurt' },
      { quantity: '1 tbsp', name: 'Olive Oil' },
      { quantity: '1 tsp', name: 'Dried Oregano' },
    ],
    steps: [
      'Chop the cucumber and tomatoes into bite-size pieces.',
      'Whisk yogurt, olive oil, and oregano into a quick dressing.',
      'Toss everything together and season before serving.',
    ],
    nutrition: [
      { label: 'Calories', value: '290', percent: 15 },
      { label: 'Protein', value: '18g', percent: 36 },
      { label: 'Carbs', value: '16g', percent: 6 },
      { label: 'Fat', value: '18g', percent: 23 },
    ],
    savedAt: 1715430300000,
  },
  {
    id: '4',
    title: 'Roasted Veggie Bowl',
    shortDescription: 'Warm grains, caramelized vegetables, and a pantry-friendly finish.',
    description:
      'A flexible bowl built from roasted vegetables and grains with a clean vinaigrette, good for nights when the fridge is nearly empty.',
    prepTime: '10 min',
    cookTime: '18 min',
    servings: 2,
    difficulty: 'Medium',
    calories: '340 cal',
    matched: '3/6 ingredients matched',
    tags: ['Vegetarian', 'Dinner'],
    badge: 'Easy Dinner',
    badgeColor: 'amber',
    images: getRecipeImages(null, 'Roasted Veggie Bowl'),
    ingredients: [
      { quantity: '1 cup', name: 'Cooked Rice' },
      { quantity: '1 cup', name: 'Broccoli' },
      { quantity: '1 cup', name: 'Carrots' },
      { quantity: '1 tbsp', name: 'Olive Oil' },
      { quantity: '1 tbsp', name: 'Lemon Juice' },
      { quantity: '1/4 cup', name: 'Pumpkin Seeds' },
    ],
    steps: [
      'Roast broccoli and carrots with olive oil until browned at the edges.',
      'Warm the rice and layer it into bowls.',
      'Top with roasted vegetables, lemon juice, and pumpkin seeds.',
    ],
    nutrition: [
      { label: 'Calories', value: '340', percent: 17 },
      { label: 'Protein', value: '11g', percent: 22 },
      { label: 'Carbs', value: '44g', percent: 16 },
      { label: 'Fat', value: '12g', percent: 15 },
    ],
    savedAt: 1715430400000,
  },
  {
    id: '5',
    title: 'Herbed Salmon Plate',
    shortDescription: 'Seared salmon with greens and citrus for a cleaner dinner.',
    description:
      'A balanced plate with salmon, fresh herbs, and a lemon finish that feels polished while staying simple enough for a weeknight.',
    prepTime: '10 min',
    cookTime: '12 min',
    servings: 2,
    difficulty: 'Medium',
    calories: '410 cal',
    matched: '4/6 ingredients matched',
    tags: ['Fresh', 'High Protein'],
    badge: 'Fresh Pick',
    badgeColor: 'green',
    images: getRecipeImages(null, 'Herbed Salmon Plate'),
    ingredients: [
      { quantity: '2 fillets', name: 'Salmon' },
      { quantity: '2 cups', name: 'Mixed Greens' },
      { quantity: '1', name: 'Lemon' },
      { quantity: '1 tbsp', name: 'Olive Oil' },
      { quantity: '1 tsp', name: 'Parsley' },
      { quantity: '1 cup', name: 'Asparagus' },
    ],
    steps: [
      'Season the salmon and sear until crisp outside and just cooked through.',
      'Saute asparagus quickly in olive oil.',
      'Plate with greens, squeeze over lemon, and finish with parsley.',
    ],
    nutrition: [
      { label: 'Calories', value: '410', percent: 21 },
      { label: 'Protein', value: '34g', percent: 68 },
      { label: 'Carbs', value: '10g', percent: 4 },
      { label: 'Fat', value: '25g', percent: 32 },
    ],
    savedAt: 1715430500000,
  },
  {
    id: '6',
    title: 'Avocado Toast Deluxe',
    shortDescription: 'Thick toast, creamy avocado, herbs, and a bright finish.',
    description:
      'A compact breakfast that still feels intentional, with layers of avocado, crunch, and citrus to keep it from going flat.',
    prepTime: '5 min',
    cookTime: '5 min',
    servings: 1,
    difficulty: 'Easy',
    calories: '280 cal',
    matched: '2/5 ingredients matched',
    tags: ['Breakfast', 'Quick'],
    badge: 'Can Make Now',
    badgeColor: 'green',
    images: getRecipeImages(null, 'Avocado Toast Deluxe'),
    ingredients: [
      { quantity: '2 slices', name: 'Sourdough Bread' },
      { quantity: '1', name: 'Avocado' },
      { quantity: '1 tsp', name: 'Lemon Juice' },
      { quantity: '1 tsp', name: 'Chili Flakes' },
      { quantity: '1 tbsp', name: 'Microgreens' },
    ],
    steps: [
      'Toast the sourdough until golden.',
      'Mash avocado with lemon juice and spread over the toast.',
      'Finish with chili flakes and microgreens before serving.',
    ],
    nutrition: [
      { label: 'Calories', value: '280', percent: 14 },
      { label: 'Protein', value: '7g', percent: 14 },
      { label: 'Carbs', value: '26g', percent: 9 },
      { label: 'Fat', value: '17g', percent: 22 },
    ],
    savedAt: 1715430600000,
  },
];

export const initialGeneralShoppingItems: ShoppingListItem[] = [
  { id: 's1', name: 'Chicken Breast', quantity: '500g', category: 'Proteins', checked: false },
  { id: 's2', name: 'Salmon Fillet', quantity: '300g', category: 'Proteins', checked: false },
  { id: 's3', name: 'Whole Milk', quantity: '1 liter', category: 'Dairy', checked: true },
  { id: 's4', name: 'Greek Yogurt', quantity: '500g', category: 'Dairy', checked: false },
  { id: 's5', name: 'Parmesan', quantity: '200g', category: 'Dairy', checked: false },
  { id: 's6', name: 'Broccoli', quantity: '1 head', category: 'Vegetables', checked: true },
  { id: 's7', name: 'Bell Peppers', quantity: '3 pcs', category: 'Vegetables', checked: false },
  { id: 's8', name: 'Cherry Tomatoes', quantity: '250g', category: 'Vegetables', checked: false },
  { id: 's9', name: 'Fresh Basil', quantity: '1 bunch', category: 'Herbs', checked: false },
  { id: 's10', name: 'Olive Oil', quantity: '500ml', category: 'Pantry Staples', checked: true },
  { id: 's11', name: 'Pasta', quantity: '500g', category: 'Pantry Staples', checked: false },
  { id: 's12', name: 'Sourdough Bread', quantity: '1 loaf', category: 'Bakery', checked: false },
];

export function getRecipeById(id: string) {
  return recipes.find((recipe) => recipe.id === id) ?? null;
}

export function getRecipeCategory(recipe: RecipeRecord) {
  if (recipe.badge === 'Can Make Now') return 'Can Make Now';
  if (recipe.badge === 'Use It Up') return 'Use It Up';
  return 'Recently Saved';
}
