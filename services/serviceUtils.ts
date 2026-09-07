import { supabase } from '../lib/supabase';

const legacyRecipeTitleById: Record<string, string> = {
  '1': 'Pasta Primavera',
  '2': 'Chicken Stir-Fry',
  '3': 'Greek Salad Bowl',
  '4': 'Roasted Veggie Bowl',
  '5': 'Herbed Salmon Plate',
  '6': 'Avocado Toast Deluxe',
};

let remoteRecipeIdByTitle: Map<string, string> | null = null;
let remoteRecipeById: Map<string, { id: string; title: string }> | null = null;

export async function requireCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('No authenticated user');
  return data.user;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getLocalRecipeIdByTitle(title?: string | null) {
  if (!title) return null;
  const normalizedTitle = title.toLowerCase();
  const legacyEntry = Object.entries(legacyRecipeTitleById).find(([, value]) => value.toLowerCase() === normalizedTitle);
  return legacyEntry?.[0] ?? null;
}

export async function getRemoteRecipeMaps() {
  if (remoteRecipeIdByTitle && remoteRecipeById) {
    return {
      byTitle: remoteRecipeIdByTitle,
      byId: remoteRecipeById,
    };
  }

  const { data, error } = await supabase.from('recipes').select('id, title');
  if (error) throw error;

  remoteRecipeIdByTitle = new Map(
    (data ?? [])
      .filter((row) => typeof row.title === 'string')
      .map((row) => [String(row.title).toLowerCase(), String(row.id)])
  );

  remoteRecipeById = new Map(
    (data ?? []).map((row) => [
      String(row.id),
      {
        id: String(row.id),
        title: String(row.title),
      },
    ])
  );

  return {
    byTitle: remoteRecipeIdByTitle,
    byId: remoteRecipeById,
  };
}

export function clearRemoteRecipeIdMap() {
  remoteRecipeIdByTitle = null;
  remoteRecipeById = null;
}

export async function resolveRemoteRecipeId(recipeId: string) {
  if (isUuid(recipeId)) return recipeId;
  const title = legacyRecipeTitleById[recipeId];
  if (!title) return null;
  const remoteMaps = await getRemoteRecipeMaps();
  return remoteMaps.byTitle.get(title.toLowerCase()) ?? null;
}

export async function resolveRecipeIdentity(recipeId: string) {
  const remoteRecipeId = await resolveRemoteRecipeId(recipeId);
  if (!remoteRecipeId) return null;
  const remoteMaps = await getRemoteRecipeMaps();
  const recipe = remoteMaps.byId.get(remoteRecipeId);
  if (!recipe) return null;
  return {
    routeId: remoteRecipeId,
    remoteId: remoteRecipeId,
    title: recipe.title,
  };
}

