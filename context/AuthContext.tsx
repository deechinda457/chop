import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { clearRemoteRecipeIdMap } from '../services/serviceUtils';
import { recipeService } from '../services/recipeService';
import { userService } from '../services/userService';
import { useAppStore } from '../store/app-store';

export type UserProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
  onboarding_completed?: boolean | null;
  [key: string]: unknown;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string) {
  const profile = await userService.getProfile();
  return { ...profile, id: userId } as UserProfile;
}

function slugifyName(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'user';
}

function generateUsername(name: string) {
  const baseUsername = slugifyName(name);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${baseUsername}_${suffix}`;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return '';
}

function getErrorStatus(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status);
    return Number.isNaN(status) ? undefined : status;
  }
  return undefined;
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) return String(error.code);
  return undefined;
}

function isStaleSessionError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  return message.includes('does not exist') || message.includes('jwt') || code === '401' || status === 401;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const hydrateRemoteState = useAppStore((state) => state.hydrateRemoteState);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // supabase-js broadcasts 'SIGNED_IN' both for a real interactive login and for
    // recovering an already-valid session from storage on startup (GoTrueClient's
    // _recoverAndRefresh), so the event name alone can't distinguish "just reloaded
    // the page" from "the user just signed in". Gate the redirect on bootstrap having
    // already finished, so only a genuine post-load sign-in forces navigation.
    let initialSyncComplete = false;

    const clearSessionState = () => {
      clearRemoteRecipeIdMap();
      setSession(null);
      setUser(null);
      setProfile(null);
      setAuthenticated(false);
    };

    const handleStaleSession = async () => {
      try {
        await supabase.auth.signOut();
      } catch {
        // Session is already invalid.
      }
      if (!mounted) return;
      clearSessionState();
      setLoading(false);
      router.replace('/auth/login');
    };

      const syncAuthenticatedUser = async (nextSession: Session, options?: { redirectOnComplete?: boolean }) => {
        setSession(nextSession);
        setUser(nextSession.user);
        setAuthenticated(true);

      const nextProfile = await loadProfile(nextSession.user.id);
      if (!mounted) return;

      setProfile(nextProfile);
      if (nextProfile?.onboarding_completed) {
        completeOnboarding();
        await hydrateRemoteState();
        void recipeService.backfillMissingRecipeImages().catch(() => undefined);
        if (mounted && options?.redirectOnComplete) router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    };

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        if (!data.session?.user) {
          clearSessionState();
          setLoading(false);
          return;
        }

        await syncAuthenticatedUser(data.session, { redirectOnComplete: false });
        if (mounted) setLoading(false);
      } catch (error) {
        if (isStaleSessionError(error)) {
          await handleStaleSession();
          return;
        }
        if (!mounted) return;
        clearSessionState();
        setLoading(false);
      }
    };

    void bootstrap().finally(() => {
      initialSyncComplete = true;
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void (async () => {
        try {
          if (!nextSession?.user) {
            if (!mounted) return;
            clearSessionState();
            setLoading(false);
            router.replace('/auth/login');
            return;
          }

          if (mounted) setLoading(true);
          await syncAuthenticatedUser(nextSession, { redirectOnComplete: initialSyncComplete && event === 'SIGNED_IN' });
          if (mounted) setLoading(false);
        } catch (error) {
          if (isStaleSessionError(error)) {
            await handleStaleSession();
            return;
          }
          if (!mounted) return;
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [completeOnboarding, hydrateRemoteState, setAuthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      signUp: async (email, password, name) => {
        try {
          const normalizedUsername = generateUsername(name);
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                username: normalizedUsername,
              },
            },
          });
          if (error) throw error;
          if (!data.session) {
            Alert.alert('Check your email', 'Check your email to confirm your account');
          }
        } catch (error) {
          if (isStaleSessionError(error)) {
            await supabase.auth.signOut().catch(() => undefined);
            clearRemoteRecipeIdMap();
            setSession(null);
            setUser(null);
            setProfile(null);
            setAuthenticated(false);
            router.replace('/auth/login');
          }
          const message = getErrorMessage(error) || 'Unable to create your account right now.';
          Alert.alert('Sign up failed', message);
          throw error;
        }
      },
      signIn: async (email, password) => {
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } catch (error) {
          if (isStaleSessionError(error)) {
            await supabase.auth.signOut().catch(() => undefined);
            clearRemoteRecipeIdMap();
            setSession(null);
            setUser(null);
            setProfile(null);
            setAuthenticated(false);
            router.replace('/auth/login');
          }
          throw error;
        }
      },
      signInWithGoogle: async () => {
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: 'recipeos://auth/callback',
            },
          });
          if (error) throw error;
        } catch (error) {
          if (isStaleSessionError(error)) {
            await supabase.auth.signOut().catch(() => undefined);
            clearRemoteRecipeIdMap();
            setSession(null);
            setUser(null);
            setProfile(null);
            setAuthenticated(false);
            router.replace('/auth/login');
          }
          throw error;
        }
      },
      signOut: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        } catch (error) {
          if (!isStaleSessionError(error)) throw error;
        } finally {
          clearRemoteRecipeIdMap();
          setSession(null);
          setUser(null);
          setProfile(null);
          setAuthenticated(false);
          router.replace('/auth/login');
        }
      },
      refreshProfile: async () => {
        if (!user) return null;
        const nextProfile = await loadProfile(user.id);
        setProfile(nextProfile);
        return nextProfile;
      },
      updateProfile: async (updates) => {
        if (!user) return;
        try {
          const nextProfile = await userService.updateProfile(updates);
          setProfile((current) => ({ ...(current ?? { id: user.id }), ...nextProfile }));
        } catch (error) {
          if (isStaleSessionError(error)) {
            await supabase.auth.signOut().catch(() => undefined);
            clearRemoteRecipeIdMap();
            setSession(null);
            setUser(null);
            setProfile(null);
            setAuthenticated(false);
            router.replace('/auth/login');
          }
          throw error;
        }
      },
    }),
    [loading, profile, session, setAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
