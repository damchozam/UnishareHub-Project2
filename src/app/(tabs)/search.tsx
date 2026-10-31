
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Search Resources</Text>
      <Text style={styles.subtitle}>Find academic materials shared by students.</Text>
      <TextInput
        style={styles.input}
        placeholder="Search by title, module or category"
        placeholderTextColor="#94A3B8"
      />
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Find your next resource</Text>
        <Text style={styles.emptyText}>Your search results will appear here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 25, fontWeight: '800', color: '#1A2332', marginTop: 12 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 8 },
  input: {
    height: 50, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14,
    marginTop: 24, color: '#0F172A',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A2332' },
  emptyText: { fontSize: 13, color: '#64748B', marginTop: 8 },
});
