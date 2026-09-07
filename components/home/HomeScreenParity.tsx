import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CalendarDays,
  ChefHat,
  Crown,
  Heart,
  Mic,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import { useAuth } from '../../context/AuthContext';
import { userService, type UserStats } from '../../services/userService';

const quickActions = [
  { id: 'search', label: 'Search\nRecipes', icon: Search, color: '#E8772E', bg: '#FFF7ED' },
  { id: 'plan', label: 'Meal\nPlanner', icon: CalendarDays, color: '#FF5722', bg: '#FBE9E7' },
  { id: 'shop', label: 'Shopping\nList', icon: ShoppingCart, color: '#9C27B0', bg: '#F3E5F5' },
  { id: 'cook', label: 'What Can\nI Cook?', icon: Sparkles, color: '#4CAF50', bg: '#F1F8E9' },
  { id: 'add', label: 'Add\nIngredients', icon: Plus, color: '#2196F3', bg: '#E3F2FD' },
] as const;

type SuggestedRecipe = {
  id: string;
  title: string;
  shortDescription: string;
  image: string;
  badge: string;
  badgeColor: 'green' | 'amber';
};

export function HomeScreenParity() {
  const theme = useThemeTokens();
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const pantryItems = useAppStore((state) => state.pantryItems);
  const mealPlans = useAppStore((state) => state.mealPlans);
  const savedRecipeIds = useAppStore((state) => state.savedRecipeIds);
  const toggleSavedRecipe = useAppStore((state) => state.toggleSavedRecipe);
  const [showCookSheet, setShowCookSheet] = useState(false);
  const [recipeScrollProgress, setRecipeScrollProgress] = useState(0);
  const [stats, setStats] = useState<UserStats>({ recipesCooked: 0, savedRecipes: 0, streakDays: 0 });
  const [suggestions] = useState<SuggestedRecipe[]>([]);
  const [suggestionsLoading] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const setSearchDraft = useAppStore((state) => state.setSearchDraft);

  useEffect(() => {
    void userService.getStats().then(setStats).catch(() => undefined);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = typeof profile?.full_name === 'string' ? profile.full_name.split(' ')[0] : '';
  const displayGreeting = firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`;
  const userInitials = firstName ? firstName.slice(0, 2).toUpperCase() : 'RO';
  const tier = (profile?.tier as string | undefined) ?? 'free';
  const suggestionCardWidth = Math.min(280, Math.max(240, width - 72));

  const pantryCount = pantryItems.length;
  const expiringSoon = pantryItems.filter((item) => item.daysLeft <= 3).length;
  const expiringItems = pantryItems.filter((item) => item.daysLeft <= 7).slice(0, 3);
  const today = new Date();
  const weekday = today.getDay();
  const mondayIndex = weekday === 0 ? 6 : weekday - 1;
  const todayMeals = mealPlans.thisWeek?.[mondayIndex] ?? [];
  const suggestionLabel = profile?.diet_type || (Array.isArray(profile?.allergies) && profile.allergies.length > 0) ? 'AI Suggestions' : 'Popular Recipes';

  const statsCards = useMemo(
    () => [
      { label: 'Recipes\nCooked', value: String(stats.recipesCooked), icon: ChefHat, color: '#E8A020' },
      { label: 'Days\nStreak', value: String(stats.streakDays), icon: TrendingUp, color: '#6FAF6A' },
      { label: 'Favorites', value: String(stats.savedRecipes), icon: Heart, color: '#E91E63' },
    ],
    [stats]
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 88 }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 }}>
          <View style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: '#8A8A8A', fontSize: 12, fontWeight: '600' }}>{displayGreeting}</Text>
              <Text style={{ marginTop: 2, color: theme.textPrimary, fontSize: 26, fontWeight: '700' }}>What&apos;s cooking?</Text>
            </View>
            <Pressable onPress={() => router.push('/profile')} style={{ position: 'relative', height: 44, width: 44, borderRadius: 999, backgroundColor: '#8B5E3C', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{userInitials}</Text>
              {tier !== 'free' ? (
                <View style={{ position: 'absolute', right: -2, bottom: -2, height: 16, width: 16, borderRadius: 999, backgroundColor: '#E8A020', alignItems: 'center', justifyContent: 'center' }}>
                  <Crown size={8} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={{ height: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, backgroundColor: theme.theme === 'dark' ? '#1E1C16' : '#EFEFEA', paddingHorizontal: 16 }}>
            <Search size={19} color="#8A8A8A" />
            <TextInput
              value={homeSearchQuery}
              onChangeText={setHomeSearchQuery}
              onSubmitEditing={() => {
                const trimmed = homeSearchQuery.trim();
                if (!trimmed) {
                  router.replace('/(tabs)/search');
                  return;
                }
                setSearchDraft(trimmed);
                router.replace('/(tabs)/search');
              }}
              placeholder="Search recipes, ingredients..."
              placeholderTextColor="#8A8A8A"
              style={{ flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '500' }}
            />
            <View style={{ height: 40, width: 40, borderRadius: 16, backgroundColor: theme.theme === 'dark' ? '#2A2520' : '#F5F0E8', alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={17} color="#E8A020" />
            </View>
          </View>

          {pantryCount > 0 ? (
            <Pressable onPress={() => router.replace('/(tabs)/pantry')} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, backgroundColor: theme.theme === 'dark' ? '#1E1A10' : '#FFF8EC', borderLeftWidth: 3, borderLeftColor: '#E8A020', paddingHorizontal: 14, paddingVertical: 10 }}>
              <Package size={14} color="#E8A020" />
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '500' }}>
                <Text style={{ color: '#E8A020', fontWeight: '700' }}>{pantryCount}</Text> items in pantry
              </Text>
              {expiringSoon > 0 ? <Text style={{ color: '#E56A2E', fontSize: 12, fontWeight: '500' }}>{expiringSoon} expiring soon</Text> : null}
              <ArrowRight size={12} color="#8A8A8A" style={{ marginLeft: 'auto' as never }} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable
                key={action.id}
                onPress={() => {
                  if (action.id === 'search') router.replace('/(tabs)/search');
                  if (action.id === 'add') router.replace('/(tabs)/pantry');
                  if (action.id === 'shop') router.push('/(tabs)/pantry?view=need');
                  if (action.id === 'plan') router.push('/planner');
                  if (action.id === 'cook') setShowCookSheet(true);
                }}
                style={{
                  minHeight: 104,
                  minWidth: 84,
                  borderRadius: 22,
                  backgroundColor: theme.theme === 'dark' ? '#1E1C16' : action.bg,
                  borderWidth: 1,
                  borderColor: theme.theme === 'dark' ? theme.border : `${action.color}20`,
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <View style={{ height: 44, width: 44, borderRadius: 16, backgroundColor: theme.theme === 'dark' ? '#2A2520' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={action.color} />
                </View>
                <Text style={{ marginTop: 10, color: action.color, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{action.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
          <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#E8A020" />
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '700' }}>{suggestionLabel}</Text>
            </View>
            <Pressable onPress={() => router.replace('/(tabs)/search')}>
              <Text style={{ color: '#E8A020', fontSize: 13, fontWeight: '500' }}>See All</Text>
            </Pressable>
          </View>

          {suggestionsLoading ? (
            <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#E8A020" />
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14, paddingRight: 20 }}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  const maxScroll = Math.max(contentSize.width - layoutMeasurement.width, 1);
                  setRecipeScrollProgress(Math.min(Math.max(contentOffset.x / maxScroll, 0), 1));
                }}
              >
                {suggestions.map((recipe) => {
                  const isSaved = savedRecipeIds.has(recipe.id);
                  const badgeStyle =
                    recipe.badgeColor === 'green'
                      ? { backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ECC71' }
                      : { backgroundColor: 'rgba(232, 160, 32, 0.15)', color: '#E8A020' };

                  return (
                    <Pressable key={recipe.id} onPress={() => router.push(`/recipe/${recipe.id}`)} style={{ width: suggestionCardWidth, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
                      <View style={{ position: 'relative', height: 124 }}>
                        <Image source={recipe.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        <Pressable onPress={() => toggleSavedRecipe(recipe.id)} style={{ position: 'absolute', top: 12, right: 12, height: 32, width: 32, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' }}>
                          <Bookmark size={16} color={isSaved ? '#E8A020' : '#FFFFFF'} fill={isSaved ? '#E8A020' : 'none'} />
                        </Pressable>
                      </View>
                      <View style={{ minHeight: 118, padding: 16 }}>
                        <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: badgeStyle.backgroundColor }}>
                          <Text style={{ color: badgeStyle.color, fontSize: 10, fontWeight: '700' }}>{recipe.badge}</Text>
                        </View>
                        <Text numberOfLines={1} style={{ marginTop: 8, color: theme.textPrimary, fontSize: 15, fontWeight: '700' }}>
                          {recipe.title}
                        </Text>
                        <Text numberOfLines={2} style={{ marginTop: 4, color: '#8A8A8A', fontSize: 12, lineHeight: 18 }}>
                          {recipe.shortDescription}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={{ marginTop: 8, height: 4, overflow: 'hidden', borderRadius: 999, backgroundColor: theme.theme === 'dark' ? '#2A2520' : '#F5F0E8' }}>
                <View style={{ height: '100%', width: `${26 + recipeScrollProgress * 48}%`, borderRadius: 999, backgroundColor: '#EF9F27' }} />
              </View>
            </>
          )}
        </View>

        {expiringItems.length > 0 ? (
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="#E8A020" />
                <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '700' }}>Expiring Soon</Text>
              </View>
              <Pressable onPress={() => router.replace('/(tabs)/pantry')}>
                <Text style={{ color: '#E8A020', fontSize: 13, fontWeight: '500' }}>View Pantry</Text>
              </Pressable>
            </View>
            <View style={{ overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
              {expiringItems.map((item, index) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: index < expiringItems.length - 1 ? 1 : 0, borderBottomColor: theme.border }}>
                    <Text style={{ fontSize: 24 }}>{item.emoji || '🥬'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: item.daysLeft <= 1 ? '#E56A2E' : '#8A8A8A', fontSize: 12 }}>{item.daysLeft <= 1 ? 'Expires tomorrow' : `Expires in ${item.daysLeft} days`}</Text>
                  </View>
                  <View style={{ height: 8, width: 8, borderRadius: 999, backgroundColor: item.daysLeft <= 1 ? '#E56A2E' : '#E8A020' }} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
          <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={16} color="#6FAF6A" />
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '700' }}>Today&apos;s Meals</Text>
            </View>
            <Pressable onPress={() => router.push('/planner')}>
              <Text style={{ color: '#E8A020', fontSize: 13, fontWeight: '500' }}>Edit Plan</Text>
            </Pressable>
          </View>
          {todayMeals.length === 0 ? (
            <View style={{ borderRadius: 22, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 20 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '600' }}>No meals planned</Text>
              <Text style={{ marginTop: 4, color: theme.textMuted, fontSize: 12 }}>Generate your week or add meals manually.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {todayMeals.map((meal) => (
                <View key={meal.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 14 }}>
                    <Text style={{ fontSize: 24 }}>{meal.emoji || '🍽️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#8A8A8A', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{meal.type}</Text>
                    <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>{meal.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#8A8A8A', fontSize: 11, fontWeight: '500' }}>{meal.time}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '500' }}>{meal.cal}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ marginTop: 28, marginBottom: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {statsCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <View key={stat.label} style={{ flex: 1, alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
                  <Icon size={18} color={stat.color} />
                  <Text style={{ marginTop: 6, color: theme.textPrimary, fontSize: 20, fontWeight: '700' }}>{stat.value}</Text>
                  <Text style={{ color: '#8A8A8A', fontSize: 10, fontWeight: '500', textAlign: 'center' }}>{stat.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {showCookSheet ? (
        <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowCookSheet(false)} />
          <View style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: '#D1D5DB' }} />
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#1A1814', fontSize: 18, fontWeight: '700' }}>What Can I Cook?</Text>
              <Pressable onPress={() => setShowCookSheet(false)} style={{ height: 36, width: 36, borderRadius: 999, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#1A1814" />
              </Pressable>
            </View>
            <View style={{ gap: 12 }}>
              {suggestions.slice(0, 3).map((recipe) => (
                <Pressable key={recipe.id} onPress={() => { setShowCookSheet(false); router.push(`/recipe/${recipe.id}`); }} style={{ flexDirection: 'row', gap: 12, borderRadius: 20, borderWidth: 1, borderColor: '#ECE7DE', backgroundColor: '#FFFFFF', padding: 12 }}>
                  <View style={{ height: 70, width: 70, overflow: 'hidden', borderRadius: 16 }}>
                    <Image source={recipe.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: '#1A1814', fontSize: 15, fontWeight: '600' }}>
                      {recipe.title}
                    </Text>
                    <Text numberOfLines={2} style={{ marginTop: 4, color: '#6B6B6B', fontSize: 12, flexShrink: 1 }}>
                      {recipe.shortDescription}
                    </Text>
                    <Text style={{ marginTop: 8, color: '#E8A020', fontSize: 11, fontWeight: '500' }}>Filtered to your preferences</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
