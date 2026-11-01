
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ResourceCard, { type Resource } from '../../components/ResourceCard';

const categories = [
  'All',
  'Lecture Notes',
  'Assignments',
  'Lab Materials',
  'Past Papers',
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ category?: string }>();

  const [resources, setResources] = useState<Resource[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.category && categories.includes(params.category)) {
      setSelectedCategory(params.category);
    } else {
      setSelectedCategory('All');
    }
  }, [params.category]);

  useEffect(() => {
    const loadResources = async () => {
      try {
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

        setResources(items);
      } catch (error) {
        console.error('Search resources error:', error);
        Alert.alert(
          'Unable to load resources',
          'Please check your connection and try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, []);

  const filteredResources = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        resource.category === selectedCategory;

      const searchableText = [
        resource.title,
        resource.subject,
        resource.description,
        resource.category,
        resource.fileName,
        resource.uploaderName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [resources, searchText, selectedCategory]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Search Resources</Text>
      <Text style={styles.subtitle}>
        Find academic materials shared by students.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Search by title, subject or category"
        placeholderTextColor="#94A3B8"
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="none"
        returnKeyType="search"
      />

      <Text style={styles.filterHeading}>Categories</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Available Resources</Text>
        {!loading && (
          <Text style={styles.resultsCount}>
            {filteredResources.length} found
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1A2332" />
          <Text style={styles.loadingText}>Loading resources...</Text>
        </View>
      ) : filteredResources.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptySymbol}>⌕</Text>
          <Text style={styles.emptyTitle}>
            {resources.length === 0
              ? 'No resources available'
              : 'No matching resources'}
          </Text>
          <Text style={styles.emptyText}>
            {resources.length === 0
              ? 'Academic materials shared by students will appear here.'
              : 'Try another search term or choose a different category.'}
          </Text>

          {(searchText.length > 0 || selectedCategory !== 'All') && (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                setSearchText('');
                setSelectedCategory('All');
              }}
            >
              <Text style={styles.clearButtonText}>Clear filters</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resourceList}
        >
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
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
  input: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginTop: 24,
    color: '#0F172A',
  },
  filterHeading: {
    color: '#1A2332',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 11,
  },
  categoryList: {
    gap: 9,
    paddingBottom: 4,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryButtonActive: {
    backgroundColor: '#1A2332',
    borderColor: '#1A2332',
  },
  categoryText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 13,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2332',
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748B',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 10,
  },
  resourceList: {
    paddingBottom: 25,
    gap: 11,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptySymbol: {
    fontSize: 38,
    color: '#94A3B8',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2332',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearButton: {
    marginTop: 17,
    backgroundColor: '#1A2332',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
