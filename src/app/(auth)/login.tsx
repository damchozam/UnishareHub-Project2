
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';

const COLORS = {
  background: '#F8FAFC',
  navy: '#1A2332',
  text: '#0F172A',
  secondary: '#475569',
  muted: '#94A3B8',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('Missing information', 'Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, cleanEmail, password);

      router.replace('/(tabs)/home');
    } catch (error: any) {
      let message = 'Something went wrong. Please try again.';

      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          message = 'Incorrect email or password.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Check your internet connection.';
          break;
      }

      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Enter your email',
        'Please enter your email address first so we can send a password reset link.'
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      Alert.alert('Email sent', 'Check your inbox for the password reset link.');
    } catch (error: any) {
      Alert.alert('Unable to send email', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>▤</Text>
          </View>

          <Text style={styles.brand}>UNISHARE HUB</Text>
          <Text style={styles.tagline}>Share. Discover. Learn.</Text>

          <View style={styles.heading}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Login to access your academic resources
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. damcho.cst@rub.edu.bt"
              placeholderTextColor={COLORS.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordHeading}>
              <Text style={styles.label}>Password</Text>
              <Pressable onPress={handleForgotPassword}>
                <Text style={styles.forgot}>Forgot?</Text>
              </Pressable>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Your password"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPassword}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Register</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>University Academic Network</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 42, paddingBottom: 24 },
  logo: {
    width: 68, height: 68, borderRadius: 18, backgroundColor: COLORS.navy,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
  },
  logoIcon: { color: COLORS.white, fontSize: 37, fontWeight: '300' },
  brand: {
    color: COLORS.navy, fontSize: 17, fontWeight: '800',
    letterSpacing: 2, textAlign: 'center', marginTop: 16,
  },
  tagline: { color: COLORS.secondary, fontSize: 13, textAlign: 'center', marginTop: 5 },
  heading: { marginTop: 54, marginBottom: 30 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLORS.secondary, fontSize: 14, marginTop: 9 },
  form: { gap: 10 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  input: {
    height: 50, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 9, backgroundColor: COLORS.white, paddingHorizontal: 14,
    fontSize: 14, color: COLORS.text, marginBottom: 15,
  },
  passwordHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgot: { color: COLORS.navy, fontSize: 13, fontWeight: '600' },
  passwordContainer: {
    height: 50, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 9, backgroundColor: COLORS.white, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14, marginBottom: 18,
  },
  passwordInput: { flex: 1, fontSize: 14, color: COLORS.text },
  showPassword: { color: COLORS.secondary, fontSize: 12, fontWeight: '600' },
  loginButton: {
    height: 50, backgroundColor: COLORS.navy, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', marginTop: 5,
  },
  disabledButton: { opacity: 0.65 },
  loginButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  registerText: { color: COLORS.secondary, fontSize: 13 },
  registerLink: { color: COLORS.navy, fontSize: 13, fontWeight: '700' },
  footer: {
    color: COLORS.muted, fontSize: 11, textAlign: 'center',
    marginTop: 'auto', paddingTop: 42,
  },
});
