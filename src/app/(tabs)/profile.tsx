
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';

import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const { colors } = useTheme();

  const [name, setName] = useState('Student');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Student');
  const [programme, setProgramme] = useState('');
  const [semester, setSemester] = useState('');

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedProgramme, setEditedProgramme] = useState('');
  const [editedSemester, setEditedSemester] = useState('');

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
          setProgramme(profileData.programme || '');
          setSemester(
            profileData.semester !== undefined &&
            profileData.semester !== null
              ? String(profileData.semester)
              : ''
          );
        } else {
          setName(user.displayName || 'Student');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Unable to load your profile information.');
        setName(user.displayName || 'Student');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const openEditProfile = () => {
    setEditedName(name);
    setEditedProgramme(programme);
    setEditedSemester(semester);
    setEditModalVisible(true);
  };

const handleSaveProfile = async () => {
  const user = auth.currentUser;

  const trimmedName = editedName.trim();
  const trimmedProgramme = editedProgramme.trim();
  const trimmedSemester = editedSemester.trim();

  if (!user) {
    Alert.alert('Login required', 'Please log in again.');
    return;
  }

  if (!trimmedName || trimmedName.length < 2) {
    Alert.alert(
      'Invalid name',
      'Please enter a name containing at least 2 characters.'
    );
    return;
  }

  if (!trimmedProgramme) {
    Alert.alert('Programme required', 'Please enter your academic programme.');
    return;
  }

  if (!/^[1-8]$/.test(trimmedSemester)) {
    Alert.alert(
      'Invalid semester',
      'Please enter a semester number between 1 and 8.'
    );
    return;
  }

  if (savingProfile) return;

  setSavingProfile(true);

  try {
    const userRef = doc(db, 'users', user.uid);

    // Creates the user document if missing, or updates existing fields.
    await setDoc(
      userRef,
      {
        name: trimmedName,
        programme: trimmedProgramme,
        semester: trimmedSemester,
        email: user.email || email,
      },
      { merge: true }
    );

    // Update Firebase Auth display name as well.
    try {
      await updateProfile(user, {
        displayName: trimmedName,
      });
    } catch (authError) {
      console.warn('Firebase Auth display name update:', authError);
    }

    setName(trimmedName);
    setProgramme(trimmedProgramme);
    setSemester(trimmedSemester);

    setEditModalVisible(false);

    Alert.alert(
      'Profile updated',
      'Your profile information has been saved successfully.'
    );
  } catch (error: any) {
    console.error('Profile update error:', error);

    Alert.alert(
      'Update failed',
      error?.message || 'Unable to save your profile. Please try again.'
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

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.input,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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

              <View style={styles.academicInfo}>
                <View style={styles.academicRow}>
                  <Text style={[styles.infoLabel, { color: colors.mutedText }]}>
                    Programme
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {programme || 'Not provided'}
                  </Text>
                </View>

                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

                <View style={styles.academicRow}>
                  <Text style={[styles.infoLabel, { color: colors.mutedText }]}>
                    Semester
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {semester ? `Semester ${semester}` : 'Not provided'}
                  </Text>
                </View>
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
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingProfile) setEditModalVisible(false);
        }}
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
              Update your personal and academic information.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Full Name
            </Text>

            <TextInput
              style={inputStyle}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="words"
              maxLength={60}
              editable={!savingProfile}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Programme
            </Text>

            <TextInput
              style={inputStyle}
              value={editedProgramme}
              onChangeText={setEditedProgramme}
              placeholder="e.g. BE Information Technology"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="words"
              maxLength={100}
              editable={!savingProfile}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Semester
            </Text>

            <TextInput
              style={inputStyle}
              value={editedSemester}
              onChangeText={(value) =>
                setEditedSemester(value.replace(/[^0-9]/g, '').slice(0, 1))
              }
              placeholder="Enter semester (1–8)"
              placeholderTextColor={colors.mutedText}
              keyboardType="number-pad"
              maxLength={1}
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
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 25,
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
  academicInfo: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 5,
  },
  academicRow: {
    paddingVertical: 10,
    gap: 5,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
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
    marginBottom: 12,
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
