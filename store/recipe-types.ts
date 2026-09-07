export interface RecipeIngredient {
  name: string;
  quantity: string;
  pantryMatch?: boolean;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  tip?: string | null;
  durationMins?: number | null;
}

export interface RecipeNutritionItem {
  label: 'Calories' | 'Protein' | 'Carbs' | 'Fat';
  value: string;
  percent: number;
}

export interface RecipeVideo {
  title: string;
  youTubeId: string;
  thumbnail: string;
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

export interface RecipeDetailRecord {
  id: string;
  remoteId: string;
  title: string;
  shortDescription: string;
  description: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: string;
  matched: string;
  tags: string[];
  badge: 'Can Make Now' | 'Use It Up' | 'Healthy Pick' | 'Easy Dinner' | 'Fresh Pick';
  badgeColor: 'green' | 'amber';
  images: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: RecipeNutritionItem[];
  savedAt: number;
  equipment: string[];
}

