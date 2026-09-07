import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type CookingHistoryEntry } from './mock-user';
import type { RecipeShoppingList, ShoppingListItem } from './recipe-types';
import { pantryService } from '../services/pantryService';
import { plannerService } from '../services/plannerService';
import { recipeService } from '../services/recipeService';
import { shoppingService } from '../services/shoppingService';
import { userService } from '../services/userService';

export type ThemeMode = 'light' | 'dark';
export type AppTab = 'home' | 'search' | 'saved' | 'pantry' | 'history' | 'profile';
export type ProfileView =
  | 'profile'
  | 'edit-profile'
  | 'change-password'
  | 'diet-type'
  | 'allergies'
  | 'health-goals'
  | 'plans';

export interface PantryItemRecord {
  id: string;
  name: string;
  emoji: string;
  quantityValue: number;
  unit: string;
  expiry: string;
  daysLeft: number;
  status: 'danger' | 'warning' | 'safe';
  category: string;
  storageLocation: string;
  confidence: 'full' | 'half' | 'low';
}

export interface PlannedMeal {
  id: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  name: string;
  emoji: string;
  time: string;
  cal: string;
  recipeId?: string;
}

export interface NutritionCacheEntry {
  recipeId: string;
  generatedAt: number;
  items: {
    label: 'Calories' | 'Protein' | 'Carbs' | 'Fat';
    value: string;
    percent: number;
  }[];
}

const emptyWeek = () => ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }) as Record<number, PlannedMeal[]>;

