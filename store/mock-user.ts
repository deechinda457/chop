export type MembershipTier = 'free' | 'pro' | 'family';

export interface FamilyMember {
  id: string;
  name: string;
  dietType: string;
  initials: string;
}

export interface CookingHistoryEntry {
  id: string;
  recipeId: string;
  title: string;
  cookedOn: string;
  servings: string;
  duration: string;
  rating?: number;
  cookedCount?: number;
  favorite?: boolean;
}

export const dietTypeOptions = [
  'None',
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Keto',
  'Paleo',
  'Mediterranean',
  'Halal',
  'Kosher',
] as const;

export const allergyOptions = [
  'None',
  'Gluten',
  'Dairy',
  'Nuts',
  'Eggs',
  'Soy',
  'Shellfish',
  'Fish',
  'Wheat',
] as const;

export const healthGoalOptions = [
  'Balanced',
  'Weight Loss',
  'Muscle Gain',
  'Heart Healthy',
  'Diabetic Friendly',
  'Low Sodium',
  'High Protein',
] as const;

export const mockUser = {
  fullName: 'Alex Johnson',
  username: 'alexjohnson',
  email: 'alex.johnson@email.com',
  initials: 'AJ',
  // Swap this value to 'pro' or 'family' to preview other membership states.
  tier: 'free' as MembershipTier,
  renewalDate: 'Renews on Sep 18, 2026',
  stats: {
    recipesCooked: '47',
    streakDays: '12',
    savedRecipes: '23',
  },
  preferences: {
    dietType: 'Mediterranean',
    allergies: ['Dairy', 'Nuts'],
    healthGoal: 'Balanced',
  },
  notifications: {
    expiryAlerts: true,
  },
  familyMembers: [
    { id: 'f1', name: 'Sarah', dietType: 'Vegetarian', initials: 'SA' },
    { id: 'f2', name: 'Tom', dietType: 'High Protein', initials: 'TO' },
    { id: 'f3', name: 'Lina', dietType: 'Gluten Free', initials: 'LI' },
  ] satisfies FamilyMember[],
  cookingHistory: [
    { id: 'h1', recipeId: '1', title: 'Pasta Primavera', cookedOn: 'Today, 7:10 PM', servings: '2 servings', duration: '26 min', rating: 5, cookedCount: 3, favorite: true },
    { id: 'h2', recipeId: '2', title: 'Chicken Stir-Fry', cookedOn: 'Yesterday, 6:45 PM', servings: '3 servings', duration: '22 min', rating: 4, favorite: false },
    { id: 'h3', recipeId: '3', title: 'Greek Salad Bowl', cookedOn: 'Monday, 12:20 PM', servings: '1 serving', duration: '14 min', favorite: false },
    { id: 'h4', recipeId: '5', title: 'Herbed Salmon Plate', cookedOn: 'Saturday, 7:05 PM', servings: '2 servings', duration: '31 min', rating: 5, cookedCount: 2, favorite: true },
  ] satisfies CookingHistoryEntry[],
};
