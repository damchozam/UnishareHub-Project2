import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import ResourceCard, { type Resource } from '../../components/ResourceCard';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, 'users', user.uid, 'favorites')
      );

      const items = snapshot.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })) as Resource[];

      setFavorites(items);
    } catch (error: any) {
      console.error('Load favorites error:', error);
      Alert.alert(
        'Unable to load favorites',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Favorites</Text>
      <Text style={styles.subtitle}>
        Keep your useful academic resources close.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1A2332" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.symbol}>♡</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>
            Tap the heart on any resource to save it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.count}>
            {favorites.length} saved{' '}
            {favorites.length === 1 ? 'resource' : 'resources'}
          </Text>

          {favorites.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onRemoved={loadFavorites}
            />
          ))}
        </ScrollView>
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  symbol: {
    fontSize: 43,
    color: '#1A2332',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2332',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  list: {
    paddingTop: 22,
    paddingBottom: 30,
    gap: 11,
  },
  count: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 3,
  },
});