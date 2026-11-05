
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export type Resource = {
  id: string;
  title: string;
  subject?: string;
  category?: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number | string | null;
  storagePath?: string;
  createdBy?: string;
  uploaderName?: string;
  createdAt?: { toMillis?: () => number } | null;
  localUri?: string;
};

type Props = {
  resource: Resource;
  onRemoved?: () => void;
};

function getMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

// Convert stored file size in bytes into a readable format.
function formatFileSize(size?: number | string | null) {
  if (size === null || size === undefined || size === '') {
    return '';
  }

  // Preserve older records where the size was already formatted as text.
  if (typeof size === 'string' && !Number.isFinite(Number(size))) {
    return size;
  }

  const bytes = Number(size);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ResourceCard({ resource, onRemoved }: Props) {
  const { colors, isDark } = useTheme();

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    let mounted = true;

    const checkFavorite = async () => {
      if (!user) return;

      try {
        const favoriteRef = doc(
          db,
          'users',
          user.uid,
          'favorites',
          resource.id
        );

        const favoriteSnap = await getDoc(favoriteRef);

        if (mounted) {
          setIsFavorite(favoriteSnap.exists());
        }
      } catch (error) {
        console.error('Error checking favorite:', error);
      }
    };

    checkFavorite();

    return () => {
      mounted = false;
    };
  }, [resource.id, user]);

  const openDetails = () => {
    router.push({
      pathname: '/resource-details',
      params: { id: resource.id },
    });
  };

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to save favorites.');
      return;
    }

    if (favoriteLoading) return;

    setFavoriteLoading(true);

    try {
      const favoriteRef = doc(
        db,
        'users',
        user.uid,
        'favorites',
        resource.id
      );

      if (isFavorite) {
        await deleteDoc(favoriteRef);
        setIsFavorite(false);
        onRemoved?.();
      } else {
        await setDoc(favoriteRef, {
          resourceId: resource.id,
          title: resource.title,
          subject: resource.subject || '',
          category: resource.category || '',
          fileName: resource.fileName || '',
          fileType: resource.fileType || '',
          fileSize: resource.fileSize ?? null,
          storagePath: resource.storagePath || '',
          createdBy: resource.createdBy || '',
          uploaderName: resource.uploaderName || '',
          createdAt: resource.createdAt || null,
          savedAt: serverTimestamp(),
        });

        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Favorite error:', error);
      Alert.alert('Error', 'Unable to update your favorites.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const downloadResource = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to download resources.');
      return;
    }

    if (!resource.storagePath) {
      Alert.alert('Download unavailable', 'The file location is missing.');
      return;
    }

    if (downloadLoading) return;

    setDownloadLoading(true);

    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .createSignedUrl(resource.storagePath, 60 * 10);

      if (error || !data?.signedUrl) {
        throw error || new Error('Unable to generate download link.');
      }

      const downloadsDirectory = `${FileSystem.documentDirectory}downloads/`;

      const directoryInfo = await FileSystem.getInfoAsync(
        downloadsDirectory
      );

      if (!directoryInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadsDirectory, {
          intermediates: true,
        });
      }

      const originalName = resource.fileName || 'resource';
      const safeName = originalName.replace(/[<>:"/\\|?*]/g, '_');
      const localUri = `${downloadsDirectory}${resource.id}_${safeName}`;

      const downloadResult = await FileSystem.downloadAsync(
        data.signedUrl,
        localUri
      );

      if (downloadResult.status < 200 || downloadResult.status >= 300) {
        throw new Error(
          `File download failed with status ${downloadResult.status}.`
        );
      }

      await setDoc(
        doc(db, 'users', user.uid, 'downloads', resource.id),
        {
          resourceId: resource.id,
          title: resource.title,
          subject: resource.subject || '',
          category: resource.category || '',
          fileName: originalName,
          fileType: resource.fileType || '',
          fileSize: resource.fileSize ?? null,
          storagePath: resource.storagePath || '',
          createdBy: resource.createdBy || '',
          uploaderName: resource.uploaderName || '',
          localUri: downloadResult.uri,
          downloadedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        'Download complete',
        `${originalName} has been saved to your downloads.`,
        [
          { text: 'OK' },
          {
            text: 'View Downloads',
            onPress: () => router.push('/(tabs)/downloads'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Download error:', error);

      Alert.alert(
        'Download failed',
        error?.message || 'Unable to download this resource. Please try again.'
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  const formatDate = () => {
    if (!resource.createdAt?.toMillis) return '';

    try {
      return new Date(resource.createdAt.toMillis()).toLocaleDateString();
    } catch {
      return '';
    }
  };

  const date = formatDate();
  const formattedFileSize = formatFileSize(resource.fileSize);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    category: {
      color: colors.secondaryText,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 7,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    subject: {
      color: colors.secondaryText,
      fontSize: 13,
      marginBottom: 9,
    },
    description: {
      color: colors.secondaryText,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 12,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 11,
    },
    metadata: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
    },
    metadataText: {
      color: colors.mutedText,
      fontSize: 11,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 13,
    },
    actionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
    },
    actionText: {
      color: colors.secondaryText,
      fontSize: 12,
      fontWeight: '600',
    },
    favoriteText: {
      color: isFavorite ? '#E05268' : colors.secondaryText,
    },
    fileBadge: {
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 6,
    },
    fileBadgeText: {
      color: colors.text,
      fontSize: 10,
      fontWeight: '700',
    },
  });

  return (
    <Pressable style={styles.card} onPress={openDetails}>
      <Text style={styles.category}>
        {resource.category || 'RESOURCE'}
      </Text>

      <Text style={styles.title}>{resource.title}</Text>

      {!!resource.subject && (
        <Text style={styles.subject}>{resource.subject}</Text>
      )}

      {!!resource.description && (
        <Text style={styles.description} numberOfLines={3}>
          {resource.description}
        </Text>
      )}

      <View style={styles.metadata}>
        <View style={styles.fileBadge}>
          <Text style={styles.fileBadgeText}>
            {(resource.fileType || 'FILE').toUpperCase()}
          </Text>
        </View>

        {!!formattedFileSize && (
          <Text style={styles.metadataText}>{formattedFileSize}</Text>
        )}

        {!!date && <Text style={styles.metadataText}>{date}</Text>}
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <View style={styles.actionGroup}>
          <Pressable
            style={styles.actionButton}
            onPress={(event) => {
              event.stopPropagation();
              toggleFavorite();
            }}
            disabled={favoriteLoading}
          >
            {favoriteLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.secondaryText}
              />
            ) : (
              <>
                <Text style={{ fontSize: 17 }}>
                  {isFavorite ? '♥' : '♡'}
                </Text>
                <Text style={[styles.actionText, styles.favoriteText]}>
                  {isFavorite ? 'Saved' : 'Save'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={(event) => {
              event.stopPropagation();
              downloadResource();
            }}
            disabled={downloadLoading}
          >
            {downloadLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.secondaryText}
              />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>↓</Text>
                <Text style={styles.actionText}>Download</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.actionText}>View details →</Text>
      </View>
    </Pressable>
  );
}
