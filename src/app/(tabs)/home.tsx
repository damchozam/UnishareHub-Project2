
import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import ResourceCard, { type Resource } from '../../components/ResourceCard';

const categories = [
  { title: 'Lecture Notes', symbol: '▤' },
  { title: 'Assignments', symbol: '▧' },
  { title: 'Lab Materials', symbol: '⌘' },
  { title: 'Past Papers', symbol: '▥' },
];

export default function HomeScreen() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, 'resources'));

      const items = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as Resource[];

      items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() ?? 0;
        const timeB = b.createdAt?.toMillis?.() ?? 0;
        return timeB - timeA;
      });

      setResources(items.slice(0, 5));
    } catch (error) {
      console.error('Home resources error:', error);
      Alert.alert(
        'Unable to load resources',
        'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.brand}>UniShareHub</Text>
          </View>

          <Pressable
            style={styles.avatar}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>
              {(auth.currentUser?.displayName?.[0] || 'U').toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.description}>
          Your academic resources, all in one place.
        </Text>

        <Pressable
          style={styles.searchBox}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchPlaceholder}>
            Search notes, modules and more
          </Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <Text style={styles.sectionCaption}>Explore resources</Text>
        </View>

        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <Pressable
              key={category.title}
              style={styles.categoryCard}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/search',
                  params: { category: category.title },
                })
              }
            >
              <Text style={styles.categorySymbol}>{category.symbol}</Text>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Shared</Text>
          <Pressable onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1A2332"
            style={styles.loader}
          />
        ) : resources.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptySymbol}>▤</Text>
            </View>
            <Text style={styles.emptyTitle}>No resources yet</Text>
            <Text style={styles.emptyDescription}>
              Upload academic materials to start building your resource library.
            </Text>
            <Pressable
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/upload')}
            >
              <Text style={styles.browseButtonText}>Upload a Resource</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resourceList}>
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: '#64748B',
    fontSize: 14,
  },
  brand: {
    color: '#1A2332',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 3,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#1A2332',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    color: '#475569',
    fontSize: 13,
    marginTop: 8,
  },
  searchBox: {
    height: 49,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginTop: 24,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 24,
    color: '#64748B',
    marginRight: 10,
  },
  searchPlaceholder: {
    color: '#94A3B8',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCaption: {
    color: '#64748B',
    fontSize: 12,
  },
  seeAll: {
    color: '#1A2332',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    minHeight: 105,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
    justifyContent: 'center',
  },
  categorySymbol: {
    color: '#1A2332',
    fontSize: 25,
    marginBottom: 9,
  },
  categoryTitle: {
    color: '#1A2332',
    fontSize: 13,
    fontWeight: '600',
  },
  loader: {
    marginTop: 35,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySymbol: {
    fontSize: 27,
    color: '#1A2332',
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 15,
  },
  emptyDescription: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 7,
  },
  browseButton: {
    marginTop: 17,
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: '#1A2332',
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resourceList: {
    gap: 11,
  },
});
