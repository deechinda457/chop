import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Filter, Search } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore, type PantryItemRecord } from '../../store/app-store';

const categories = ['All', 'Proteins', 'Dairy', 'Vegetables', 'Fruits', 'Grains', 'Spices', 'Other'] as const;
const units = ['g', 'kg', 'ml', 'l', 'pcs', 'bunch', 'loaf', 'cup', 'tbsp', 'tsp'];
const editCategories = ['Proteins', 'Dairy', 'Vegetables', 'Fruits', 'Grains', 'Herbs', 'Pantry Staples', 'Bakery', 'Beverages', 'Other'];
const storageLocations = ['Fridge', 'Freezer', 'Pantry', 'Counter'];

type EditableField = 'unit' | 'category' | 'storageLocation' | null;
const SwipeableAny = Swipeable as any;

function quantityLabel(item: PantryItemRecord) {
  return `${item.quantityValue} ${item.unit}`;
}

function statusColor(status: PantryItemRecord['status']) {
  if (status === 'danger') return '#E56A2E';
  if (status === 'warning') return '#E8A020';
  return '#2ECC71';
}

const confidenceFillSize: Record<PantryItemRecord['confidence'], number> = { full: 14, half: 9, low: 5 };

function nextConfidence(confidence: PantryItemRecord['confidence']): PantryItemRecord['confidence'] {
  if (confidence === 'full') return 'half';
  if (confidence === 'half') return 'low';
  return 'full';
}

export function HaveView() {
  const theme = useThemeTokens();
  const pantryItems = useAppStore((state) => state.pantryItems);
  const updatePantryItem = useAppStore((state) => state.updatePantryItem);
  const removePantryItem = useAppStore((state) => state.removePantryItem);
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PantryItemRecord | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<PantryItemRecord | null>(null);
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
        <Pressable
          onPress={() => updatePantryItem(item.id, { confidence: nextConfidence(item.confidence) })}
          hitSlop={8}
          accessibilityLabel={`Confidence: ${item.confidence}. Tap to change.`}
          style={{ height: 18, width: 18, borderRadius: 9, borderWidth: 1.5, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ height: confidenceFillSize[item.confidence], width: confidenceFillSize[item.confidence], borderRadius: 999, backgroundColor: theme.primary }} />
        </Pressable>
      </Pressable>
    </SwipeableAny>
  );

  const pickerOptions = pickerField === 'unit' ? units : pickerField === 'category' ? editCategories : pickerField === 'storageLocation' ? storageLocations : [];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 }}>
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
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 8 }}>
          <Search size={16} color={theme.textMuted} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search pantry..." placeholderTextColor={theme.textMuted} style={{ flex: 1, color: theme.textPrimary, fontSize: 14 }} />
          <View style={{ height: 28, width: 28, borderRadius: 10, backgroundColor: theme.cream, alignItems: 'center', justifyContent: 'center' }}>
            <Filter size={14} color={theme.textSecondary} />
          </View>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 12, gap: 8 }}>
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
        <View style={{ paddingHorizontal: 8, paddingTop: 40, alignItems: 'center' }}>
          <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '600' }}>Nothing here yet</Text>
          <Text style={{ marginTop: 8, color: theme.textMuted, fontSize: 13, textAlign: 'center' }}>Use the + button to add ingredients and start getting smarter recipe suggestions.</Text>
        </View>
      ) : null}
      {expiring.length > 0 ? (
        <View style={{ marginBottom: 16, paddingHorizontal: 8 }}>
          <Text style={{ marginBottom: 8, color: '#E56A2E', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Needs attention ({expiring.length})</Text>
          {expiring.map((item) => (
            <View key={item.id}>{renderRow(item, true)}</View>
          ))}
        </View>
      ) : null}
      {safe.length > 0 ? (
        <View style={{ paddingHorizontal: 8 }}>
          <Text style={{ marginBottom: 8, color: theme.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>In stock ({safe.length})</Text>
          {safe.map((item) => (
            <View key={item.id}>{renderRow(item, false)}</View>
          ))}
        </View>
      ) : null}
      <Modal visible={!!editingItem} transparent animationType="slide" onRequestClose={() => setEditingItem(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setEditingItem(null)} />
          <View style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 24 }}>
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
    </View>
  );
}
