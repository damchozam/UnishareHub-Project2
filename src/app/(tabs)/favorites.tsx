
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Favorites</Text>
      <Text style={styles.subtitle}>Keep your useful academic resources close.</Text>
      <View style={styles.empty}>
        <Text style={styles.symbol}>♡</Text>
        <Text style={styles.emptyTitle}>No favorites yet</Text>
        <Text style={styles.emptyText}>Resources you save will appear here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 25, fontWeight: '800', color: '#1A2332', marginTop: 12 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  symbol: { fontSize: 43, color: '#1A2332' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A2332', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#64748B', marginTop: 8 },
});
