import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ArrowRight, Check, Minus, Plus } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';
import { allergyOptions, dietTypeOptions, healthGoalOptions } from '../../store/mock-user';

type StepId = 'welcome' | 'diet' | 'allergies' | 'health' | 'household';

const steps: { id: StepId; title: string; subtitle: string }[] = [
  { id: 'welcome', title: 'Welcome to RecipeOS', subtitle: 'Your smart cooking companion for recipes, pantry, planning, and cooking support.' },
  { id: 'diet', title: "What's your diet type?", subtitle: 'Choose the one that fits best.' },
  { id: 'allergies', title: 'Any food allergies?', subtitle: 'Select all that apply.' },
  { id: 'health', title: 'What are your health goals?', subtitle: 'We will tailor recommendations around this.' },
  { id: 'household', title: 'How many people do you cook for?', subtitle: 'We will adjust portions to match your household.' },
];

function SelectionChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#E8A020' : theme.border,
        backgroundColor: selected ? '#E8A020' : theme.surface,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: selected ? '#FFFFFF' : theme.textPrimary, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

function CustomEntryBlock({
  values,
  onAdd,
  onRemove,
}: {
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const theme = useThemeTokens();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <View style={{ marginTop: 16 }}>
      <Pressable onPress={() => setExpanded((value) => !value)}>
        <Text style={{ color: '#E8A020', fontSize: 13, fontWeight: '600' }}>+ Add your own</Text>
      </Pressable>
      {expanded ? (
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type your own..."
            placeholderTextColor={theme.textMuted}
            style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.textPrimary, paddingHorizontal: 14 }}
          />
          <Pressable
            onPress={() => {
              const trimmed = draft.trim();
              if (!trimmed) return;
              onAdd(trimmed);
              setDraft('');
            }}
            style={{ borderRadius: 14, backgroundColor: '#E8A020', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>
      ) : null}
      {values.length > 0 ? (
        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {values.map((value) => (
            <View key={value} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: '#E8A020', paddingHorizontal: 14, paddingVertical: 9 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500' }}>{value}</Text>
              <Pressable onPress={() => onRemove(value)}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function OnboardingScreen() {
  const theme = useThemeTokens();
  const { session, refreshProfile } = useAuth();
  const onboardingStep = useAppStore((state) => state.onboardingStep);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  const [dietType, setDietType] = useState('None');
  const [customDiet, setCustomDiet] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState('Balanced');
  const [customHealthGoals, setCustomHealthGoals] = useState<string[]>([]);
  const [defaultServings, setDefaultServings] = useState(2);

  const step = steps[onboardingStep] ?? steps[0];
  const isFinalStep = step.id === 'household';

  const mergedAllergies = useMemo(() => Array.from(new Set([...allergies, ...customAllergies])), [allergies, customAllergies]);
  const normalizedAllergies = useMemo(
    () => (mergedAllergies.length === 1 && mergedAllergies[0] === 'None' ? [] : mergedAllergies.filter((value) => value !== 'None')),
    [mergedAllergies]
  );

  const handleDone = async () => {
    if (!session?.user) {
      router.replace('/auth/login');
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_completed: true,
          diet_type: [dietType, ...customDiet].filter(Boolean).join(', '),
          allergies: normalizedAllergies,
          health_goals: [healthGoals, ...customHealthGoals].filter(Boolean).join(', '),
          default_servings: defaultServings,
        })
        .eq('id', session.user.id);
      if (profileError) throw profileError;

      completeOnboarding();
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your preferences right now.';
      Alert.alert('Unable to finish onboarding', message);
    }
  };

  const nextStep = () => {
    if (isFinalStep) {
      void handleDone();
      return;
    }
    setOnboardingStep(Math.min(onboardingStep + 1, steps.length - 1));
  };

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {steps.map((_, index) => (
              <View key={index} style={{ height: 3, width: index === onboardingStep ? 28 : 12, borderRadius: 999, backgroundColor: index <= onboardingStep ? theme.primary : theme.border }} />
            ))}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 28, paddingBottom: 24 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 28, fontWeight: '700', lineHeight: 34 }}>{step.title}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 15, marginTop: 8 }}>{step.subtitle}</Text>

          {step.id === 'welcome' ? (
            <View style={{ marginTop: 40, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 24 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>
                Discover recipes, manage pantry ingredients, plan meals, and cook with a guided assistant built for everyday use.
              </Text>
            </View>
          ) : null}

          {step.id === 'diet' ? (
            <View style={{ marginTop: 32 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {dietTypeOptions.map((option) => (
                  <SelectionChip key={option} label={option} selected={dietType === option} onPress={() => setDietType(option)} />
                ))}
              </View>
              <CustomEntryBlock
                values={customDiet}
                onAdd={(value) => setCustomDiet((current) => (current.includes(value) ? current : [...current, value]))}
                onRemove={(value) => setCustomDiet((current) => current.filter((entry) => entry !== value))}
              />
            </View>
          ) : null}

          {step.id === 'allergies' ? (
            <View style={{ marginTop: 32 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {allergyOptions.map((option) => (
                  <SelectionChip
                    key={option}
                    label={option}
                    selected={allergies.includes(option)}
                    onPress={() =>
                      setAllergies((current) =>
                        current.includes(option) ? current.filter((entry) => entry !== option) : [...current, option]
                      )
                    }
                  />
                ))}
              </View>
              <CustomEntryBlock
                values={customAllergies}
                onAdd={(value) => setCustomAllergies((current) => (current.includes(value) ? current : [...current, value]))}
                onRemove={(value) => setCustomAllergies((current) => current.filter((entry) => entry !== value))}
              />
            </View>
          ) : null}

          {step.id === 'health' ? (
            <View style={{ marginTop: 32 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {healthGoalOptions.map((option) => (
                  <SelectionChip key={option} label={option} selected={healthGoals === option} onPress={() => setHealthGoals(option)} />
                ))}
              </View>
              <CustomEntryBlock
                values={customHealthGoals}
                onAdd={(value) => setCustomHealthGoals((current) => (current.includes(value) ? current : [...current, value]))}
                onRemove={(value) => setCustomHealthGoals((current) => current.filter((entry) => entry !== value))}
              />
            </View>
          ) : null}

          {step.id === 'household' ? (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <Pressable onPress={() => setDefaultServings((current) => Math.max(1, current - 1))} style={{ height: 52, width: 52, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Minus size={20} color={theme.textPrimary} />
                </Pressable>
                <Text style={{ minWidth: 48, textAlign: 'center', color: theme.textPrimary, fontSize: 28, fontWeight: '700' }}>{defaultServings}</Text>
                <Pressable onPress={() => setDefaultServings((current) => Math.min(10, current + 1))} style={{ height: 52, width: 52, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} color={theme.textPrimary} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingTop: 16, paddingBottom: 24 }}>
          <Pressable onPress={nextStep} style={{ height: 54, borderRadius: 18, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>{isFinalStep ? 'Get Started' : step.id === 'welcome' ? 'Get Started' : 'Continue'}</Text>
            {!isFinalStep ? <ArrowRight size={18} color="#FFFFFF" /> : <Check size={18} color="#FFFFFF" />}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
