import type { PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/app-store';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { session, loading, profile } = useAuth();
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#E8A020" />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;
  if (!onboardingComplete && !profile?.onboarding_completed) {
    return <Redirect href="/onboarding" />;
  }

  return <>{children}</>;
}
