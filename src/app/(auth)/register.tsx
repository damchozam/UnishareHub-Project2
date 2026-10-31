
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
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const NAVY = '#1A2332';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      Alert.alert('Missing information', 'Please complete all fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Invalid password',
        'Your password must contain at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Your passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(credential.user, {
        displayName: cleanName,
      });

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name: cleanName,
        email: cleanEmail,
        role: 'student',
        createdAt: serverTimestamp(),
      });
      console.log('FIRESTORE PROFILE SAVED:', credential.user.uid);

      Alert.alert('Account created', 'Welcome to UniShareHub!', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (error: any) {
      let message = 'Unable to create your account. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists. Please log in.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          message = 'Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Check your internet connection.';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/Password sign-in is not enabled in Firebase Authentication.';
          break;
        case 'permission-denied':
        case 'firestore/permission-denied':
          message = 'Your account was created, but Firestore denied profile creation. Please check your Firestore security rules.';
          break;
      }

      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
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
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back to Login</Text>
          </Pressable>

          <View style={styles.logo}>
            <Text style={styles.logoText}>▤</Text>
          </View>

          <Text style={styles.brand}>UNISHARE HUB</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join your academic resource-sharing community
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. damcho.cst@rub.edu.bt"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#94A3B8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flexGrow: 1, padding: 24, paddingTop: 20, paddingBottom: 28 },
  back: { color: NAVY, fontSize: 14, fontWeight: '600', marginBottom: 30 },
  logo: {
    width: 58, height: 58, borderRadius: 16, backgroundColor: NAVY,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
  },
  logoText: { color: '#FFFFFF', fontSize: 32 },
  brand: {
    color: NAVY, fontSize: 15, fontWeight: '800',
    letterSpacing: 2, textAlign: 'center', marginTop: 12,
  },
  title: { color: '#0F172A', fontSize: 27, fontWeight: '700', marginTop: 36 },
  subtitle: { color: '#475569', fontSize: 14, marginTop: 8, marginBottom: 25 },
  form: { gap: 9 },
  label: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  input: {
    height: 49, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 9, backgroundColor: '#FFFFFF', paddingHorizontal: 14,
    fontSize: 14, marginBottom: 10, color: '#0F172A',
  },
  button: {
    height: 50, backgroundColor: NAVY, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  disabledButton: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: '#475569', fontSize: 13 },
  footerLink: { color: NAVY, fontSize: 13, fontWeight: '700' },
});
