
import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useTheme } from '../../context/ThemeContext';
import ResourceCard, { type Resource } from '../../components/ResourceCard';

type ResourceWithSemester = Resource & {
  semester?: string;
  subject?: string;
  description?: string;
  category?: string;
  fileName?: string;
  uploaderName?: string;
};

const categories = [
  'All',
  'Lecture Notes',
  'Assignments',
  'Lab Materials',
  'Past Papers',
];

const semesters = ['All', '1', '2', '3', '4', '5', '6', '7', '8'];

export default function SearchScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();

  const [resources, setResources] = useState<ResourceWithSemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    params.category || 'All'
  );
  const [selectedSemester, setSelectedSemester] = useState('All');

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
      paddingBottom: 35,
    },
    heading: {
      fontSize: 25,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      color: colors.secondaryText,
      fontSize: 13,
      marginTop: 5,
      marginBottom: 22,
    },
    searchInput: {
      height: 49,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 15,
      color: colors.text,
      fontSize: 14,
    },
    filterHeading: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 24,
      marginBottom: 12,
    },
    horizontalList: {
      gap: 9,
      paddingBottom: 3,
    },
    chip: {
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedChip: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.secondaryText,
      fontSize: 12,
      fontWeight: '600',
    },
    selectedChipText: {
      color: colors.background,
    },
    subjectInput: {
      height: 45,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 9,
      paddingHorizontal: 13,
      color: colors.text,
      fontSize: 13,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 28,
      marginBottom: 14,
    },
    resultsTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    resultsCount: {
      color: colors.secondaryText,
      fontSize: 12,
    },
    clearButton: {
      alignSelf: 'flex-start',
      marginTop: 15,
      paddingVertical: 7,
    },
    clearText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    loader: {
      marginTop: 35,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 25,
      alignItems: 'center',
      marginTop: 5,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    emptyDescription: {
      color: colors.secondaryText,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 8,
    },
    resourceList: {
      gap: 12,
    },
  });

  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

  useEffect(() => {
    let active = true;

    const loadResources = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(collection(db, 'resources'));

        const items = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as ResourceWithSemester[];

        items.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() ?? 0;
          const timeB = b.createdAt?.toMillis?.() ?? 0;
          return timeB - timeA;
        });

        if (active) {
          setResources(items);
        }
      } catch (error) {
        console.error('Search resources error:', error);
        Alert.alert(
          'Unable to load resources',
          'Please check your connection and try again.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadResources();

    return () => {
      active = false;
    };
  }, []);

  const filteredResources = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();
    const subjectText = subject.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesKeyword =
        !searchText ||
        [
          resource.title,
          resource.subject,
          resource.description,
          resource.category,
          resource.fileName,
          resource.uploaderName,
        ].some((value) =>
          String(value || '').toLowerCase().includes(searchText)
        );

      const matchesSubject =
        !subjectText ||
        String(resource.subject || '').toLowerCase().includes(subjectText);

      const matchesCategory =
        selectedCategory === 'All' ||
        resource.category === selectedCategory;

      const matchesSemester =
        selectedSemester === 'All' ||
        String(resource.semester || '') === selectedSemester;

      return (
        matchesKeyword &&
        matchesSubject &&
        matchesCategory &&
        matchesSemester
      );
    });
  }, [
    resources,
    keyword,
    subject,
    selectedCategory,
    selectedSemester,
  ]);

  const clearFilters = () => {
    setKeyword('');
    setSubject('');
    setSelectedCategory('All');
    setSelectedSemester('All');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Search Resources</Text>
        <Text style={styles.subtitle}>
          Find academic materials shared by students.
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search title, module or keywords..."
          placeholderTextColor={colors.mutedText}
          value={keyword}
          onChangeText={setKeyword}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />

        <Text style={styles.filterHeading}>Category</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {categories.map((category) => {
            const selected = selectedCategory === category;

            return (
              <Pressable
                key={category}
                style={[
                  styles.chip,
                  selected && styles.selectedChip,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.selectedChipText,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.filterHeading}>Subject / Module</Text>

        <TextInput
          style={styles.subjectInput}
          placeholder="Enter module name..."
          placeholderTextColor={colors.mutedText}
          value={subject}
          onChangeText={setSubject}
          autoCapitalize="none"
        />

        <Text style={styles.filterHeading}>Semester</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {semesters.map((semester) => {
            const selected = selectedSemester === semester;

            return (
              <Pressable
                key={semester}
                style={[
                  styles.chip,
                  selected && styles.selectedChip,
                ]}
                onPress={() => setSelectedSemester(semester)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.selectedChipText,
                  ]}
                >
                  {semester === 'All' ? 'All' : `Sem ${semester}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearText}>Clear all filters</Text>
        </Pressable>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Resources</Text>
          {!loading && (
            <Text style={styles.resultsCount}>
              {filteredResources.length} found
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={styles.loader}
          />
        ) : filteredResources.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No resources found</Text>
            <Text style={styles.emptyDescription}>
              Try another keyword or change your filters to find available
              academic materials.
            </Text>
          </View>
        ) : (
          <View style={styles.resourceList}>
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource as Resource}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
