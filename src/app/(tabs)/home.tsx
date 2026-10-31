
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = [
  { title: 'Lecture Notes', symbol: '▤' },
  { title: 'Assignments', symbol: '▧' },
  { title: 'Lab Materials', symbol: '⌘' },
  { title: 'Past Papers', symbol: '▥' },
];

export default function HomeScreen() {
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
            <Text style={styles.avatarText}>U</Text>
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
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.categorySymbol}>{category.symbol}</Text>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Resources</Text>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptySymbol}>▤</Text>
          </View>
          <Text style={styles.emptyTitle}>Resources will appear here</Text>
          <Text style={styles.emptyDescription}>
            Browse or upload academic materials to start building your resource library.
          </Text>
          <Pressable
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.browseButtonText}>Browse Resources</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#64748B', fontSize: 14 },
  brand: { color: '#1A2332', fontSize: 25, fontWeight: '800', marginTop: 3 },
  avatar: {
    width: 43, height: 43, borderRadius: 22, backgroundColor: '#1A2332',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  description: { color: '#475569', fontSize: 13, marginTop: 8 },
  searchBox: {
    height: 49, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#E2E8F0', borderRadius: 10, marginTop: 24,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
  },
  searchIcon: { fontSize: 24, color: '#64748B', marginRight: 10 },
  searchPlaceholder: { color: '#94A3B8', fontSize: 13 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 30, marginBottom: 14,
  },
  sectionTitle: { color: '#0F172A', fontSize: 17, fontWeight: '700' },
  sectionCaption: { color: '#64748B', fontSize: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    width: '48%', minHeight: 105, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 15, justifyContent: 'center',
  },
  categorySymbol: { color: '#1A2332', fontSize: 25, marginBottom: 9 },
  categoryTitle: { color: '#1A2332', fontSize: 13, fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 22, alignItems: 'center',
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  emptySymbol: { fontSize: 27, color: '#1A2332' },
  emptyTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700', marginTop: 15 },
  emptyDescription: {
    color: '#64748B', fontSize: 12, textAlign: 'center',
    lineHeight: 19, marginTop: 7,
  },
  browseButton: {
    marginTop: 17, paddingHorizontal: 20, paddingVertical: 11,
    backgroundColor: '#1A2332', borderRadius: 8,
  },
  browseButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
