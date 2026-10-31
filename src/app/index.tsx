
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
    });

    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1A2332" />
      </View>
    );
  }

  return user
    ? <Redirect href="/(tabs)/home" />
    : <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
