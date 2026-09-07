import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { ArrowLeft, Clock3, ListChecks, Play, X } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import type { RecipeDetailRecord, RecipeVideo } from '../../store/recipe-types';
import { recipeService } from '../../services/recipeService';
import { VideoEmbed } from './VideoEmbed';
import { BowlCheckmarkMark } from './BowlCheckmarkMark';

const KEY_AMOUNT_PATTERN =
  /\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:cups?|tbsp|tsp|teaspoons?|tablespoons?|grams?|g|kg|ml|liters?|litres?|l|minutes?|mins?|hours?|hrs?|pieces?|cloves?|servings?|°[CF]|degrees?)\b/gi;

function extractKeyAmounts(instruction: string) {
  const matches = instruction.match(KEY_AMOUNT_PATTERN);
  if (!matches) return [];
  return Array.from(new Set(matches.map((match) => match.trim())));
}

function parseTimerSeconds(instruction: string) {
  const rangeMatch = instruction.match(/(\d+)\s*-\s*(\d+)\s*(minute|minutes|min)/i);
  if (rangeMatch) return Number(rangeMatch[2]) * 60;
  const singleMatch = instruction.match(/(\d+)\s*(minute|minutes|min)/i);
  if (singleMatch) return Number(singleMatch[1]) * 60;
  const hourRangeMatch = instruction.match(/(\d+)\s*-\s*(\d+)\s*(hour|hours|hr|hrs)/i);
  if (hourRangeMatch) return Number(hourRangeMatch[2]) * 3600;
  const hourMatch = instruction.match(/(\d+)\s*(hour|hours|hr|hrs)/i);
  if (hourMatch) return Number(hourMatch[1]) * 3600;
  return null;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

function ProgressRing({
  currentStep,
  totalSteps,
  isComplete,
  theme,
}: {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  theme: ReturnType<typeof useThemeTokens>;
}) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.primaryLight} />
            <Stop offset="1" stopColor={theme.primary} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.border} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      {isComplete ? (
        <BowlCheckmarkMark size={40} color={theme.primary} />
      ) : (
        <>
          <Text style={{ color: theme.textPrimary, fontSize: 22, fontFamily: theme.fonts.headingBold }}>
            {currentStep + 1}/{totalSteps}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: theme.fonts.bodyMedium }}>Step</Text>
        </>
      )}
    </View>
  );
}

