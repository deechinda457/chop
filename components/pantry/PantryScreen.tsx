import { useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { CalendarDays, ChevronDown, Filter, Plus, Search } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore, type PantryItemRecord } from '../../store/app-store';

const categories = ['All', 'Proteins', 'Dairy', 'Vegetables', 'Fruits', 'Grains', 'Spices', 'Other'] as const;
const units = ['g', 'kg', 'ml', 'l', 'pcs', 'bunch', 'loaf', 'cup', 'tbsp', 'tsp'];
const editCategories = ['Proteins', 'Dairy', 'Vegetables', 'Fruits', 'Grains', 'Herbs', 'Pantry Staples', 'Bakery', 'Beverages', 'Other'];
const storageLocations = ['Fridge', 'Freezer', 'Pantry', 'Counter'];

type EditableField = 'unit' | 'category' | 'storageLocation' | null;
const SwipeableAny = Swipeable as any;

function quantityLabel(item: PantryItemRecord) {
  return `${item.quantityValue}${item.unit === 'pcs' ? ' pcs' : item.unit}`;
}

function statusColor(status: PantryItemRecord['status']) {
  if (status === 'danger') return '#E56A2E';
  if (status === 'warning') return '#E8A020';
  return '#2ECC71';
}

function getEmojiForCategory(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('protein')) return '🥩';
  if (normalized.includes('dairy')) return '🥛';
  if (normalized.includes('vegetable') || normalized.includes('herb')) return '🥦';
  if (normalized.includes('fruit')) return '🍎';
  if (normalized.includes('grain') || normalized.includes('bread') || normalized.includes('bakery')) return '🌾';
  if (normalized.includes('spice')) return '🧂';
  return '📦';
}

function getStatusFromDaysLeft(daysLeft: number): PantryItemRecord['status'] {
  if (daysLeft <= 1) return 'danger';
  if (daysLeft <= 3) return 'warning';
  return 'safe';
}

