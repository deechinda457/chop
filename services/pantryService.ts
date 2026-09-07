import type { PantryItemRecord } from '../store/app-store';
import { supabase } from '../lib/supabase';
import { isUuid, requireCurrentUser } from './serviceUtils';

function computeDaysLeft(expiryDate?: string | null) {
  if (!expiryDate) return 0;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return 0;
  const diff = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

function mapDbStatus(status?: string | null): PantryItemRecord['status'] {
  if (status === 'expired') return 'danger';
  if (status === 'low') return 'warning';
  return 'safe';
}

function mapAppStatus(status: PantryItemRecord['status']) {
  if (status === 'danger') return 'expired';
  if (status === 'warning') return 'low';
  return 'available';
}

function mapConfidence(confidence?: string | null): PantryItemRecord['confidence'] {
  if (confidence === 'half') return 'half';
  if (confidence === 'low') return 'low';
  return 'full';
}

function formatExpiry(daysLeft: number) {
  if (daysLeft <= 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  return `In ${daysLeft} days`;
}

export const pantryService = {
  async list() {
    const user = await requireCurrentUser();
    const { data, error } = await supabase.from('pantry_items').select('*').eq('user_id', user.id).order('name');
    if (error) throw error;
    return (data ?? []).map(
      (row) =>
        ({
          id: row.id,
          name: row.name,
          emoji: '',
          quantityValue: Number(row.quantity ?? 1),
          unit: row.unit,
          expiry: formatExpiry(computeDaysLeft(row.expiry_date)),
          daysLeft: computeDaysLeft(row.expiry_date),
          status: mapDbStatus(row.status),
          category: row.category,
          storageLocation: row.storage_location,
          confidence: mapConfidence(row.confidence),
        }) satisfies PantryItemRecord
    );
  },

  async upsert(item: PantryItemRecord) {
    const user = await requireCurrentUser();
    const payload = {
      user_id: user.id,
      name: item.name,
      quantity: item.quantityValue,
      unit: item.unit,
      expiry_date: item.daysLeft > 0 ? new Date(Date.now() + item.daysLeft * 86400000).toISOString().slice(0, 10) : null,
      status: mapAppStatus(item.status),
      category: item.category,
      storage_location: item.storageLocation,
      confidence: item.confidence,
    };
    const query = isUuid(item.id)
      ? supabase.from('pantry_items').upsert({ id: item.id, ...payload })
      : supabase.from('pantry_items').insert(payload);
    const { error } = await query;
    if (error) throw error;
  },

  async remove(itemId: string) {
    const user = await requireCurrentUser();
    if (!isUuid(itemId)) return;
    const { error } = await supabase.from('pantry_items').delete().eq('user_id', user.id).eq('id', itemId);
    if (error) throw error;
  },
};
