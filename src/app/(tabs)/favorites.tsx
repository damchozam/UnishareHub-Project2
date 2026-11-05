
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
import { useTheme } from '../../context/ThemeContext';

export default function FavoritesScreen() {
  const { colors } = useTheme();

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Favorites
      </Text>

      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Keep your useful academic resources close.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading favorites...
          </Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.symbol, { color: colors.text }]}>♡</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No favorites yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
            Tap the heart on any resource to save it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.count, { color: colors.secondaryText }]}>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  symbol: {
    fontSize: 43,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  list: {
    paddingTop: 22,
    paddingBottom: 30,
    gap: 11,
  },
  count: {
    fontSize: 12,
    marginBottom: 3,
  },
});
