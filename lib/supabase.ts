import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// expo-secure-store has no web implementation (getValueWithKeyAsync doesn't
// exist on web), so session persistence needs a web-safe fallback there.
const authStorageAdapter =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      storage: authStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export async function runSupabaseConnectionTest() {
  console.log('[Supabase] EXPO_PUBLIC_SUPABASE_URL =', supabaseUrl ?? 'undefined');
  console.log('[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY present =', Boolean(supabaseAnonKey));
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.log('[Supabase] connection test failed:', error.message);
      return;
    }
    console.log('[Supabase] connection test passed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('[Supabase] connection test exception:', message);
  }
}
