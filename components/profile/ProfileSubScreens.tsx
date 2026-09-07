import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Camera, ChevronRight, Eye, EyeOff, Lock, Scale, Shield, Star } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { allergyOptions, dietTypeOptions, healthGoalOptions } from '../../store/mock-user';
import { useThemeTokens } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { notificationService } from '../../services/notificationService';
import { cardShadow, Row, Toggle } from './ProfileControls';

function Header({ title }: { title: string }) {
  const theme = useThemeTokens();

  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 20 }}>
      <View style={{ position: 'relative', minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ position: 'absolute', left: 0, height: 40, width: 40, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color={theme.textPrimary} />
        </Pressable>
        <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '700' }}>{title}</Text>
      </View>
    </View>
  );
}

function BottomButton({ label, onPress }: { label: string; onPress: () => void | Promise<void> }) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      await onPress();
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 16, paddingBottom: 16 }}>
      <Pressable disabled={loading} onPress={handlePress} style={{ height: 52, borderRadius: 999, backgroundColor: loading ? '#D8CBB6' : '#E8A020', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>{label}</Text>}
      </Pressable>
    </View>
  );
}

function OptionPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 999, borderWidth: 1, borderColor: selected ? '#E8A020' : '#E9E2D8', backgroundColor: selected ? '#E8A020' : '#FFFFFF', paddingHorizontal: 8, paddingVertical: 10 }}>
      <Text style={{ color: selected ? '#FFFFFF' : '#1A1814', fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

function splitStoredList(value: string | undefined | null) {
  return value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : [];
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
    <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
      <Pressable onPress={() => setExpanded((value) => !value)}>
        <Text style={{ color: '#E8A020', fontSize: 13, fontWeight: '600' }}>+ Add your own</Text>
      </Pressable>
      {expanded ? (
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Type your own..." placeholderTextColor={theme.textMuted} style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.textPrimary, paddingHorizontal: 14 }} />
          <Pressable onPress={() => { const value = draft.trim(); if (!value) return; onAdd(value); setDraft(''); }} style={{ borderRadius: 14, backgroundColor: '#E8A020', paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>
      ) : null}
      {values.length > 0 ? (
        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
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

export function DietTypeScreen() {
  const { profile, updateProfile } = useAuth();
  const storedDietTypes = splitStoredList(profile?.diet_type as string | undefined);
  const [selected, setSelected] = useState(storedDietTypes[0] || 'None');
  const [custom, setCustom] = useState(storedDietTypes.slice(1));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Diet Type" />
      <View style={{ paddingHorizontal: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {dietTypeOptions.map((option) => (
          <OptionPill key={option} label={option} selected={selected === option} onPress={() => setSelected(option)} />
        ))}
      </View>
      <CustomEntryBlock values={custom} onAdd={(value) => setCustom((current) => (current.includes(value) ? current : [...current, value]))} onRemove={(value) => setCustom((current) => current.filter((entry) => entry !== value))} />
      <BottomButton label="Save" onPress={async () => { await updateProfile({ diet_type: [selected, ...custom].join(', ') }); router.back(); }} />
    </ScrollView>
  );
}

export function AllergiesScreen() {
  const { profile, updateProfile } = useAuth();
  const [selected, setSelected] = useState<string[]>(Array.isArray(profile?.allergies) ? (profile.allergies as string[]) : []);
  const [custom, setCustom] = useState<string[]>([]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Allergies" />
      <View style={{ paddingHorizontal: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {allergyOptions.map((option) => (
          <OptionPill
            key={option}
            label={option}
            selected={selected.includes(option)}
            onPress={() =>
              setSelected((current) =>
                current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
              )
            }
          />
        ))}
      </View>
      <CustomEntryBlock values={custom} onAdd={(value) => setCustom((current) => (current.includes(value) ? current : [...current, value]))} onRemove={(value) => setCustom((current) => current.filter((entry) => entry !== value))} />
      <BottomButton label="Save" onPress={async () => { await updateProfile({ allergies: Array.from(new Set([...selected, ...custom])) }); router.back(); }} />
    </ScrollView>
  );
}

export function HealthGoalsScreen() {
  const { profile, updateProfile } = useAuth();
  const storedGoals = splitStoredList(profile?.health_goals as string | undefined);
  const [selected, setSelected] = useState(storedGoals[0] || 'Balanced');
  const [custom, setCustom] = useState(storedGoals.slice(1));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Health Goals" />
      <View style={{ paddingHorizontal: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {healthGoalOptions.map((option) => (
          <OptionPill key={option} label={option} selected={selected === option} onPress={() => setSelected(option)} />
        ))}
      </View>
      <CustomEntryBlock values={custom} onAdd={(value) => setCustom((current) => (current.includes(value) ? current : [...current, value]))} onRemove={(value) => setCustom((current) => current.filter((entry) => entry !== value))} />
      <BottomButton label="Save" onPress={async () => { await updateProfile({ health_goals: [selected, ...custom].join(', ') }); router.back(); }} />
    </ScrollView>
  );
}

// Hub for the three settings "Preferences & Diet" represents (they lived
// under one "Dietary Preferences" group before Profile's flat-list redesign
// consolidated it into a single row) -- each still opens its own full editor.
export function PreferencesDietScreen() {
  const theme = useThemeTokens();
  const { profile } = useAuth();
  const dietType = (profile?.diet_type as string | undefined) ?? 'None';
  const allergies = Array.isArray(profile?.allergies) ? (profile.allergies as string[]) : [];
  const healthGoal = (profile?.health_goals as string | undefined) ?? 'Balanced';

  return (
    <View style={{ flex: 1 }}>
      <Header title="Preferences & Diet" />
      <View style={{ paddingHorizontal: 8 }}>
        <View style={[{ overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, cardShadow]}>
          <Row label="Diet Type" value={dietType} icon={<Scale size={16} color={theme.primary} />} onPress={() => router.push('/profile/diet-type')} />
          <Row label="Allergies" value={allergies.length > 0 ? allergies.join(', ') : 'None'} icon={<Shield size={16} color={theme.primary} />} onPress={() => router.push('/profile/allergies')} />
          <Row label="Health Goals" value={healthGoal} icon={<Star size={16} color={theme.primary} />} onPress={() => router.push('/profile/health-goals')} divider={false} />
        </View>
      </View>
    </View>
  );
}

// Hub for the notification-preference toggles (previously three separate rows
// on the main Profile list) -- matches the mockup's single "Notifications"
// menu item while keeping each toggle individually controllable.
export function NotificationsScreen() {
  const theme = useThemeTokens();
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [mealReminders, setMealReminders] = useState(true);
  const [recipeSuggestions, setRecipeSuggestions] = useState(false);

  useEffect(() => {
    void notificationService
      .getPreferences()
      .then((preferences) => {
        setExpiryAlerts(preferences.expiry_alerts);
        setMealReminders(preferences.meal_reminders);
        setRecipeSuggestions(preferences.recipe_suggestions);
      })
      .catch(() => undefined);
  }, []);

  const togglePreference = async (key: 'expiry_alerts' | 'meal_reminders' | 'recipe_suggestions', nextValue: boolean) => {
    if (key === 'expiry_alerts') setExpiryAlerts(nextValue);
    if (key === 'meal_reminders') setMealReminders(nextValue);
    if (key === 'recipe_suggestions') setRecipeSuggestions(nextValue);

    try {
      await notificationService.updatePreferences({ [key]: nextValue });
    } catch {
      if (key === 'expiry_alerts') setExpiryAlerts((current) => !nextValue);
      if (key === 'meal_reminders') setMealReminders((current) => !nextValue);
      if (key === 'recipe_suggestions') setRecipeSuggestions((current) => !nextValue);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Notifications" />
      <View style={{ paddingHorizontal: 8 }}>
        <View style={[{ overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, cardShadow]}>
          <Row label="Expiry Alerts" icon={<Bell size={16} color={theme.primary} />} right={<Toggle checked={expiryAlerts} onPress={() => void togglePreference('expiry_alerts', !expiryAlerts)} />} />
          <Row label="Meal Reminders" icon={<Bell size={16} color={theme.primary} />} right={<Toggle checked={mealReminders} onPress={() => void togglePreference('meal_reminders', !mealReminders)} />} />
          <Row label="Recipe Suggestions" icon={<Bell size={16} color={theme.primary} />} right={<Toggle checked={recipeSuggestions} onPress={() => void togglePreference('recipe_suggestions', !recipeSuggestions)} />} divider={false} />
        </View>
      </View>
    </View>
  );
}

export function MeasurementUnitsScreen() {
  const { profile, updateProfile } = useAuth();
  const [selected, setSelected] = useState<'Metric' | 'Imperial'>((profile?.measurement_units as 'Metric' | 'Imperial') || 'Metric');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Measurement Units" />
      <View style={{ paddingHorizontal: 8, flexDirection: 'row', gap: 12 }}>
        {(['Metric', 'Imperial'] as const).map((option) => (
          <OptionPill key={option} label={option} selected={selected === option} onPress={() => setSelected(option)} />
        ))}
      </View>
      <BottomButton label="Save" onPress={async () => { await updateProfile({ measurement_units: selected }); router.back(); }} />
    </ScrollView>
  );
}

export function LanguageScreen() {
  const [selected, setSelected] = useState<'English' | 'French'>('English');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Language" />
      <View style={{ paddingHorizontal: 8, flexDirection: 'row', gap: 12 }}>
        {(['English', 'French'] as const).map((option) => (
          <OptionPill key={option} label={option} selected={selected === option} onPress={() => setSelected(option)} />
        ))}
      </View>
      <BottomButton label="Save" onPress={() => router.back()} />
    </ScrollView>
  );
}

export function PlansScreen() {
  const plans = [
    { id: 'free', title: 'Free', price: '$0', suffix: 'forever', features: ['5 AI searches per day', 'Basic recipe browsing', 'Manual pantry tracking', 'General shopping list', 'Cook Mode (3 recipes/month)'] },
    { id: 'pro', title: 'Pro', price: '$4.99', suffix: '/month', note: '7-day free trial - no card required', features: ['Unlimited AI searches', 'Full Cook Mode', 'Recipe shopping lists', 'Nutritional tracking', 'Meal planner', 'Unlimited saved recipes', 'Voice & camera ingredient search'] },
    { id: 'family', title: 'Family', price: '$8.99', suffix: '/month', note: 'Up to 5 profiles - $1.80 per person', features: ['Everything in Pro', 'Up to 5 family profiles', 'Shared shopping list', 'Shared meal planner', 'Individual dietary preferences per profile', 'Cook for Family recipe filtering'] },
  ] as const;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Header title="Choose Your Plan" />
      <Text style={{ marginBottom: 20, paddingHorizontal: 8, color: '#8A8A8A', fontSize: 13 }}>Start free, upgrade anytime</Text>
      <View style={{ paddingHorizontal: 8, gap: 16 }}>
        {plans.map((plan) => (
          <View key={plan.id} style={{ position: 'relative', borderRadius: 24, borderWidth: 1, borderColor: plan.id === 'pro' ? '#E8A020' : plan.id === 'family' ? '#7C4DFF' : '#D8D8D8', backgroundColor: plan.id === 'pro' ? '#FFF8EC' : plan.id === 'family' ? '#F6F0FF' : '#FFFFFF', padding: 20 }}>
            {plan.id === 'pro' ? (
              <View style={{ position: 'absolute', right: 16, top: 16, borderRadius: 999, backgroundColor: '#E8A020', paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>Most Popular</Text>
              </View>
            ) : null}
            <Text style={{ color: plan.id === 'pro' ? '#E8A020' : plan.id === 'family' ? '#7C4DFF' : '#1A1814', fontSize: 18, fontWeight: '700' }}>{plan.title}</Text>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Text style={{ color: '#1A1814', fontSize: 32, fontWeight: '800' }}>{plan.price}</Text>
              <Text style={{ color: '#8A8A8A', fontSize: 13, paddingBottom: 4 }}>{plan.suffix}</Text>
            </View>
            {'note' in plan ? <Text style={{ marginTop: 4, color: '#4CAF50', fontSize: 11, fontWeight: '500' }}>{plan.note}</Text> : null}
            <View style={{ marginTop: 16, gap: 8 }}>
              {plan.features.map((feature) => (
                <Text key={feature} style={{ color: '#1A1814', fontSize: 13 }}>• {feature}</Text>
              ))}
            </View>
            <Pressable style={{ marginTop: 20, height: 46, borderRadius: 999, backgroundColor: plan.id === 'free' ? '#EFEFEF' : plan.id === 'family' ? '#7C4DFF' : '#E8A020', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: plan.id === 'free' ? '#6B6B6B' : '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{plan.id === 'free' ? 'Current Plan' : plan.id === 'pro' ? 'Start Free Trial' : 'Get Family Plan'}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={{ marginTop: 20, textAlign: 'center', color: '#8A8A8A', fontSize: 12 }}>Prices in USD - Cancel anytime - Secure payment</Text>
    </ScrollView>
  );
}

export function EditProfileScreen() {
  const theme = useThemeTokens();
  const { profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState((profile?.full_name as string) || '');
  const [username, setUsername] = useState((profile?.username as string) || '');
  const email = (profile?.email as string) || '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'RO';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Edit Profile" />
      <View style={{ paddingHorizontal: 8 }}>
        <View style={{ marginBottom: 24, alignItems: 'center' }}>
          <View style={{ position: 'relative', height: 80, width: 80, borderRadius: 999, backgroundColor: '#8B5E3C', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>{initials}</Text>
            <View style={{ position: 'absolute', right: 0, bottom: 0, height: 28, width: 28, borderRadius: 999, borderWidth: 2, borderColor: theme.background, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={14} color="#E8A020" />
            </View>
          </View>
        </View>
        <Text style={{ marginBottom: 8, color: '#8A8A8A', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Full Name</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.textPrimary, paddingHorizontal: 8, marginBottom: 16 }} />
        <Text style={{ marginBottom: 8, color: '#8A8A8A', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Username</Text>
        <TextInput value={username} onChangeText={setUsername} style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.textPrimary, paddingHorizontal: 8 }} />
        <Text style={{ marginTop: 8, color: '#8A8A8A', fontSize: 12 }}>You can change your username once every 30 days</Text>
        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: '#F4F4F4', paddingHorizontal: 8, paddingVertical: 14 }}>
          <Text style={{ color: '#8D8D8D', fontSize: 14, fontWeight: '500' }}>@{username}</Text>
          <Text style={{ marginTop: 4, color: '#8D8D8D', fontSize: 12 }}>Next change available in 18 days</Text>
        </View>
        <Text style={{ marginTop: 16, marginBottom: 8, color: '#8A8A8A', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Email</Text>
        <TextInput value={email} editable={false} style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.textPrimary, paddingHorizontal: 8 }} />
        <Pressable onPress={() => router.push('/profile/password')} style={{ marginTop: 16, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 8 }}>
          <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={16} color="#E8A020" />
          </View>
          <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>Change Password</Text>
          <ChevronRight size={16} color="#8A8A8A" />
        </Pressable>
      </View>
      <BottomButton label="Save Changes" onPress={async () => { await updateProfile({ full_name: fullName, username }); router.back(); }} />
    </ScrollView>
  );
}

export function ChangePasswordScreen() {
  const theme = useThemeTokens();
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const fields = [
    { id: 'current' as const, label: 'Current Password' },
    { id: 'next' as const, label: 'New Password' },
    { id: 'confirm' as const, label: 'Confirm New Password' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Change Password" />
      <View style={{ paddingHorizontal: 8, gap: 16 }}>
        {fields.map((field) => (
          <View key={field.id}>
            <Text style={{ marginBottom: 8, color: '#8A8A8A', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>{field.label}</Text>
            <View style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput secureTextEntry={!show[field.id]} value={values[field.id]} onChangeText={(value) => setValues((current) => ({ ...current, [field.id]: value }))} style={{ flex: 1, color: theme.textPrimary }} />
              <Pressable onPress={() => setShow((current) => ({ ...current, [field.id]: !current[field.id] }))}>
                {show[field.id] ? <EyeOff size={18} color="#8A8A8A" /> : <Eye size={18} color="#8A8A8A" />}
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <BottomButton
        label="Save Password"
        onPress={async () => {
          if (values.next !== values.confirm) {
            alert('Passwords do not match');
            return;
          }
          if (!values.next) return;
          const { error } = await supabase.auth.updateUser({ password: values.next });
          if (error) alert(error.message);
          else router.back();
        }}
      />
    </ScrollView>
  );
}
