import type { RecipeShoppingList, ShoppingListItem } from '../store/recipe-types';
import { supabase } from '../lib/supabase';
import { requireCurrentUser, resolveRemoteRecipeId } from './serviceUtils';

type ShoppingPayload = {
  generalItems: ShoppingListItem[];
  recipeLists: RecipeShoppingList[];
};

export const shoppingService = {
  async getAll(): Promise<ShoppingPayload> {
    const user = await requireCurrentUser();
    const { data: lists, error: listError } = await supabase.from('shopping_lists').select('*').eq('user_id', user.id);
    if (listError) throw listError;
    const listIds = (lists ?? []).map((list) => list.id);
    if (listIds.length === 0) return { generalItems: [], recipeLists: [] };
    const { data: items, error: itemError } = await supabase
      .from('shopping_list_items')
      .select('*, recipes(title)')
      .in('shopping_list_id', listIds)
      .order('sort_order');
    if (itemError) throw itemError;

    const generalList = lists?.[0];
    const generalItems = (items ?? [])
      .filter((item) => item.shopping_list_id === generalList?.id && !item.recipe_id)
      .map(
        (item) =>
          ({
            id: item.id,
            name: item.name,
            quantity: item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '',
            category: item.category,
            checked: item.is_checked,
          }) satisfies ShoppingListItem
      );

    const recipeGroups = new Map<string, RecipeShoppingList>();
    for (const item of items ?? []) {
      if (!item.recipe_id) continue;
      const recipeId = String(item.recipe_id);
      const existing = recipeGroups.get(recipeId);
      const mappedItem = {
        id: item.id,
        name: item.name,
        quantity: item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '',
        category: item.category,
        checked: item.is_checked,
      } satisfies ShoppingListItem;
      if (existing) {
        existing.items.push(mappedItem);
        continue;
      }
      recipeGroups.set(recipeId, {
        id: recipeId,
        recipeId,
        recipeTitle: item.recipes?.title ?? 'Recipe List',
        createdAt: new Date(item.created_at).getTime(),
        items: [mappedItem],
      });
    }

    return { generalItems, recipeLists: Array.from(recipeGroups.values()) };
  },

  async saveAll(payload: ShoppingPayload) {
    const user = await requireCurrentUser();
    const { data: existingLists, error: existingListError } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);
    if (existingListError) throw existingListError;

    let shoppingListId = existingLists?.[0]?.id as string | undefined;
    if (!shoppingListId) {
      const { data: createdList, error: createListError } = await supabase
        .from('shopping_lists')
        .insert({ user_id: user.id, name: 'My Shopping List' })
        .select('id')
        .single();
      if (createListError) throw createListError;
      shoppingListId = createdList.id;
    }

    const { error: deleteError } = await supabase.from('shopping_list_items').delete().eq('shopping_list_id', shoppingListId);
    if (deleteError) throw deleteError;

    const items: Record<string, unknown>[] = payload.generalItems.map((item, index) => ({
      shopping_list_id: shoppingListId,
      recipe_id: null,
      name: item.name,
      quantity: Number.parseFloat(item.quantity) || null,
      unit: item.quantity.replace(/^[\d.\s]+/, '').trim() || null,
      category: item.category,
      is_checked: item.checked,
      source: 'manual',
      sort_order: index,
    }));

    for (const list of payload.recipeLists) {
      const remoteRecipeId = await resolveRemoteRecipeId(list.recipeId);
      for (const [index, item] of list.items.entries()) {
        items.push({
          shopping_list_id: shoppingListId,
          recipe_id: remoteRecipeId,
          name: item.name,
          quantity: Number.parseFloat(item.quantity) || null,
          unit: item.quantity.replace(/^[\d.\s]+/, '').trim() || null,
          category: item.category,
          is_checked: item.checked,
          source: 'recipe',
          sort_order: index,
        });
      }
    }

    if (items.length === 0) return;
    const { error: listError } = await supabase.from('shopping_list_items').insert(items);
    if (listError) throw listError;
  },
};