export function CookScreen() {
  useKeepAwake();
  const theme = useThemeTokens();

  const params = useLocalSearchParams<{ id: string }>();
  const pantryItems = useAppStore((state) => state.pantryItems);
  const saveCookDraft = useAppStore((state) => state.saveCookDraft);
  const clearCookDraft = useAppStore((state) => state.clearCookDraft);
  const cookingDrafts = useAppStore((state) => state.cookingDrafts);

  const [recipe, setRecipe] = useState<RecipeDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'choice' | 'text' | 'video'>('choice');
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showIngredientSheet, setShowIngredientSheet] = useState(false);
  const [video, setVideo] = useState<RecipeVideo | null>(null);
  const [videoRequested, setVideoRequested] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void recipeService
      .getRecipeDetail(params.id, pantryItems.map((item) => item.name))
      .then((data) => {
        if (!active) return;
        setRecipe(data);
        const draftStep = data ? cookingDrafts[data.id] ?? cookingDrafts[params.id] ?? 0 : 0;
        setCurrentStep(draftStep);
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
  }, [cookingDrafts, pantryItems, params.id]);

  useEffect(() => {
    if (!timerSeconds) return;
    const interval = setInterval(() => {
      setTimerSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const stepInstruction = useMemo(() => recipe?.steps[currentStep]?.instruction ?? '', [currentStep, recipe]);
  const keyAmounts = useMemo(() => extractKeyAmounts(stepInstruction), [stepInstruction]);
  const timerSuggestion = stepInstruction ? parseTimerSeconds(stepInstruction) : null;
  const isLastStep = recipe ? currentStep === recipe.steps.length - 1 : false;

  const loadVideo = (title: string) => {
    if (videoRequested) return;
    setVideoRequested(true);
    setVideoLoading(true);
    setVideoError(false);
    void recipeService
      .getRecipeVideo(title)
      .then((data) => setVideo(data))
      .catch(() => setVideoError(true))
      .finally(() => setVideoLoading(false));
  };

  const enterMode = (nextMode: 'text' | 'video') => {
    setMode(nextMode);
    if (nextMode === 'video' && recipe) loadVideo(recipe.title);
  };

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

  if (mode === 'choice') {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={() => router.back()} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
            <ArrowLeft size={18} color={theme.textPrimary} />
          </Pressable>
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: theme.fonts.headingSemibold }}>Cook Mode</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 8, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 12, alignItems: 'center' }}>
            <Text numberOfLines={2} style={{ textAlign: 'center', color: theme.textPrimary, fontSize: 20, fontFamily: theme.fonts.headingBold }}>
              {recipe.title}
            </Text>
            <Text style={{ marginTop: 8, color: theme.textSecondary, fontSize: 14, fontFamily: theme.fonts.bodyMedium }}>How do you want to cook this?</Text>
          </View>

          <Pressable
            onPress={() => enterMode('video')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 18 }}
          >
            <View style={{ height: 44, width: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft }}>
              <Play size={20} color={theme.primary} fill={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Watch full video</Text>
              <Text style={{ marginTop: 2, color: theme.textMuted, fontSize: 12, fontFamily: theme.fonts.body }}>Follow along with a video, cook at your own pace</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => enterMode('text')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 18 }}
          >
            <View style={{ height: 44, width: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft }}>
              <ListChecks size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Follow step by step</Text>
              <Text style={{ marginTop: 2, color: theme.textMuted, fontSize: 12, fontFamily: theme.fonts.body }}>Guided steps with timers, one at a time</Text>
            </View>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => setMode('choice')} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
          <X size={18} color={theme.textPrimary} />
        </Pressable>
        <Text style={{ color: theme.textPrimary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>
          {mode === 'video' ? 'Full Recipe Video' : `Step ${currentStep + 1} of ${recipe.steps.length}`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => (mode === 'video' ? setMode('text') : enterMode('video'))}
            style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: mode === 'video' ? theme.primary : theme.border, backgroundColor: mode === 'video' ? theme.primarySoft : theme.surface }}
          >
            <Play size={16} color={mode === 'video' ? theme.primary : theme.textPrimary} fill={mode === 'video' ? theme.primary : 'none'} />
          </Pressable>
          <Pressable onPress={() => setShowIngredientSheet(true)} style={{ height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
            <ListChecks size={16} color={theme.textPrimary} />
          </Pressable>
        </View>
      </View>

      {mode === 'video' ? (
        <View style={{ flex: 1, paddingHorizontal: 8, paddingBottom: 20 }}>
          <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: theme.surface, position: 'relative' }}>
            {videoLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : video ? (
              <VideoEmbed youTubeId={video.youTubeId} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.body }}>
                  {videoError ? 'Video search is temporarily unavailable.' : "No video found for this recipe."}
                </Text>
                <Pressable onPress={() => setMode('text')} style={{ marginTop: 16, borderRadius: 999, backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 12 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>Follow step by step instead</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ProgressRing currentStep={currentStep} totalSteps={recipe.steps.length} isComplete={isLastStep} theme={theme} />

            <Text style={{ marginTop: 28, textAlign: 'center', color: theme.textPrimary, fontSize: 22, fontFamily: theme.fonts.headingSemibold, lineHeight: 32 }}>
              {stepInstruction}
            </Text>

            {keyAmounts.length > 0 ? (
              <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                {keyAmounts.map((amount) => (
                  <View key={amount} style={{ borderRadius: 999, backgroundColor: theme.primarySoft, paddingHorizontal: 8, paddingVertical: 6 }}>
                    <Text style={{ color: theme.primary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>{amount}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {recipe.steps[currentStep]?.tip ? (
              <Text style={{ marginTop: 16, textAlign: 'center', color: theme.textMuted, fontSize: 13, fontFamily: theme.fonts.body, fontStyle: 'italic' }}>
                {recipe.steps[currentStep]?.tip}
              </Text>
            ) : null}

            {/* Timer gets its own quiet card so it reads as a distinct, separate
                affordance from the active hands-on step content above it. */}
            {timerSuggestion && timerSeconds === 0 ? (
              <Pressable
                onPress={() => setTimerSeconds(timerSuggestion)}
                style={{ marginTop: 20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 18, paddingVertical: 12 }}
              >
                <Clock3 size={16} color={theme.primary} />
                <Text style={{ color: theme.textPrimary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>Start {Math.round(timerSuggestion / 60)} min timer</Text>
              </Pressable>
            ) : null}
            {timerSeconds > 0 ? (
              <View style={{ marginTop: 20, alignSelf: 'center', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.primarySoft, paddingHorizontal: 24, paddingVertical: 14 }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: theme.fonts.bodyMedium, textTransform: 'uppercase' }}>Timer</Text>
                <Text style={{ marginTop: 4, color: theme.textPrimary, fontSize: 26, fontFamily: theme.fonts.headingBold }}>{formatTime(timerSeconds)}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 20, gap: 16 }}>
            <Pressable
              disabled={currentStep === 0}
              onPress={() => setCurrentStep((value) => Math.max(0, value - 1))}
              style={{ opacity: currentStep === 0 ? 0.4 : 1 }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: theme.fonts.bodySemibold }}>← Back</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isLastStep) {
                  clearCookDraft(recipe.id);
                  router.replace(`/completion/${recipe.id}`);
                  return;
                }
                const nextStep = currentStep + 1;
                setCurrentStep(nextStep);
                setTimerSeconds(0);
                saveCookDraft(recipe.id, nextStep);
              }}
              style={{ flex: 1, borderRadius: 999, backgroundColor: theme.primary, paddingVertical: 16 }}
            >
              <Text style={{ textAlign: 'center', color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>{isLastStep ? "I'm Done" : 'Next Step →'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showIngredientSheet ? (
        <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setShowIngredientSheet(false)} />
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.surface, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ alignSelf: 'center', marginBottom: 16, height: 6, width: 48, borderRadius: 999, backgroundColor: theme.border }} />
            <Text style={{ marginBottom: 14, color: theme.textPrimary, fontSize: 18, fontFamily: theme.fonts.headingBold }}>Ingredients</Text>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
              {recipe.ingredients.map((ingredient) => (
                <View
                  key={`${recipe.id}-${ingredient.name}`}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 12 }}
                >
                  <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: theme.fonts.bodyMedium }}>{ingredient.name}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: theme.fonts.bodySemibold }}>{ingredient.quantity}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={() => setShowIngredientSheet(false)} style={{ marginTop: 16, height: 50, borderRadius: 25, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: theme.fonts.bodySemibold }}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
