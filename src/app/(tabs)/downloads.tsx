import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { auth, db } from '../../lib/firebase';
import type { Resource } from '../../components/ResourceCard';

type DownloadedResource = Resource & {
  localUri?: string;
  downloadedAt?: any;
};

export default function DownloadsScreen() {
  const [downloads, setDownloads] = useState<DownloadedResource[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDownloads = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      setDownloads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, 'users', user.uid, 'downloads')
      );

      const items = snapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
      })) as DownloadedResource[];

      setDownloads(items);
    } catch (error: any) {
      console.error('Load downloads error:', error);
      Alert.alert(
        'Unable to load downloads',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, [loadDownloads])
  );

  const openDownloadedFile = async (item: DownloadedResource) => {
    if (!item.localUri) {
      Alert.alert(
        'File unavailable',
        'This download does not have a saved file on this device.'
      );
      return;
    }

    try {
      const info = await FileSystem.getInfoAsync(item.localUri);

      if (!info.exists) {
        Alert.alert(
          'File not found',
          'The local file may have been deleted. Please download it again.'
        );
        return;
      }

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          'Sharing unavailable',
          'This device cannot open the file through the sharing menu.'
        );
        return;
      }

      await Sharing.shareAsync(item.localUri, {
        dialogTitle: item.fileName || 'Open downloaded resource',
      });
    } catch (error: any) {
      console.error('Open downloaded file error:', error);
      Alert.alert(
        'Unable to open file',
        error?.message || 'Please try again.'
      );
    }
  };

  const removeDownload = (item: DownloadedResource) => {
    Alert.alert(
      'Remove download?',
      'This will remove the downloaded file from this device and your Downloads list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
              if (item.localUri) {
                await FileSystem.deleteAsync(item.localUri, {
                  idempotent: true,
                });
              }

              await deleteDoc(
                doc(db, 'users', user.uid, 'downloads', item.id)
              );

              setDownloads((current) =>
                current.filter((download) => download.id !== item.id)
              );
            } catch (error: any) {
              console.error('Remove download error:', error);
              Alert.alert(
                'Unable to remove download',
                error?.message || 'Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Downloads</Text>
      <Text style={styles.subtitle}>
        Your saved academic resources, available on this device.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1A2332" />
          <Text style={styles.loadingText}>Loading downloads...</Text>
        </View>
      ) : downloads.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptySymbol}>↓</Text>
          <Text style={styles.emptyTitle}>No downloads yet</Text>
          <Text style={styles.emptyText}>
            Tap the download icon on any resource to save it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.count}>
            {downloads.length} downloaded{' '}
            {downloads.length === 1 ? 'resource' : 'resources'}
          </Text>

          {downloads.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>▤</Text>
              </View>

              <View style={styles.info}>
                <Text style={styles.resourceTitle} numberOfLines={2}>
                  {item.title || 'Untitled resource'}
                </Text>

                <Text style={styles.subject} numberOfLines={1}>
                  {item.subject || 'No subject'}
                </Text>

                <Text style={styles.fileName} numberOfLines={1}>
                  {item.fileName || 'Downloaded file'}
                </Text>

                <Text style={styles.localLabel}>Saved on this device</Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={styles.openButton}
                  onPress={() => openDownloadedFile(item)}
                >
                  <Text style={styles.openText}>Open</Text>
                </Pressable>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeDownload(item)}
                >
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            </View>
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
  emptySymbol: {
    fontSize: 45,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  fileIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconText: {
    fontSize: 22,
    color: '#1A2332',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  subject: {
    color: '#475569',
    fontSize: 12,
    marginTop: 3,
  },
  fileName: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 4,
  },
  localLabel: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  actions: {
    alignItems: 'center',
    marginLeft: 5,
    gap: 5,
  },
  openButton: {
    backgroundColor: '#1A2332',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  openText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  removeText: {
    color: '#E05260',
    fontSize: 23,
  },
});