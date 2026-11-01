
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';

export default function ProfileScreen() {
  const [name, setName] = useState('Student');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Student');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      setEmail(user.email || '');

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const profileData = userSnapshot.data();

          setName(
            profileData.name || user.displayName || 'Student'
          );
          setEmail(profileData.email || user.email || '');
          setRole(profileData.role || 'Student');
        } else {
          // Fallback for accounts without a Firestore profile.
          setName(user.displayName || 'Student');
        }
      } catch (error) {
        console.error('Error loading profile:', error);

        // Still show Firebase Authentication details if Firestore fails.
        setName(user.displayName || 'Student');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              await signOut(auth);
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(
                'Logout Failed',
                'Something went wrong. Please try again.'
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      <Text style={styles.subtitle}>
        Manage your academic account.
      </Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading profile...</Text>
        ) : (
          <>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
            <Text style={styles.note}>
              Your account information is connected to Firebase.
            </Text>
          </>
        )}
      </View>

      <Pressable
        style={styles.settings}
        onPress={() =>
          Alert.alert(
            'Account Settings',
            'Additional profile settings will be available in a future update.'
          )
        }
      >
        <Text style={styles.settingsText}>Account Settings</Text>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={[styles.logout, loggingOut && styles.disabledButton]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#1A2332" />
        ) : (
          <Text style={styles.logoutText}>Log Out</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#1A2332',
    marginTop: 12,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 8,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    alignItems: 'center',
    marginTop: 25,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1A2332',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
  },
  name: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  email: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 5,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  roleText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 14,
  },
  note: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 15,
  },
  settings: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 17,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  settingsText: {
    color: '#1A2332',
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    color: '#64748B',
    fontSize: 20,
  },
  logout: {
    height: 48,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#1A2332',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
