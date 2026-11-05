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
import { File } from 'expo-file-system';
import { auth, db } from '../../lib/firebase';
import type { Resource } from '../../components/ResourceCard';
import { useTheme } from '../../context/ThemeContext';

type DownloadedResource = Resource & {
  localUri?: string;
  downloadedAt?: any;
};

function getMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',

    // Use a broader type for DOCX to improve Android app compatibility.
    docx: '*/*',

    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
  };

  return mimeTypes[extension || ''] || '*/*';
}

export default function DownloadsScreen() {
  const { colors } = useTheme();

  const [downloads, setDownloads] = useState<DownloadedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

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

  if (openingId) return;

  setOpeningId(item.id);

  try {
    const info = await FileSystem.getInfoAsync(item.localUri);

    if (!info.exists) {
      Alert.alert(
        'File not found',
        'The local file may have been deleted. Please download it again.'
      );
      return;
    }

    const originalName = item.fileName || 'resource';
    const extension = originalName.split('.').pop()?.toLowerCase();

    // Use Android's native document-opening flow for DOCX.
    if (extension === 'docx') {
      const documentFile = new File(item.localUri);

      await documentFile.preview({
        title: originalName,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      return;
    }

    // Keep the existing working sharing behaviour for other files.
    const available = await Sharing.isAvailableAsync();

    if (!available) {
      Alert.alert(
        'Sharing unavailable',
        'This device cannot open files through the sharing menu.'
      );
      return;
    }

    await Sharing.shareAsync(item.localUri, {
      dialogTitle: `Open ${originalName}`,
      mimeType: getMimeType(originalName),
    });
  } catch (error: any) {
    console.error('Open downloaded file error:', error);

    Alert.alert(
      'Unable to open file',
      error?.message || 'Please try again.'
    );
  } finally {
    setOpeningId(null);
  }
};

  const removeDownload = (item: DownloadedResource) => {
    Alert.alert(
      'Remove download?',
      'This will remove the downloaded file from this device and your Downloads list.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Downloads
      </Text>

      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Your saved academic resources, available on this device.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading downloads...
          </Text>
        </View>
      ) : downloads.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptySymbol, { color: colors.text }]}>↓</Text>

          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No downloads yet
          </Text>

          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
            Tap the download icon on any resource to save it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.count, { color: colors.secondaryText }]}>
            {downloads.length} downloaded{' '}
            {downloads.length === 1 ? 'resource' : 'resources'}
          </Text>

          {downloads.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.fileIcon,
                  { backgroundColor: colors.soft },
                ]}
              >
                <Text style={[styles.fileIconText, { color: colors.text }]}>
                  ▤
                </Text>
              </View>

              <View style={styles.info}>
                <Text
                  style={[styles.resourceTitle, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {item.title || 'Untitled resource'}
                </Text>

                <Text
                  style={[styles.subject, { color: colors.secondaryText }]}
                  numberOfLines={1}
                >
                  {item.subject || 'No subject'}
                </Text>

                <Text
                  style={[styles.fileName, { color: colors.mutedText }]}
                  numberOfLines={1}
                >
                  {item.fileName || 'Downloaded file'}
                </Text>

                <Text
                  style={[styles.localLabel, { color: colors.secondaryText }]}
                >
                  Saved on this device
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.openButton,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={() => openDownloadedFile(item)}
                  disabled={openingId !== null}
                >
                  {openingId === item.id ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.background}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.openText,
                        { color: colors.background },
                      ]}
                    >
                      Open
                    </Text>
                  )}
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
  emptySymbol: {
    fontSize: 45,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  fileIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconText: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  subject: {
    fontSize: 12,
    marginTop: 3,
  },
  fileName: {
    fontSize: 10,
    marginTop: 4,
  },
  localLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  actions: {
    alignItems: 'center',
    marginLeft: 5,
    gap: 5,
  },
  openButton: {
    minWidth: 48,
    minHeight: 31,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openText: {
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