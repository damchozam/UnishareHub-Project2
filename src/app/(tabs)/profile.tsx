
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      <Text style={styles.subtitle}>Manage your academic account.</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <Text style={styles.name}>Your Name</Text>
        <Text style={styles.email}>Your academic email</Text>
        <Text style={styles.note}>Your profile details will be loaded from Firebase after authentication is connected.</Text>
      </View>

      <Pressable
        style={styles.settings}
        onPress={() => Alert.alert('Settings', 'Profile settings will be added in the next stage.')}
      >
        <Text style={styles.settingsText}>Account Settings</Text>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={styles.logout}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.logoutText}>Return to Login</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 25, fontWeight: '800', color: '#1A2332', marginTop: 12 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 8 },
  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 22, alignItems: 'center', marginTop: 25,
  },
  avatar: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#1A2332',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 25, fontWeight: '700' },
  name: { color: '#0F172A', fontSize: 17, fontWeight: '700', marginTop: 14 },
  email: { color: '#64748B', fontSize: 13, marginTop: 5 },
  note: { color: '#94A3B8', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 15 },
  settings: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 17, marginTop: 20,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  settingsText: { color: '#1A2332', fontSize: 14, fontWeight: '600' },
  arrow: { color: '#64748B', fontSize: 20 },
  logout: {
    height: 48, borderRadius: 9, borderWidth: 1, borderColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  logoutText: { color: '#1A2332', fontSize: 14, fontWeight: '600' },
});
