
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UploadScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Upload Resource</Text>
      <Text style={styles.subtitle}>Share useful academic materials with your community.</Text>
      <View style={styles.empty}>
        <Text style={styles.symbol}>＋</Text>
        <Text style={styles.emptyTitle}>Share your resources</Text>
        <Text style={styles.emptyText}>The resource upload form will be added in the next stage.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 25, fontWeight: '800', color: '#1A2332', marginTop: 12 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  symbol: {
    width: 58, height: 58, lineHeight: 58, textAlign: 'center',
    overflow: 'hidden', borderRadius: 16, backgroundColor: '#E2E8F0',
    color: '#1A2332', fontSize: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A2332', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8 },
});
