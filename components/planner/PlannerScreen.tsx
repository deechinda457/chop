import { useMemo, useState } from 'react';
import { Clock3, Flame, MoreHorizontal, Plus } from 'lucide-react-native';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type Meal = { id: string; type: MealType; name: string; emoji: string; time: string; cal: string };

const EMPTY_MEALS: Meal[] = [];
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealTypeOrder: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const initialWeekMeals: Record<number, Meal[]> = {
  0: [
    { id: '1', type: 'Breakfast', name: 'Avocado Toast', emoji: '🥑', time: '10 min', cal: '320 cal' },
    { id: '2', type: 'Lunch', name: 'Chicken Caesar Wrap', emoji: '🌯', time: '15 min', cal: '480 cal' },
    { id: '3', type: 'Dinner', name: 'Salmon with Veggies', emoji: '🐟', time: '30 min', cal: '520 cal' },
  ],
  1: [
    { id: '4', type: 'Breakfast', name: 'Smoothie Bowl', emoji: '🥣', time: '5 min', cal: '280 cal' },
    { id: '5', type: 'Lunch', name: 'Pasta Primavera', emoji: '🍝', time: '25 min', cal: '420 cal' },
    { id: '6', type: 'Dinner', name: 'Grilled Steak', emoji: '🥩', time: '25 min', cal: '580 cal' },
  ],
  2: [{ id: '7', type: 'Breakfast', name: 'Oatmeal & Berries', emoji: '🫐', time: '8 min', cal: '250 cal' }],
  3: [],
  4: [],
  5: [],
  6: [],
};

export function PlannerScreen() {
  const theme = useThemeTokens();
  const [activeDay, setActiveDay] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<MealType>('Breakfast');
  const [newMealName, setNewMealName] = useState('');
  const [mealsByDay, setMealsByDay] = useState(initialWeekMeals);

  const today = new Date();
  const getDate = (offset: number) => {
    const d = new Date(today);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(today.getDate() + mondayOffset + offset);
    return d.getDate();
  };

  const meals = mealsByDay[activeDay] ?? EMPTY_MEALS;
  const totals = useMemo(
    () => ({
      cal: meals.reduce((sum, meal) => sum + parseInt(meal.cal, 10), 0),
      time: meals.reduce((sum, meal) => sum + parseInt(meal.time, 10), 0),
    }),
    [meals]
  );

  const handleAddMeal = () => {
    if (!newMealName.trim()) return;
    setMealsByDay((current) => ({
      ...current,
      [activeDay]: [
        ...(current[activeDay] || []),
        { id: Math.random().toString(36).slice(2, 9), type: selectedType, name: newMealName, emoji: '🍽️', time: '20 min', cal: '400 cal' },
      ],
    }));
    setNewMealName('');
    setShowAddForm(false);
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '700' }}>Meal Planner</Text>
            <View style={{ borderRadius: 999, backgroundColor: '#FFF8EC', paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '500' }}>This Week</Text>
            </View>
          </View>
          <View style={{ marginBottom: 16, flexDirection: 'row', gap: 6 }}>
            {daysOfWeek.map((day, index) => {
              const active = index === activeDay;
              const isToday = getDate(index) === today.getDate();
              return (
                <Pressable
                  key={day}
                  onPress={() => setActiveDay(index)}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    paddingVertical: 10,
                    alignItems: 'center',
                    backgroundColor: active ? theme.primary : 'transparent',
                    borderWidth: active ? 0 : 1.5,
                    borderColor: isToday ? '#F3D39A' : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? 'rgba(255,255,255,0.8)' : theme.textMuted, fontSize: 11, fontWeight: '500' }}>{day}</Text>
                  <Text style={{ color: active ? '#FFFFFF' : theme.textPrimary, fontSize: 15, fontWeight: '700' }}>{getDate(index)}</Text>
                </Pressable>
              );
            })}
          </View>
          {meals.length > 0 ? (
            <View style={{ marginBottom: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cream, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flame size={14} color={theme.primary} />
                <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{totals.cal} cal</Text>
              </View>
              <View style={{ height: 16, width: 1, backgroundColor: theme.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Clock3 size={14} color="#6FAF6A" />
                <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{totals.time} min total</Text>
              </View>
              <View style={{ height: 16, width: 1, backgroundColor: theme.border }} />
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>{meals.length} meals</Text>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {mealTypeOrder.map((type) => {
            const meal = meals.find((item) => item.type === type);
            return (
              <View key={type} style={{ marginBottom: 12 }}>
                <Text style={{ marginBottom: 8, color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{type}</Text>
                {meal ? (
                  <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ height: 52, width: 52, borderRadius: 14, backgroundColor: theme.cream, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>{meal.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>{meal.name}</Text>
                      <View style={{ marginTop: 4, flexDirection: 'row', gap: 12 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 11 }}>{meal.time}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 11 }}>{meal.cal}</Text>
                      </View>
                    </View>
                    <MoreHorizontal size={18} color={theme.textMuted} />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setSelectedType(type);
                      setShowAddForm(true);
                    }}
                    style={{ borderRadius: 14, borderWidth: 2, borderColor: theme.border, borderStyle: 'dashed', paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Plus size={16} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '500' }}>Add {type}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {showAddForm ? (
          <View style={{ marginHorizontal: 20, marginTop: 8, borderRadius: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 20 }}>
            <Text style={{ marginBottom: 16, color: theme.textPrimary, fontSize: 20, fontWeight: '700' }}>Add to {fullDays[activeDay]}</Text>
            <View style={{ marginBottom: 18, flexDirection: 'row', gap: 8 }}>
              {mealTypeOrder.map((type) => {
                const active = selectedType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setSelectedType(type)}
                    style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? '#FFF8EC' : theme.background, paddingVertical: 10 }}
                  >
                    <Text style={{ textAlign: 'center', color: active ? theme.primary : theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={newMealName}
              onChangeText={setNewMealName}
              placeholder="Search or enter recipe name..."
              placeholderTextColor={theme.textMuted}
              style={{ height: 54, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary, paddingHorizontal: 16, fontSize: 14 }}
            />
            <Pressable onPress={handleAddMeal} style={{ marginTop: 18, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Confirm Meal</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
