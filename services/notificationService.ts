import { supabase } from '../lib/supabase';
import { requireCurrentUser } from './serviceUtils';

export type NotificationPreferences = {
  expiry_alerts: boolean;
  meal_reminders: boolean;
  recipe_suggestions: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  max_per_day?: number | null;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  sentAt: string;
};

export const notificationService = {
  async getPreferences(): Promise<NotificationPreferences> {
    const user = await requireCurrentUser();
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('expiry_alerts, meal_reminders, recipe_suggestions, quiet_hours_start, quiet_hours_end, max_per_day')
      .eq('user_id', user.id)
      .single();
    if (error) throw error;
    return {
      expiry_alerts: data.expiry_alerts ?? true,
      meal_reminders: data.meal_reminders ?? true,
      recipe_suggestions: data.recipe_suggestions ?? false,
      quiet_hours_start: data.quiet_hours_start ?? null,
      quiet_hours_end: data.quiet_hours_end ?? null,
      max_per_day: data.max_per_day ?? null,
    };
  },

  async updatePreferences(updates: Partial<NotificationPreferences>) {
    const user = await requireCurrentUser();
    const { error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', user.id);
    if (error) throw error;
  },

  async registerPushToken(expoPushToken: string, deviceId?: string) {
    const user = await requireCurrentUser();
    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('expo_push_token', expoPushToken);
    if (deleteError) throw deleteError;

    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: user.id,
      expo_push_token: expoPushToken,
      device_id: deviceId ?? null,
    });
    if (error) throw error;
  },

  async listNotifications(): Promise<AppNotification[]> {
    const user = await requireCurrentUser();
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, is_read, sent_at')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => ({
      id: String(item.id),
      type: item.type,
      title: item.title,
      body: item.body,
      isRead: item.is_read ?? false,
      sentAt: item.sent_at,
    }));
  },

  async markAsRead(notificationId: string) {
    const user = await requireCurrentUser();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
    if (error) throw error;
  },
};
