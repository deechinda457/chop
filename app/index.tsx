import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/app-store';

export default function IndexRoute() {
  const { session, loading, profile } = useAuth();
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);

  if (loading) return null;
  if (!session) return <Redirect href="/auth/login" />;
  if (!onboardingComplete && !profile?.onboarding_completed) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}
