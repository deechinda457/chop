import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { Barcode, Camera, Keyboard, Mic, Plus } from 'lucide-react-native';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/layout';
import { HaveView } from './HaveView';
import { NeedView } from './NeedView';

type KitchenView = 'have' | 'need';
type FabOption = 'camera' | 'barcode' | 'voice' | 'manual';

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

function getStatusFromDaysLeft(daysLeft: number): 'danger' | 'warning' | 'safe' {
  if (daysLeft <= 1) return 'danger';
  if (daysLeft <= 3) return 'warning';
  return 'safe';
}

const fabOptions: { id: FabOption; label: string; icon: typeof Camera }[] = [
  { id: 'manual', label: 'Type manually', icon: Keyboard },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'barcode', label: 'Barcode', icon: Barcode },
  { id: 'camera', label: 'Camera', icon: Camera },
];

const comingSoonCopy: Record<Exclude<FabOption, 'manual'>, string> = {
  camera: 'Point your camera at ingredients to add them automatically.',
  barcode: 'Scan a barcode to add packaged items instantly.',
  voice: 'Say what you bought and it gets added to Have.',
};

export function KitchenScreen() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { onScroll, onScrollEndDrag, onMomentumScrollEnd, onGroupLayout, onCollapsibleLayout, reserveHeight, headerStyle } = useCollapsibleHeader();
  const params = useLocalSearchParams<{ view?: string }>();
  const addPantryItem = useAppStore((state) => state.addPantryItem);
  const [activeView, setActiveView] = useState<KitchenView>('have');
  const [fabOpen, setFabOpen] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [comingSoon, setComingSoon] = useState<Exclude<FabOption, 'manual'> | null>(null);
  const [newItemDraft, setNewItemDraft] = useState({
    name: '',
    quantityValue: '1',
    unit: 'pcs',
    category: 'Vegetables',
    storageLocation: 'Pantry',
    daysLeft: '7',
  });

  useEffect(() => {
    if (params.view === 'need' || params.view === 'have') setActiveView(params.view);
  }, [params.view]);

  const handleFabOption = (option: FabOption) => {
    setFabOpen(false);
    if (option === 'manual') {
      setShowAddItemModal(true);
      return;
    }
    setComingSoon(option);
  };

  const saveNewItem = () => {
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
    setNewItemDraft({ name: '', quantityValue: '1', unit: 'pcs', category: 'Vegetables', storageLocation: 'Pantry', daysLeft: '7' });
    setShowAddItemModal(false);
    setActiveView('have');
  };

  return (
    <Screen edges={['left', 'right']}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {/* Group: heading (collapses) + toggle (stays visible, rises to the top
            edge as the heading slides away above it -- same Animated.View, only
            the heading's own measured height is used as the translate distance).
            The heading carries insets.top itself (Screen no longer reserves the
            top edge) so the whole safe-area allowance slides away with it too,
            instead of leaving a permanent strip behind once it hides. */}
        <Animated.View onLayout={onGroupLayout} style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, backgroundColor: theme.background }, headerStyle]}>
          <View onLayout={onCollapsibleLayout} style={{ paddingTop: insets.top, paddingBottom: 16 }}>
            <Text style={{ marginHorizontal: 16, color: theme.textPrimary, fontFamily: theme.fonts.headingBold, fontSize: 24 }}>Kitchen</Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 8,
              marginBottom: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 4,
            }}
          >
            {(['have', 'need'] as const).map((view) => {
              const active = activeView === view;
              return (
                <Pressable
                  key={view}
                  onPress={() => setActiveView(view)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingVertical: 10,
                    backgroundColor: active ? theme.primary : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 14, fontWeight: '700' }}>
                    {view === 'have' ? 'Have' : 'Need'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: reserveHeight, paddingBottom: 96 + TAB_BAR_CONTENT_HEIGHT + insets.bottom }}
        >
          {activeView === 'have' ? <HaveView /> : <NeedView />}
        </ScrollView>
      </View>

      {fabOpen ? <Pressable onPress={() => setFabOpen(false)} style={{ position: 'absolute', inset: 0 }} /> : null}

      {fabOpen ? (
        <View style={{ position: 'absolute', right: 8, bottom: 96, gap: 10, alignItems: 'flex-end' }}>
          {fabOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Pressable
                key={option.id}
                onPress={() => handleFabOption(option.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingLeft: 8,
                  paddingRight: 6,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{option.label}</Text>
                <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color="#FFFFFF" />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Pressable
        onPress={() => setFabOpen((value) => !value)}
        style={{
          position: 'absolute',
          right: 8,
          bottom: 24,
          height: 56,
          width: 56,
          borderRadius: 28,
          backgroundColor: theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
          transform: [{ rotate: fabOpen ? '45deg' : '0deg' }],
        }}
      >
        <Plus size={26} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showAddItemModal} transparent animationType="slide" onRequestClose={() => setShowAddItemModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowAddItemModal(false)} />
          <View style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: '#D1D5DB' }} />
            <Text style={{ marginBottom: 16, color: '#1A1814', fontSize: 18, fontWeight: '700' }}>Add Item</Text>
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
                onPress={saveNewItem}
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

      <Modal visible={comingSoon !== null} transparent animationType="fade" onRequestClose={() => setComingSoon(null)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 24 }}>
          <View style={{ width: '100%', borderRadius: 20, backgroundColor: '#FFFFFF', padding: 20 }}>
            <Text style={{ color: '#1A1814', fontSize: 18, fontWeight: '700' }}>
              {comingSoon ? comingSoon.charAt(0).toUpperCase() + comingSoon.slice(1) : ''} — coming soon
            </Text>
            <Text style={{ marginTop: 8, color: '#6B6B6B', fontSize: 13 }}>{comingSoon ? comingSoonCopy[comingSoon] : ''} For now, use Type manually.</Text>
            <Pressable onPress={() => setComingSoon(null)} style={{ marginTop: 18, height: 48, borderRadius: 24, backgroundColor: '#E8A020', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
