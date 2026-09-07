import { router, useLocalSearchParams } from 'expo-router';
import { Heart, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { BowlCheckmarkMark } from '../../components/cook/BowlCheckmarkMark';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import type { RecipeDetailRecord } from '../../store/recipe-types';
import { recipeService } from '../../services/recipeService';

export default function CompletionRoute() {
  const theme = useThemeTokens();
  const params = useLocalSearchParams<{ id: string }>();
  const pantryItems = useAppStore((state) => state.pantryItems);
  const completeCookSession = useAppStore((state) => state.completeCookSession);
  const toggleSavedRecipe = useAppStore((state) => state.toggleSavedRecipe);
  const savedRecipeIds = useAppStore((state) => state.savedRecipeIds);

  const [recipe, setRecipe] = useState<RecipeDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [favorite, setFavorite] = useState(savedRecipeIds.has(params.id ?? ''));

  useEffect(() => {
    let active = true;
    setLoading(true);
    void recipeService
      .getRecipeDetail(params.id, pantryItems.map((item) => item.name))
      .then((data) => {
        if (!active) return;
        setRecipe(data);
        if (data) setFavorite(savedRecipeIds.has(data.id));
      })
      .catch(() => {
        if (!active) return;
        setRecipe(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pantryItems, params.id, savedRecipeIds]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </Screen>
    );
  }

  if (!recipe) return null;

  const finish = (saveMeta: boolean) => {
    if (favorite !== savedRecipeIds.has(recipe.id)) toggleSavedRecipe(recipe.id);
    completeCookSession(recipe.id, {
      title: recipe.title,
      servings: `${recipe.servings} servings`,
      duration: recipe.totalTime,
      rating: saveMeta ? rating || undefined : undefined,
      favorite: saveMeta ? favorite : undefined,
    });
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ height: 72, width: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft }}>
          <BowlCheckmarkMark size={36} color={theme.primary} />
        </View>
        <Text style={{ marginTop: 20, color: theme.textPrimary, fontSize: 26, fontFamily: theme.fonts.headingBold }}>Nicely done!</Text>
        <Text style={{ marginTop: 6, color: theme.primary, fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>{recipe.title}</Text>
        <Pressable
          onPress={() => setFavorite((value) => !value)}
          style={{ marginTop: 16, height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}
        >
          <Heart size={20} color={favorite ? '#E11D48' : theme.textPrimary} fill={favorite ? '#E11D48' : 'none'} />
        </Pressable>
        <Text style={{ marginTop: 8, color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.body }}>Added to your cooking history</Text>
        <Text style={{ marginTop: 24, color: theme.textPrimary, fontSize: 14, fontFamily: theme.fonts.bodyMedium }}>How did it turn out?</Text>
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Pressable key={index} onPress={() => setRating(index + 1)}>
              <Star size={24} color={index < rating ? theme.primary : theme.textMuted} fill={index < rating ? theme.primary : 'none'} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => finish(false)}>
          <Text style={{ marginTop: 16, color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.body }}>Skip</Text>
        </Pressable>
        <View style={{ position: 'absolute', bottom: 20, left: 24, right: 24, gap: 12 }}>
          <Pressable onPress={() => router.replace(`/cook/${recipe.id}`)} style={{ borderRadius: 999, borderWidth: 1, borderColor: theme.border, paddingVertical: 16 }}>
            <Text style={{ textAlign: 'center', color: theme.textPrimary, fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Cook Again</Text>
          </Pressable>
          <Pressable onPress={() => finish(true)} style={{ borderRadius: 999, backgroundColor: theme.primary, paddingVertical: 16 }}>
            <Text style={{ textAlign: 'center', color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Save & Finish</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

