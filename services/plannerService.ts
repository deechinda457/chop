import { supabase } from '../lib/supabase';
import type { PlannedMeal } from '../store/app-store';
import { requireCurrentUser, resolveRemoteRecipeId } from './serviceUtils';

type MealPlanWeek = 'thisWeek' | 'nextWeek';
export type PlannerPayload = Record<MealPlanWeek, Record<number, PlannedMeal[]>>;

const mealTypeMap: Record<PlannedMeal['type'], 'breakfast' | 'lunch' | 'dinner' | 'snack'> = {
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
  Snack: 'snack',
};

const reverseMealTypeMap: Record<string, PlannedMeal['type']> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function createEmptyWeek(): Record<number, PlannedMeal[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

function getWeekStart(week: MealPlanWeek) {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + (week === 'nextWeek' ? 7 : 0));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Local-calendar-day formatting/parsing only -- never route through toISOString()/
// new Date(dateOnlyString) here. Both convert through UTC, and in any positive-UTC-offset
// timezone (e.g. WAT, UTC+1 -- this app's primary market) that rolls a local midnight back
// to the previous UTC calendar day, silently saving/reading meal plan slots a day off.
function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const plannerService = {
  async getAll(): Promise<PlannerPayload> {
    const user = await requireCurrentUser();
    const thisWeekStart = getWeekStart('thisWeek');
    const nextWeekStart = getWeekStart('nextWeek');
    const { data: plans, error: planError } = await supabase
      .from('meal_plans')
      .select('id, week_start')
      .eq('user_id', user.id)
      .in('week_start', [toDateString(thisWeekStart), toDateString(nextWeekStart)]);
    if (planError) throw planError;
    const planIds = (plans ?? []).map((plan) => plan.id);
    if (planIds.length === 0) return { thisWeek: createEmptyWeek(), nextWeek: createEmptyWeek() };

    const { data: slots, error: slotError } = await supabase
      .from('meal_plan_slots')
      .select('id, meal_plan_id, recipe_id, slot_date, meal_type, recipes(title, total_time_mins)')
      .in('meal_plan_id', planIds);
    if (slotError) throw slotError;

    const payload: PlannerPayload = { thisWeek: createEmptyWeek(), nextWeek: createEmptyWeek() };
    for (const plan of plans ?? []) {
      const weekKey: MealPlanWeek = plan.week_start === toDateString(thisWeekStart) ? 'thisWeek' : 'nextWeek';
      const start = weekKey === 'thisWeek' ? thisWeekStart : nextWeekStart;
      const weekSlots = (slots ?? []).filter((slot) => slot.meal_plan_id === plan.id);
      for (const slot of weekSlots) {
        const slotDate = parseDateOnly(slot.slot_date);
        const dayIndex = Math.round((slotDate.getTime() - start.getTime()) / 86400000);
        if (dayIndex < 0 || dayIndex > 6) continue;
        const recipeJoin = Array.isArray(slot.recipes) ? slot.recipes[0] : slot.recipes;
        const title = (recipeJoin?.title as string | undefined) ?? 'Planned meal';
        payload[weekKey][dayIndex].push({
          id: String(slot.id),
          type: reverseMealTypeMap[slot.meal_type] ?? 'Breakfast',
          name: title,
          emoji: '',
          time: recipeJoin?.total_time_mins ? `${String(recipeJoin.total_time_mins)} min` : '20 min',
          cal: '',
          recipeId: slot.recipe_id ? String(slot.recipe_id) : undefined,
        });
      }
    }
    return payload;
  },

  async saveWeek(week: MealPlanWeek, plan: Record<number, PlannedMeal[]>) {
    const user = await requireCurrentUser();
    const weekStart = getWeekStart(week);
    const weekStartString = toDateString(weekStart);
    const { data: mealPlan, error: mealPlanError } = await supabase
      .from('meal_plans')
      .upsert({ user_id: user.id, week_start: weekStartString, generated_by: 'manual' }, { onConflict: 'user_id,week_start' })
      .select('id')
      .single();
    if (mealPlanError) throw mealPlanError;
    const mealPlanId = mealPlan.id;
    const { error: deleteError } = await supabase.from('meal_plan_slots').delete().eq('meal_plan_id', mealPlanId);
    if (deleteError) throw deleteError;

    const slotRows: Record<string, unknown>[] = [];
    for (const [dayKey, meals] of Object.entries(plan)) {
      const dayIndex = Number(dayKey);
      const slotDate = new Date(weekStart);
      slotDate.setDate(weekStart.getDate() + dayIndex);
      for (const meal of meals) {
        slotRows.push({
          meal_plan_id: mealPlanId,
          recipe_id: meal.recipeId ? await resolveRemoteRecipeId(meal.recipeId) : null,
          slot_date: toDateString(slotDate),
          meal_type: mealTypeMap[meal.type],
          servings: 2,
        });
      }
    }
    if (slotRows.length === 0) return;
    const { error: insertError } = await supabase.from('meal_plan_slots').insert(slotRows);
    if (insertError) throw insertError;
  },
};
