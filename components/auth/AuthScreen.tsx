import { useState } from 'react';
import { router } from 'expo-router';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../layout/Screen';
import { useThemeTokens } from '../../lib/theme';
import { useAppStore } from '../../store/app-store';

export function AuthScreen() {
  const theme = useThemeTokens();
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>>({});

  const validateSignup = () => {
    const nextErrors: Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>> = {};
    const trimmedName = name.trim();
    if (trimmedName.length < 2) nextErrors.name = 'Name must be at least 2 characters';
    if (!email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address';
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAuth = async () => {
    try {
      if (mode === 'login') await signIn(email, password);
      else {
        if (!validateSignup()) return;
        await signUp(email.trim(), password, name.trim());
        setMode('login');
        return;
      }
      setAuthenticated(true);
      router.replace('/');
    } catch (error) {
      if (mode === 'signup') return;
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Sign in failed', message);
    }
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
        <View style={{ flex: 1 }}>
          <View style={{ marginBottom: 40 }}>
            <View style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ height: 44, width: 44, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 20 }}>🍳</Text>
              </View>
              <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '700' }}>RecipeOS</Text>
            </View>
            <Text style={{ color: theme.textPrimary, fontSize: 30, fontWeight: '700', lineHeight: 36 }}>
              {mode === 'login' ? 'Welcome back!' : 'Create your account'}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, marginTop: 8 }}>
              {mode === 'login' ? 'Sign in to continue cooking' : 'Start your cooking journey'}
            </Text>
          </View>

          <View style={{ gap: 14 }}>
            {mode === 'signup' ? (
              <View style={{ gap: 6 }}>
                <View style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <User size={18} color={theme.textMuted} />
                  <TextInput
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                    }}
                    placeholder="What should we call you?"
                    placeholderTextColor={theme.textMuted}
                    style={{ flex: 1, color: theme.textPrimary, fontSize: 15 }}
                  />
                </View>
                <Text style={{ color: errors.name ? '#E53E3E' : theme.textMuted, fontSize: 12 }}>
                  {errors.name ?? 'e.g. Chef Tunde, Mama Ngozi, Alex'}
                </Text>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <View style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Mail size={18} color={theme.textMuted} />
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                  }}
                  placeholder="Email address"
                  placeholderTextColor={theme.textMuted}
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 15 }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {mode === 'signup' && errors.email ? <Text style={{ color: '#E53E3E', fontSize: 12 }}>{errors.email}</Text> : null}
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Lock size={18} color={theme.textMuted} />
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                    if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="Password"
                  placeholderTextColor={theme.textMuted}
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 15 }}
                />
                <Pressable onPress={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff size={18} color={theme.textMuted} /> : <Eye size={18} color={theme.textMuted} />}
                </Pressable>
              </View>
              {mode === 'signup' && errors.password ? <Text style={{ color: '#E53E3E', fontSize: 12 }}>{errors.password}</Text> : null}
            </View>

            {mode === 'signup' ? (
              <View style={{ gap: 6 }}>
                <View style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Lock size={18} color={theme.textMuted} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined }));
                    }}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Confirm Password"
                    placeholderTextColor={theme.textMuted}
                    style={{ flex: 1, color: theme.textPrimary, fontSize: 15 }}
                  />
                  <Pressable onPress={() => setShowConfirmPassword((value) => !value)}>
                    {showConfirmPassword ? <EyeOff size={18} color={theme.textMuted} /> : <Eye size={18} color={theme.textMuted} />}
                  </Pressable>
                </View>
                {errors.confirmPassword ? <Text style={{ color: '#E53E3E', fontSize: 12 }}>{errors.confirmPassword}</Text> : null}
              </View>
            ) : null}

            {mode === 'login' ? (
              <Pressable>
                <Text style={{ alignSelf: 'flex-end', color: theme.primary, fontSize: 13, fontWeight: '500' }}>Forgot password?</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={handleAuth} style={{ marginTop: 8, height: 52, borderRadius: 14, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ marginVertical: 28, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '500' }}>or continue with</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          </View>

          <Pressable onPress={signInWithGoogle} style={{ height: 50, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '500' }}>Continue with Google</Text>
          </Pressable>

          <View style={{ marginTop: 'auto', paddingTop: 32, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</Text>
            <Pressable onPress={() => setMode((value) => (value === 'login' ? 'signup' : 'login'))}>
              <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>{mode === 'login' ? 'Sign Up' : 'Sign In'}</Text>
            </Pressable>
          </View>

          {mode === 'signup' ? (
            <Text style={{ marginTop: 16, color: theme.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
              By creating an account, you agree to our Terms and Privacy Policy.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
