
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';

import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const { colors } = useTheme();

  const [name, setName] = useState('Student');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Student');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

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

          setName(profileData.name || user.displayName || 'Student');
          setEmail(profileData.email || user.email || '');
          setRole(profileData.role || 'Student');
        } else {
          setName(user.displayName || 'Student');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setName(user.displayName || 'Student');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const openEditProfile = () => {
    setEditedName(name);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    const trimmedName = editedName.trim();

    if (!user) {
      Alert.alert('Login required', 'Please log in again.');
      return;
    }

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert(
        'Invalid name',
        'Your name must contain at least 2 characters.'
      );
      return;
    }

    if (savingProfile) return;

    setSavingProfile(true);

    try {
      // Update the Firestore user profile.
      await updateDoc(doc(db, 'users', user.uid), {
        name: trimmedName,
      });

      // Update the Firebase Authentication display name.
      await updateProfile(user, {
        displayName: trimmedName,
      });

      setName(trimmedName);
      setEditModalVisible(false);

      Alert.alert(
        'Profile updated',
        'Your name has been updated successfully.'
      );
    } catch (error: any) {
      console.error('Profile update error:', error);

      Alert.alert(
        'Update failed',
        error?.message || 'Unable to update your profile. Please try again.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        My Profile
      </Text>

      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Manage your academic account.
      </Text>

      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {initial}
            </Text>
          )}
        </View>

        {loading ? (
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading profile...
          </Text>
        ) : (
          <>
            <Text style={[styles.name, { color: colors.text }]}>
              {name}
            </Text>

            <Text style={[styles.email, { color: colors.secondaryText }]}>
              {email}
            </Text>

            <View style={[styles.roleBadge, { backgroundColor: colors.soft }]}>
              <Text style={[styles.roleText, { color: colors.secondaryText }]}>
                {role}
              </Text>
            </View>

            <Text style={[styles.note, { color: colors.mutedText }]}>
              Your account information is connected to Firebase.
            </Text>

            <Pressable
              style={[
                styles.editButton,
                { backgroundColor: colors.accent },
              ]}
              onPress={openEditProfile}
            >
              <Text
                style={[
                  styles.editButtonText,
                  { color: colors.background },
                ]}
              >
                Edit Profile
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Account Settings */}
      <Pressable
        style={[
          styles.menuItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => router.push('/settings')}
      >
        <Text style={[styles.menuText, { color: colors.text }]}>
          Account Settings
        </Text>
        <Text style={[styles.arrow, { color: colors.secondaryText }]}>
          ›
        </Text>
      </Pressable>

      {/* My Uploads */}
      <Pressable
        style={[
          styles.menuItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => router.push('/my-uploads')}
      >
        <Text style={[styles.menuText, { color: colors.text }]}>
          My Uploads
        </Text>
        <Text style={[styles.arrow, { color: colors.secondaryText }]}>
          ›
        </Text>
      </Pressable>

      {/* Log Out */}
      <Pressable
        style={[
          styles.logout,
          { borderColor: colors.border },
          loggingOut && styles.disabledButton,
        ]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={[styles.logoutText, { color: colors.text }]}>
            Log Out
          </Text>
        )}
      </Pressable>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Profile
            </Text>

            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
              Update your basic account information.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Full Name
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="words"
              maxLength={60}
              editable={!savingProfile}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Email Address
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.disabledInput,
                {
                  backgroundColor: colors.soft,
                  borderColor: colors.border,
                  color: colors.secondaryText,
                },
              ]}
              value={email}
              editable={false}
            />

            <Text style={[styles.emailNote, { color: colors.mutedText }]}>
              Your registered email address cannot be changed here.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[
                  styles.cancelButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.accent },
                ]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text
                    style={[
                      styles.saveText,
                      { color: colors.background },
                    ]}
                  >
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
  },
  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    marginTop: 25,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 25,
    fontWeight: '700',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  email: {
    fontSize: 13,
    marginTop: 5,
  },
  roleBadge: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 14,
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 15,
  },
  editButton: {
    minWidth: 130,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 18,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  menuItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 17,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 20,
  },
  logout: {
    height: 48,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 7,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
    fontSize: 14,
  },
  disabledInput: {
    opacity: 0.8,
  },
  emailNote: {
    fontSize: 11,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
