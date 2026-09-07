import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { AuthProvider } from '../context/AuthContext';
import { StatusBarBridge } from '../components/theme/StatusBarBridge';
import { runSupabaseConnectionTest } from '../lib/supabase';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    void runSupabaseConnectionTest();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBarBridge />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile/index" />
            <Stack.Screen name="profile/edit" />
            <Stack.Screen name="profile/password" />
            <Stack.Screen name="profile/diet-type" />
            <Stack.Screen name="profile/allergies" />
            <Stack.Screen name="profile/health-goals" />
            <Stack.Screen name="profile/measurement-units" />
            <Stack.Screen name="profile/language" />
            <Stack.Screen name="planner" />
            <Stack.Screen name="recipe/[id]" />
            <Stack.Screen name="cook/[id]" />
            <Stack.Screen name="plans/index" />
            <Stack.Screen name="onboarding/index" />
            <Stack.Screen name="completion/[id]" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