export function PantryScreen() {
  const theme = useThemeTokens();
  const pantryItems = useAppStore((state) => state.pantryItems);
  const addPantryItem = useAppStore((state) => state.addPantryItem);
  const updatePantryItem = useAppStore((state) => state.updatePantryItem);
  const removePantryItem = useAppStore((state) => state.removePantryItem);
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PantryItemRecord | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<PantryItemRecord | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemDraft, setNewItemDraft] = useState({
    name: '',
    quantityValue: '1',
    unit: 'pcs',
    category: 'Vegetables',
    storageLocation: 'Pantry',
    daysLeft: '7',
  });
  const [pickerField, setPickerField] = useState<EditableField>(null);
  const openRowRef = useRef<any>(null);
  const rowRefs = useRef<Record<string, any>>({});

  const filtered = useMemo(
    () =>
      pantryItems.filter((item) => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [activeCategory, pantryItems, searchQuery]
  );

  const expiring = filtered.filter((item) => item.status !== 'safe');
  const safe = filtered.filter((item) => item.status === 'safe');

  const renderRow = (item: PantryItemRecord, highlighted: boolean) => (
    <SwipeableAny
      ref={(ref: any) => {
        rowRefs.current[item.id] = ref;
      }}
      overshootRight={false}
      renderRightActions={() => (
        <View style={{ flexDirection: 'row', marginBottom: 8, overflow: 'hidden', borderRadius: 14 }}>
          <Pressable onPress={() => { rowRefs.current[item.id]?.close(); setEditingItem(item); }} style={{ width: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8A020' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => { rowRefs.current[item.id]?.close(); setConfirmDeleteItem(item); }} style={{ width: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Delete</Text>
          </Pressable>
        </View>
      )}
      onSwipeableWillOpen={() => {
        if (openRowRef.current && openRowRef.current !== rowRefs.current[item.id]) openRowRef.current.close();
        openRowRef.current = rowRefs.current[item.id];
      }}
      onSwipeableClose={() => {
        if (openRowRef.current === rowRefs.current[item.id]) openRowRef.current = null;
      }}
    >
      <Pressable
        onLongPress={() => setEditingItem(item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderLeftWidth: highlighted ? 3 : 1,
          borderColor: theme.border,
          borderLeftColor: highlighted ? statusColor(item.status) : theme.border,
          backgroundColor:
            highlighted
              ? theme.theme === 'dark'
                ? item.status === 'danger'
                  ? '#2A1613'
                  : '#1E1A10'
                : item.status === 'danger'
                  ? '#FFF1ED'
                  : '#FFF8EC'
              : theme.surface,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>{item.name}</Text>
          <Text style={{ color: highlighted ? statusColor(item.status) : theme.textMuted, fontSize: 12 }}>{item.expiry}</Text>
        </View>
        <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{quantityLabel(item)}</Text>
        {!highlighted ? <View style={{ height: 8, width: 8, borderRadius: 999, backgroundColor: '#2ECC71' }} /> : null}
      </Pressable>
    </SwipeableAny>
  );

  const pickerOptions = pickerField === 'unit' ? units : pickerField === 'category' ? editCategories : pickerField === 'storageLocation' ? storageLocations : [];

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 88 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '700' }}>My Pantry</Text>
            <Pressable onPress={() => setShowAddItemModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Add Item</Text>
            </Pressable>
          </View>
          <View style={{ marginBottom: 16, flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Total Items', value: String(pantryItems.length), color: theme.primary },
              { label: 'Expiring', value: String(pantryItems.filter((item) => item.status !== 'safe').length), color: '#E56A2E' },
              { label: 'Categories', value: String(new Set(pantryItems.map((item) => item.category)).size), color: '#6FAF6A' },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingVertical: 12 }}>
                <Text style={{ color: stat.color, fontSize: 18, fontWeight: '700' }}>{stat.value}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '500' }}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16 }}>
            <Search size={16} color={theme.textMuted} />
            <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search pantry..." placeholderTextColor={theme.textMuted} style={{ flex: 1, color: theme.textPrimary, fontSize: 14 }} />
            <View style={{ height: 28, width: 28, borderRadius: 10, backgroundColor: theme.cream, alignItems: 'center', justifyContent: 'center' }}>
              <Filter size={14} color={theme.textSecondary} />
            </View>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
          {categories.map((category) => {
            const active = activeCategory === category;
            return (
              <Pressable key={category} onPress={() => setActiveCategory(category)} style={{ borderRadius: 999, borderWidth: 1.5, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.surface, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 12, fontWeight: '500' }}>{category}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {filtered.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '600' }}>Your pantry is empty</Text>
            <Text style={{ marginTop: 8, color: theme.textMuted, fontSize: 13 }}>Add ingredients to start getting smarter recipe suggestions.</Text>
            <Pressable onPress={() => setShowAddItemModal(true)} style={{ marginTop: 14 }}>
              <Text style={{ color: '#E8A020', fontSize: 13, fontWeight: '600' }}>Add your first item</Text>
            </Pressable>
          </View>
        ) : null}
        {expiring.length > 0 ? (
          <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
            <Text style={{ marginBottom: 8, color: '#E56A2E', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Needs attention ({expiring.length})</Text>
            {expiring.map((item) => (
              <View key={item.id}>{renderRow(item, true)}</View>
            ))}
          </View>
        ) : null}
        {safe.length > 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ marginBottom: 8, color: theme.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>In stock ({safe.length})</Text>
            {safe.map((item) => (
              <View key={item.id}>{renderRow(item, false)}</View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <Modal visible={showAddItemModal} transparent animationType="slide" onRequestClose={() => setShowAddItemModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowAddItemModal(false)} />
          <View style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: '#D1D5DB' }} />
            <Text style={{ marginBottom: 16, color: '#1A1814', fontSize: 18, fontWeight: '700' }}>Add Pantry Item</Text>
            <View style={{ gap: 12 }}>
              <TextInput
                value={newItemDraft.name}
                onChangeText={(value) => setNewItemDraft((current) => ({ ...current, name: value }))}
                placeholder="Item name"
                placeholderTextColor="#8A8A8A"
                style={{ height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  value={newItemDraft.quantityValue}
                  onChangeText={(value) => setNewItemDraft((current) => ({ ...current, quantityValue: value }))}
                  keyboardType="numeric"
                  placeholder="Qty"
                  placeholderTextColor="#8A8A8A"
                  style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }}
                />
                <TextInput
                  value={newItemDraft.unit}
                  onChangeText={(value) => setNewItemDraft((current) => ({ ...current, unit: value }))}
                  placeholder="Unit"
                  placeholderTextColor="#8A8A8A"
                  style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  value={newItemDraft.daysLeft}
                  onChangeText={(value) => setNewItemDraft((current) => ({ ...current, daysLeft: value }))}
                  keyboardType="numeric"
                  placeholder="Days left"
                  placeholderTextColor="#8A8A8A"
                  style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }}
                />
                <TextInput
                  value={newItemDraft.storageLocation}
                  onChangeText={(value) => setNewItemDraft((current) => ({ ...current, storageLocation: value }))}
                  placeholder="Storage"
                  placeholderTextColor="#8A8A8A"
                  style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }}
                />
              </View>
              <TextInput
                value={newItemDraft.category}
                onChangeText={(value) => setNewItemDraft((current) => ({ ...current, category: value }))}
                placeholder="Category"
                placeholderTextColor="#8A8A8A"
                style={{ height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }}
              />
              <Pressable
                onPress={() => {
                  const name = newItemDraft.name.trim();
                  if (!name) return;
                  const quantityValue = Number.parseFloat(newItemDraft.quantityValue);
                  const daysLeft = Number.parseInt(newItemDraft.daysLeft, 10);
                  const normalizedDaysLeft = Number.isNaN(daysLeft) ? 7 : Math.max(0, daysLeft);
                  const category = newItemDraft.category.trim() || 'Other';
                  const unit = newItemDraft.unit.trim() || 'pcs';
                  addPantryItem({
                    id: Crypto.randomUUID(),
                    name,
                    emoji: getEmojiForCategory(category),
                    quantityValue: Number.isNaN(quantityValue) || quantityValue <= 0 ? 1 : quantityValue,
                    unit,
                    expiry: normalizedDaysLeft <= 0 ? 'Today' : normalizedDaysLeft === 1 ? 'Tomorrow' : `In ${normalizedDaysLeft} days`,
                    daysLeft: normalizedDaysLeft,
                    status: getStatusFromDaysLeft(normalizedDaysLeft),
                    category,
                    storageLocation: newItemDraft.storageLocation.trim() || 'Pantry',
                    confidence: 'full',
                  });
                  setNewItemDraft({
                    name: '',
                    quantityValue: '1',
                    unit: 'pcs',
                    category: 'Vegetables',
                    storageLocation: 'Pantry',
                    daysLeft: '7',
                  });
                  setShowAddItemModal(false);
                }}
                style={{ marginTop: 8, height: 52, borderRadius: 26, backgroundColor: '#E8A020', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Save Item</Text>
              </Pressable>
              <Pressable onPress={() => setShowAddItemModal(false)} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#6B6B6B', fontSize: 13, fontWeight: '500' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={!!editingItem} transparent animationType="slide" onRequestClose={() => setEditingItem(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setEditingItem(null)} />
          <View style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: '#D1D5DB' }} />
            <Text style={{ marginBottom: 16, color: '#1A1814', fontSize: 18, fontWeight: '700' }}>Edit Item</Text>
            {editingItem ? (
              <View style={{ gap: 12 }}>
                <TextInput value={editingItem.name} onChangeText={(value) => setEditingItem({ ...editingItem, name: value })} style={{ height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }} />
                <TextInput value={String(editingItem.quantityValue)} onChangeText={(value) => setEditingItem({ ...editingItem, quantityValue: Number(value) || 0 })} keyboardType="numeric" style={{ height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14, color: '#1A1814' }} />
                {[
                  { key: 'unit' as const, value: editingItem.unit },
                  { key: 'category' as const, value: editingItem.category },
                  { key: 'storageLocation' as const, value: editingItem.storageLocation },
                ].map((field) => (
                  <Pressable key={field.key} onPress={() => setPickerField(field.key)} style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14 }}>
                    <Text style={{ color: '#1A1814', fontSize: 14 }}>{field.value}</Text>
                    <ChevronDown size={16} color="#6B6B6B" />
                  </Pressable>
                ))}
                <Pressable style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, borderColor: '#E8E2D8', paddingHorizontal: 14 }}>
                  <Text style={{ color: '#1A1814', fontSize: 14 }}>{editingItem.expiry}</Text>
                  <CalendarDays size={16} color="#6B6B6B" />
                </Pressable>
                <Pressable onPress={() => { updatePantryItem(editingItem.id, editingItem); setEditingItem(null); }} style={{ marginTop: 8, height: 52, borderRadius: 26, backgroundColor: '#E8A020', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Save Changes</Text>
                </Pressable>
                <Pressable onPress={() => setEditingItem(null)}><Text style={{ textAlign: 'center', color: '#6B6B6B', fontSize: 13 }}>Cancel</Text></Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal visible={pickerField !== null} transparent animationType="fade" onRequestClose={() => setPickerField(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setPickerField(null)} />
          <View style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#FFFFFF', padding: 20 }}>
            {pickerOptions.map((option) => (
              <Pressable key={option} onPress={() => { if (!editingItem || !pickerField) return; setEditingItem({ ...editingItem, [pickerField]: option }); setPickerField(null); }} style={{ borderBottomWidth: 1, borderBottomColor: '#F0EBE3', paddingVertical: 14 }}>
                <Text style={{ color: '#1A1814', fontSize: 14 }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
      <Modal visible={!!confirmDeleteItem} transparent animationType="fade" onRequestClose={() => setConfirmDeleteItem(null)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 24 }}>
          <View style={{ width: '100%', borderRadius: 20, backgroundColor: '#FFFFFF', padding: 20 }}>
            <Text style={{ color: '#1A1814', fontSize: 18, fontWeight: '700' }}>Remove {confirmDeleteItem?.name}?</Text>
            <Text style={{ marginTop: 8, color: '#6B6B6B', fontSize: 13 }}>This item will be removed from your pantry</Text>
            <Pressable onPress={() => { if (confirmDeleteItem) removePantryItem(confirmDeleteItem.id); setConfirmDeleteItem(null); }} style={{ marginTop: 18, height: 48, borderRadius: 24, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Remove</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmDeleteItem(null)} style={{ marginTop: 10, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#E8E2D8', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#1A1814', fontSize: 15, fontWeight: '500' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