interface AppState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  profileView: ProfileView;
  setProfileView: (view: ProfileView) => void;
  selectedRecipeId: string | null;
  openRecipeDetail: (recipeId: string) => void;
  closeRecipeDetail: () => void;
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  onboardingComplete: boolean;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  isAuthenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
  cookModeActive: boolean;
  currentCookRecipeId: string | null;
  currentCookStepIndex: number;
  setCookMode: (active: boolean) => void;
  openCookMode: (recipeId?: string, stepIndex?: number) => void;
  cookingHistoryEntries: CookingHistoryEntry[];
  cookingDrafts: Record<string, number>;
  saveCookDraft: (recipeId: string, stepIndex: number) => void;
  clearCookDraft: (recipeId: string) => void;
  completeCookSession: (
    recipeId: string,
    details?: {
      title?: string;
      servings?: string;
      duration?: string;
      rating?: number;
      favorite?: boolean;
    }
  ) => void;
  toggleHistoryFavorite: (recipeId: string) => void;
  generalShoppingItems: ShoppingListItem[];
  recipeShoppingLists: RecipeShoppingList[];
  toggleShoppingItem: (id: string, scope?: 'general' | 'recipe', recipeListId?: string) => void;
  addGeneralShoppingItems: (items: ShoppingListItem[]) => void;
  saveRecipeShoppingList: (list: RecipeShoppingList) => void;
  removeGeneralShoppingItem: (id: string) => void;
  removeRecipeShoppingList: (recipeListId: string) => void;
  clearGeneralShoppingItems: () => void;
  clearShoppingLists: () => void;
  savedRecipeIds: Set<string>;
  toggleSavedRecipe: (id: string, meta?: { title: string; image: string | null }) => void;
  pantryItems: PantryItemRecord[];
  addPantryItem: (item: PantryItemRecord) => void;
  updatePantryItem: (itemId: string, updates: Partial<PantryItemRecord>) => void;
  removePantryItem: (itemId: string) => void;
  nutritionCache: Record<string, NutritionCacheEntry>;
  saveNutritionCache: (recipeId: string, entry: NutritionCacheEntry) => void;
  mealPlans: Record<string, Record<number, PlannedMeal[]>>;
  setMealPlanWeek: (week: 'thisWeek' | 'nextWeek', plan: Record<number, PlannedMeal[]>) => void;
  setMealSlot: (week: 'thisWeek' | 'nextWeek', day: number, type: PlannedMeal['type'], meal: PlannedMeal) => void;
  clearMealSlot: (week: 'thisWeek' | 'nextWeek', day: number, type: PlannedMeal['type']) => void;
  hydrateRemoteState: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),
      profileView: 'profile',
      setProfileView: (view) => set({ profileView: view }),
      selectedRecipeId: null,
      openRecipeDetail: (recipeId) => set({ selectedRecipeId: recipeId }),
      closeRecipeDetail: () => set({ selectedRecipeId: null }),
      searchDraft: '',
      setSearchDraft: (value) => set({ searchDraft: value }),
      onboardingComplete: false,
      onboardingStep: 0,
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ onboardingComplete: true }),
      isAuthenticated: false,
      setAuthenticated: (auth) => set({ isAuthenticated: auth }),
      cookModeActive: false,
      currentCookRecipeId: null,
      currentCookStepIndex: 0,
      setCookMode: (active) =>
        set((state) => ({
          cookModeActive: active,
          currentCookRecipeId: active ? state.currentCookRecipeId : null,
          currentCookStepIndex: active ? state.currentCookStepIndex : 0,
        })),
      openCookMode: (recipeId, stepIndex = 0) =>
        set({ cookModeActive: true, currentCookRecipeId: recipeId ?? null, currentCookStepIndex: stepIndex }),
      cookingHistoryEntries: [],
      cookingDrafts: {},
      saveCookDraft: (recipeId, stepIndex) =>
        set((state) => ({
          cookingDrafts: {
            ...state.cookingDrafts,
            [recipeId]: stepIndex,
          },
        })),
      clearCookDraft: (recipeId) =>
        set((state) => {
          const nextDrafts = { ...state.cookingDrafts };
          delete nextDrafts[recipeId];
          return { cookingDrafts: nextDrafts };
        }),
      completeCookSession: (recipeId, details) =>
        set((state) => {
          const existing = state.cookingHistoryEntries.find((entry) => entry.recipeId === recipeId);
          const nextEntry: CookingHistoryEntry = {
            id: existing?.id ?? `history-${recipeId}`,
            recipeId,
            title: details?.title ?? existing?.title ?? 'Recipe',
            cookedOn: 'Just now',
            servings: details?.servings ?? existing?.servings ?? '2 servings',
            duration: details?.duration ?? existing?.duration ?? '20 min',
            rating: details?.rating ?? existing?.rating,
            cookedCount: (existing?.cookedCount ?? 0) + 1,
            favorite: details?.favorite ?? existing?.favorite ?? false,
          };
          const nextHistory = [nextEntry, ...state.cookingHistoryEntries.filter((entry) => entry.recipeId !== recipeId)];
          const nextDrafts = { ...state.cookingDrafts };
          delete nextDrafts[recipeId];
          void recipeService.addCookingLog(nextEntry).catch(() => undefined);
          return { cookingHistoryEntries: nextHistory, cookingDrafts: nextDrafts };
        }),
      toggleHistoryFavorite: (recipeId) =>
        set((state) => {
          const nextHistory = state.cookingHistoryEntries.map((entry) =>
            entry.recipeId === recipeId ? { ...entry, favorite: !entry.favorite } : entry
          );
          const updated = nextHistory.find((entry) => entry.recipeId === recipeId);
          if (updated) void recipeService.setCookingHistoryFavorite(recipeId, !!updated.favorite).catch(() => undefined);
          return { cookingHistoryEntries: nextHistory };
        }),
      generalShoppingItems: [],
      recipeShoppingLists: [],
      toggleShoppingItem: (id, scope = 'general', recipeListId) =>
        set((state) => {
          if (scope === 'recipe' && recipeListId) {
            const recipeShoppingLists = state.recipeShoppingLists.map((list) =>
              list.id !== recipeListId
                ? list
                : {
                    ...list,
                    items: list.items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
                  }
            );
            void shoppingService.saveAll({ generalItems: state.generalShoppingItems, recipeLists: recipeShoppingLists }).catch(() => undefined);
            return { recipeShoppingLists };
          }
          const generalShoppingItems = state.generalShoppingItems.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          );
          void shoppingService.saveAll({ generalItems: generalShoppingItems, recipeLists: state.recipeShoppingLists }).catch(() => undefined);
          return { generalShoppingItems };
        }),
      addGeneralShoppingItems: (items) =>
        set((state) => {
          const seen = new Set(state.generalShoppingItems.map((item) => item.name.toLowerCase()));
          const appended = items.filter((item) => !seen.has(item.name.toLowerCase()));
          const generalShoppingItems = [...appended, ...state.generalShoppingItems];
          void shoppingService.saveAll({ generalItems: generalShoppingItems, recipeLists: state.recipeShoppingLists }).catch(() => undefined);
          return { generalShoppingItems };
        }),
      saveRecipeShoppingList: (list) =>
        set((state) => {
          const existingIndex = state.recipeShoppingLists.findIndex((entry) => entry.recipeId === list.recipeId);
          const recipeShoppingLists = existingIndex === -1
            ? [list, ...state.recipeShoppingLists]
            : state.recipeShoppingLists.map((entry, index) => (index === existingIndex ? list : entry));
          void shoppingService.saveAll({ generalItems: state.generalShoppingItems, recipeLists: recipeShoppingLists }).catch(() => undefined);
          return { recipeShoppingLists };
        }),
      removeGeneralShoppingItem: (id) =>
        set((state) => {
          const generalShoppingItems = state.generalShoppingItems.filter((item) => item.id !== id);
          void shoppingService.saveAll({ generalItems: generalShoppingItems, recipeLists: state.recipeShoppingLists }).catch(() => undefined);
          return { generalShoppingItems };
        }),
      removeRecipeShoppingList: (recipeListId) =>
        set((state) => {
          const recipeShoppingLists = state.recipeShoppingLists.filter((list) => list.id !== recipeListId);
          void shoppingService.saveAll({ generalItems: state.generalShoppingItems, recipeLists: recipeShoppingLists }).catch(() => undefined);
          return { recipeShoppingLists };
        }),
      clearGeneralShoppingItems: () =>
        set((state) => {
          void shoppingService.saveAll({ generalItems: [], recipeLists: state.recipeShoppingLists }).catch(() => undefined);
          return { generalShoppingItems: [] };
        }),
      clearShoppingLists: () =>
        set((state) => {
          void shoppingService.saveAll({ generalItems: [], recipeLists: [] }).catch(() => undefined);
          return { generalShoppingItems: [], recipeShoppingLists: [] };
        }),
      savedRecipeIds: new Set(),
      toggleSavedRecipe: (id, meta) =>
        set((state) => {
          const next = new Set(state.savedRecipeIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          void recipeService.setSavedRecipe(id, next.has(id), meta).catch(() => undefined);
          return { savedRecipeIds: next };
        }),
      pantryItems: [],
      addPantryItem: (item) => {
        set((state) => ({ pantryItems: [item, ...state.pantryItems] }));
        void pantryService.upsert(item).catch(() => undefined);
      },
      updatePantryItem: (itemId, updates) =>
        set((state) => {
          const pantryItems = state.pantryItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
          const nextItem = pantryItems.find((item) => item.id === itemId);
          if (nextItem) void pantryService.upsert(nextItem).catch(() => undefined);
          return { pantryItems };
        }),
      removePantryItem: (itemId) => {
        set((state) => ({ pantryItems: state.pantryItems.filter((item) => item.id !== itemId) }));
        void pantryService.remove(itemId).catch(() => undefined);
      },
      nutritionCache: {},
      saveNutritionCache: (recipeId, entry) =>
        set((state) => ({
          nutritionCache: {
            ...state.nutritionCache,
            [recipeId]: entry,
          },
        })),
      mealPlans: {
        thisWeek: emptyWeek(),
        nextWeek: emptyWeek(),
      },
      setMealPlanWeek: (week, plan) =>
        set((state) => {
          const mealPlans = {
            ...state.mealPlans,
            [week]: plan,
          };
          void plannerService.saveWeek(week, mealPlans[week] as Record<number, PlannedMeal[]>).catch(() => undefined);
          return { mealPlans };
        }),
      setMealSlot: (week, day, type, meal) =>
        set((state) => {
          const order = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
          const dayMeals = state.mealPlans[week]?.[day] ?? [];
          const nextMeals = [...dayMeals.filter((entry) => entry.type !== type), meal].sort(
            (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
          );
          const mealPlans = {
            ...state.mealPlans,
            [week]: {
              ...state.mealPlans[week],
              [day]: nextMeals,
            },
          };
          void plannerService.saveWeek(week, mealPlans[week] as Record<number, PlannedMeal[]>).catch(() => undefined);
          return { mealPlans };
        }),
      clearMealSlot: (week, day, type) =>
        set((state) => {
          const dayMeals = state.mealPlans[week]?.[day] ?? [];
          const nextMeals = dayMeals.filter((entry) => entry.type !== type);
          const mealPlans = {
            ...state.mealPlans,
            [week]: {
              ...state.mealPlans[week],
              [day]: nextMeals,
            },
          };
          void plannerService.saveWeek(week, mealPlans[week] as Record<number, PlannedMeal[]>).catch(() => undefined);
          return { mealPlans };
        }),
      hydrateRemoteState: async () => {
        try {
          const [profile, savedRecipeIds, cookingHistoryEntries, pantryItems, shoppingData, mealPlans] = await Promise.all([
            userService.getProfile().catch(() => null),
            recipeService.getSavedRecipeIds().catch(() => []),
            recipeService.getCookingHistory().catch(() => []),
            pantryService.list().catch(() => []),
            shoppingService.getAll().catch(() => ({ generalItems: [], recipeLists: [] })),
            plannerService.getAll().catch(() => ({ thisWeek: emptyWeek(), nextWeek: emptyWeek() })),
          ]);

          set((state) => ({
            theme: state.theme,
            onboardingComplete: !!profile?.onboarding_completed,
            savedRecipeIds: new Set(savedRecipeIds),
            cookingHistoryEntries,
            pantryItems,
            generalShoppingItems: shoppingData.generalItems,
            recipeShoppingLists: shoppingData.recipeLists,
            mealPlans,
          }));
        } catch {
          return;
        }
      },
    }),
    {
      name: 'recipe-os-native-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        onboardingComplete: state.onboardingComplete,
        searchDraft: state.searchDraft,
        onboardingStep: state.onboardingStep,
        isAuthenticated: state.isAuthenticated,
        cookingHistoryEntries: state.cookingHistoryEntries,
        cookingDrafts: state.cookingDrafts,
        generalShoppingItems: state.generalShoppingItems,
        recipeShoppingLists: state.recipeShoppingLists,
        savedRecipeIds: Array.from(state.savedRecipeIds),
        pantryItems: state.pantryItems,
        nutritionCache: state.nutritionCache,
        mealPlans: state.mealPlans,
      }),
      merge: (persisted, current) => {
        const next = persisted as Partial<AppState> & { savedRecipeIds?: string[] };
        return {
          ...current,
          ...next,
          searchDraft: next.searchDraft ?? current.searchDraft,
          savedRecipeIds: new Set(next.savedRecipeIds ?? Array.from(current.savedRecipeIds)),
          pantryItems: next.pantryItems ?? current.pantryItems,
          nutritionCache: next.nutritionCache ?? current.nutritionCache,
          mealPlans: next.mealPlans ?? current.mealPlans,
        };
      },
    }
  )
);

export function getPantryInventoryNames(items: PantryItemRecord[]) {
  return items.map((item) => item.name);
}
