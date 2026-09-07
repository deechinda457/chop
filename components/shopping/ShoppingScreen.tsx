import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Check, FolderHeart, Plus, Share2, ShoppingCart, Trash2 } from 'lucide-react-native';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import type { ShoppingListItem } from '../../store/recipe-types';

const categoryDotColors: Record<string, string> = {
  Proteins: '#E8A020',
  Dairy: '#D8B26E',
  Vegetables: '#6FAF6A',
  Herbs: '#4F8C5B',
  'Pantry Staples': '#B88C57',
  Bakery: '#C97C4C',
  'Recipe Items': '#E8A020',
};

function SectionList({
  title,
  subtitle,
  items,
  onToggle,
  onDeleteItem,
  onDeleteSection,
}: {
  title: string;
  subtitle?: string;
  items: ShoppingListItem[];
  onToggle: (id: string) => void;
  onDeleteItem?: (item: ShoppingListItem) => void;
  onDeleteSection?: () => void;
}) {
  const theme = useThemeTokens();
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <View style={{ marginBottom: 24, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
      <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '600' }}>{title}</Text>
          {subtitle ? <Text style={{ marginTop: 2, color: theme.textMuted, fontSize: 12, flexShrink: 1 }}>{subtitle}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, maxWidth: '56%' }}>
          <View style={{ borderRadius: 999, backgroundColor: theme.cream, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{items.length} items</Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: checkedCount > 0 ? (theme.theme === 'dark' ? '#2A2520' : '#FFF8EC') : theme.cream, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: checkedCount > 0 ? theme.primary : theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{checkedCount} checked</Text>
          </View>
          {onDeleteSection ? (
            <Pressable onPress={onDeleteSection} style={{ height: 30, width: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.theme === 'dark' ? '#2A1818' : '#FFF4F4' }}>
              <Trash2 size={14} color="#E53E3E" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {items.length === 0 ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, paddingHorizontal: 16, paddingVertical: 24 }}>
          <Text style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>No items here yet.</Text>
        </View>
      ) : (
        categories.map((category) => (
          <View key={`${title}-${category}`} style={{ marginBottom: 16 }}>
            <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ height: 10, width: 10, borderRadius: 999, backgroundColor: categoryDotColors[category] || theme.primary }} />
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }}>{category}</Text>
            </View>
            <View style={{ overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
              {items
                .filter((item) => item.category === category)
                .map((item, index, list) => (
                  <Pressable
                    key={item.id}
                    onPress={() => onToggle(item.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: index < list.length - 1 ? 1 : 0, borderBottomColor: theme.border, opacity: item.checked ? 0.5 : 1 }}
                  >
                    <View style={{ height: 22, width: 22, borderRadius: 999, borderWidth: 2, borderColor: item.checked ? theme.primary : '#B8B1A7', backgroundColor: item.checked ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {item.checked ? <Check size={12} color="#FFFFFF" /> : null}
                    </View>
                    <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: '500', textDecorationLine: item.checked ? 'line-through' : 'none' }}>{item.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '500' }}>{item.quantity}</Text>
                    {onDeleteItem ? (
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          onDeleteItem(item);
                        }}
                        style={{ marginLeft: 6, height: 28, width: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.theme === 'dark' ? '#2A1818' : '#FFF4F4' }}
                      >
                        <Trash2 size={13} color="#E53E3E" />
                      </Pressable>
                    ) : null}
                  </Pressable>
                ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export function ShoppingScreen() {
  const theme = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 420;
  const generalShoppingItems = useAppStore((state) => state.generalShoppingItems);
  const recipeShoppingLists = useAppStore((state) => state.recipeShoppingLists);
  const toggleShoppingItem = useAppStore((state) => state.toggleShoppingItem);
  const addGeneralShoppingItems = useAppStore((state) => state.addGeneralShoppingItems);
  const removeGeneralShoppingItem = useAppStore((state) => state.removeGeneralShoppingItem);
  const removeRecipeShoppingList = useAppStore((state) => state.removeRecipeShoppingList);
  const clearGeneralShoppingItems = useAppStore((state) => state.clearGeneralShoppingItems);
  const clearShoppingLists = useAppStore((state) => state.clearShoppingLists);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', category: 'Vegetables' });
  const allItems = [...generalShoppingItems, ...recipeShoppingLists.flatMap((list) => list.items)];
  const checkedCount = allItems.filter((item) => item.checked).length;
  const progress = allItems.length ? (checkedCount / allItems.length) * 100 : 0;
  const recipeItemCount = recipeShoppingLists.reduce((count, list) => count + list.items.length, 0);
  const hasAnyItems = allItems.length > 0;

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 88 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: isCompact ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ marginBottom: 4, color: theme.textMuted, fontSize: 12, fontWeight: '500' }}>Organize what matters first</Text>
              <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '700' }}>Shopping List</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, width: isCompact ? '100%' : undefined }}>
              <Pressable style={{ height: 40, width: 40, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={16} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert('Clear shopping list?', 'This will remove all general and recipe-specific shopping items.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear list',
                      style: 'destructive',
                      onPress: () => clearShoppingLists(),
                    },
                  ])
                }
                disabled={!hasAnyItems}
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: hasAnyItems ? 'rgba(229, 62, 62, 0.18)' : theme.border,
                  backgroundColor: hasAnyItems ? (theme.theme === 'dark' ? '#2A1818' : '#FFF4F4') : theme.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: hasAnyItems ? 1 : 0.45,
                }}
                >
                <Trash2 size={16} color={hasAnyItems ? '#E53E3E' : theme.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => setShowAddForm((value) => !value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 12,
                  backgroundColor: theme.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  width: isCompact ? '100%' : undefined,
                  minWidth: isCompact ? undefined : 92,
                }}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Add</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginBottom: 16, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
            <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={16} color={theme.primary} />
                <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{checkedCount} of {allItems.length} items</Text>
              </View>
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>{Math.round(progress)}%</Text>
            </View>
            <View style={{ height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: theme.cream }}>
              <View style={{ height: '100%', width: `${progress}%`, borderRadius: 999, backgroundColor: theme.primary }} />
            </View>
            <Text style={{ marginTop: 10, color: theme.textMuted, fontSize: 12 }}>
              {allItems.length === 0 ? 'Nothing to clear yet.' : 'Tap any item to check it off, or clear everything when you are done.'}
            </Text>
          </View>

          <View style={{ marginBottom: 20, flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, borderRadius: 20, borderWidth: 1, borderColor: theme.theme === 'dark' ? '#3A342E' : 'rgba(232,160,32,0.18)', backgroundColor: theme.surface, padding: 16 }}>
              <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FolderHeart size={16} color={theme.primary} />
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>Recipe Lists</Text>
              </View>
              <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: '700' }}>{recipeShoppingLists.length}</Text>
              <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12 }}>{recipeItemCount} active ingredients</Text>
            </View>

            <View style={{ flex: 1, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
              <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={16} color={theme.primary} />
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>General List</Text>
              </View>
              <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: '700' }}>{generalShoppingItems.length}</Text>
              <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12 }}>Pantry and manual items</Text>
            </View>
          </View>

          {showAddForm ? (
            <View style={{ marginBottom: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 20 }}>
              <Text style={{ marginBottom: 16, color: theme.textPrimary, fontSize: 20, fontWeight: '700' }}>Add to General List</Text>
              <TextInput value={newItem.name} onChangeText={(value) => setNewItem((current) => ({ ...current, name: value }))} placeholder="e.g. Milk" placeholderTextColor={theme.textMuted} style={{ height: 54, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary, paddingHorizontal: 16, fontSize: 14, marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput value={newItem.quantity} onChangeText={(value) => setNewItem((current) => ({ ...current, quantity: value }))} placeholder="e.g. 1 liter" placeholderTextColor={theme.textMuted} style={{ flex: 1, height: 54, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary, paddingHorizontal: 16, fontSize: 14 }} />
                <TextInput value={newItem.category} onChangeText={(value) => setNewItem((current) => ({ ...current, category: value }))} placeholder="Category" placeholderTextColor={theme.textMuted} style={{ flex: 1, height: 54, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary, paddingHorizontal: 16, fontSize: 14 }} />
              </View>
              <Pressable onPress={() => { if (!newItem.name.trim()) return; addGeneralShoppingItems([{ id: Math.random().toString(36).slice(2, 10), name: newItem.name, quantity: newItem.quantity || '1 unit', category: newItem.category || 'Vegetables', checked: false }]); setNewItem({ name: '', quantity: '', category: 'Vegetables' }); setShowAddForm(false); }} style={{ marginTop: 16, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Add to List</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {!hasAnyItems ? (
            <View style={{ marginBottom: 24, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 24 }}>
              <View style={{ alignSelf: 'center', marginBottom: 12, height: 48, width: 48, borderRadius: 999, backgroundColor: theme.theme === 'dark' ? '#2A2520' : '#FFF8EC', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={20} color={theme.primary} />
              </View>
              <Text style={{ textAlign: 'center', color: theme.textPrimary, fontSize: 16, fontWeight: '600' }}>No items yet</Text>
              <Pressable onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16, alignSelf: 'center', borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Browse Recipes</Text>
              </Pressable>
            </View>
          ) : null}
          {recipeShoppingLists.length > 0 ? (
            <>
              <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FolderHeart size={16} color={theme.primary} />
                <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '600' }}>Priority Recipe Lists</Text>
              </View>
              <Text style={{ marginBottom: 16, color: theme.textMuted, fontSize: 13 }}>Recipe-specific ingredients stay grouped so urgent meal shopping does not get mixed into the general list.</Text>
              {recipeShoppingLists.map((list) => (
                <SectionList
                  key={list.id}
                  title={list.recipeTitle}
                  subtitle="Saved from recipe detail"
                  items={list.items}
                  onToggle={(id) => toggleShoppingItem(id, 'recipe', list.id)}
                  onDeleteSection={() =>
                    Alert.alert('Remove recipe list?', `This will remove the shopping list for ${list.recipeTitle}.`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => removeRecipeShoppingList(list.id),
                      },
                    ])
                  }
                />
              ))}
            </>
          ) : (
            <View style={{ marginBottom: 24, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 24 }}>
              <View style={{ alignSelf: 'center', marginBottom: 12, height: 48, width: 48, borderRadius: 999, backgroundColor: theme.theme === 'dark' ? '#2A2520' : '#FFF8EC', alignItems: 'center', justifyContent: 'center' }}>
                <FolderHeart size={20} color={theme.primary} />
              </View>
              <Text style={{ textAlign: 'center', color: theme.textPrimary, fontSize: 16, fontWeight: '600' }}>No recipe lists yet</Text>
              <Text style={{ marginTop: 4, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                Save a recipe list from recipe detail and it will appear here first.
              </Text>
            </View>
          )}

          <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={16} color={theme.primary} />
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '600' }}>General Shopping</Text>
          </View>
          <Text style={{ marginBottom: 16, color: theme.textMuted, fontSize: 13 }}>Pantry-related restocks and manual additions stay separate below.</Text>
          <SectionList
            title="General List"
            subtitle="Manual and pantry-related items"
            items={generalShoppingItems}
            onToggle={(id) => toggleShoppingItem(id, 'general')}
            onDeleteItem={(item) =>
              Alert.alert('Delete item?', `Remove ${item.name} from the general list?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => removeGeneralShoppingItem(item.id),
                },
              ])
            }
            onDeleteSection={() =>
              Alert.alert('Clear general list?', 'This will remove only the general shopping items.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => clearGeneralShoppingItems(),
                },
              ])
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
