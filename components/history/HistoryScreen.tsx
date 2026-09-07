import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Clock3, Heart, Star } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import { getRecipePrimaryImage } from '../../services/recipeImages';
import { recipeService } from '../../services/recipeService';
import { useCollapsibleHeader } from '../../hooks/useCollapsibleHeader';
import { TAB_BAR_CONTENT_HEIGHT } from '../../lib/layout';

type HistoryPreviewMap = Awaited<ReturnType<typeof recipeService.getHistoryRecipePreviews>>;

export function HistoryScreen() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { onScroll, onScrollEndDrag, onMomentumScrollEnd, onGroupLayout, onCollapsibleLayout, reserveHeight, headerStyle } = useCollapsibleHeader();
  const history = useAppStore((state) => state.cookingHistoryEntries);
  const openCookMode = useAppStore((state) => state.openCookMode);
  const toggleHistoryFavorite = useAppStore((state) => state.toggleHistoryFavorite);
  const [filter, setFilter] = useState<'all' | 'favourites'>('all');
  const [loading, setLoading] = useState(true);
  const [previewMap, setPreviewMap] = useState<HistoryPreviewMap>({});

  useEffect(() => {
    let active = true;
    if (history.length === 0) {
      setPreviewMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    void recipeService
      .getHistoryRecipePreviews(history.map((entry) => entry.recipeId))
      .then((data) => {
        if (!active) return;
        setPreviewMap(data);
      })
      .catch(() => {
        if (!active) return;
        setPreviewMap({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [history]);

  const visibleHistory = useMemo(
    () => (filter === 'favourites' ? history.filter((entry) => entry.favorite) : history),
    [filter, history]
  );

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      {/* Collapsible: heading + Total sessions card + All/Favourites chips, all
          together -- nothing of History's own header persists when it hides. */}
      <Animated.View
        onLayout={(event) => {
          onGroupLayout(event);
          onCollapsibleLayout(event);
        }}
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, backgroundColor: theme.background }, headerStyle]}
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 }}>
          <Text style={{ marginBottom: 4, color: '#8A8A8A', fontSize: 12, fontWeight: '500' }}>Your recent cooking activity</Text>
          <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '700' }}>Cooking History</Text>
        </View>
        <View style={{ paddingHorizontal: 8 }}>
          <View style={{ marginBottom: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
            <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock3 size={16} color="#E8A020" />
              <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>Total sessions</Text>
            </View>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '700' }}>{history.length}</Text>
          </View>
          <View style={{ marginBottom: 16, flexDirection: 'row', gap: 8 }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'favourites', label: 'Favourites' },
            ].map((chip) => {
              const active = filter === chip.id;
              return (
                <Pressable key={chip.id} onPress={() => setFilter(chip.id as 'all' | 'favourites')} style={{ borderRadius: 999, borderWidth: 1.5, borderColor: active ? '#E8A020' : theme.border, backgroundColor: active ? '#E8A020' : theme.surface, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 13, fontWeight: '500' }}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: reserveHeight, paddingBottom: 88 + TAB_BAR_CONTENT_HEIGHT + insets.bottom }}
      >
      <View style={{ paddingHorizontal: 8 }}>
        {loading ? (
          <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#E8A020" />
          </View>
        ) : visibleHistory.length === 0 ? (
          <View style={{ borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 8, paddingVertical: 28 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Nothing cooked yet</Text>
            <Pressable onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16, alignSelf: 'center', borderRadius: 999, backgroundColor: '#E8A020', paddingHorizontal: 18, paddingVertical: 11 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Go Home</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {visibleHistory.map((entry) => {
              const recipe = previewMap[entry.recipeId];
              const rating = entry.rating ?? 0;
              return (
                <Pressable key={entry.id} onPress={() => router.push(`/recipe/${entry.recipeId}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: pressed ? (theme.theme === 'dark' ? '#1E1C16' : '#FBF7F0') : theme.surface, padding: 12 })}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ height: 60, width: 60, overflow: 'hidden', borderRadius: 12 }}>
                      <Image source={recipe?.image ?? getRecipePrimaryImage(null, entry.recipeId)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                      {entry.cookedCount && entry.cookedCount > 1 ? (
                        <View style={{ alignSelf: 'flex-start', marginBottom: 4, borderRadius: 999, backgroundColor: '#FFF0D8', paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: '#E8A020', fontSize: 10, fontWeight: '600' }}>Cooked {entry.cookedCount}x</Text>
                        </View>
                      ) : null}
                      <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '600' }}>{recipe?.title ?? entry.title}</Text>
                      <Text style={{ marginTop: 4, color: '#8A8A8A', fontSize: 12 }}>{entry.cookedOn}</Text>
                      {entry.rating !== undefined ? (
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={`${entry.id}-${index}`} size={12} color={index < rating ? '#E8A020' : '#C7C7C7'} fill={index < rating ? '#E8A020' : 'none'} />
                          ))}
                        </View>
                      ) : (
                        <Text style={{ marginTop: 8, color: '#8A8A8A', fontSize: 12 }}>Not rated</Text>
                      )}
                    </View>
                  </View>
                  <Pressable onPress={(event) => { event.stopPropagation(); toggleHistoryFavorite(entry.recipeId); }} style={{ marginLeft: 8 }}>
                    <Heart size={18} color={entry.favorite ? '#E11D48' : '#8A8A8A'} fill={entry.favorite ? '#E11D48' : 'none'} />
                  </Pressable>
                  <Pressable onPress={(event) => { event.stopPropagation(); openCookMode(entry.recipeId); router.push(`/cook/${entry.recipeId}`); }} style={{ marginLeft: 12, alignSelf: 'center' }}>
                    <Text style={{ color: '#E8A020', fontSize: 13, fontWeight: '600' }}>Cook Again</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}
