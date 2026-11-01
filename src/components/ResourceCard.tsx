
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabase';

type Resource = {
  id: string;
  title: string;
  subject?: string;
  category?: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  storagePath?: string;
  createdBy?: string;
  uploaderName?: string;
};

type Props = {
  resource: Resource;
};

export default function ResourceCard({ resource }: Props) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const checkFavorite = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setIsFavorite(false);
      return;
    }

    try {
      const favoriteRef = doc(
        db,
        'users',
        currentUser.uid,
        'favorites',
        resource.id
      );

      const snapshot = await getDoc(favoriteRef);
      setIsFavorite(snapshot.exists());
    } catch (error) {
      console.log('Error checking favorite:', error);
    }
  }, [resource.id]);

  useFocusEffect(
    useCallback(() => {
      checkFavorite();
    }, [checkFavorite])
  );

  // Navigate to the Resource Details screen.
  const openResource = () => {
    console.log('Opening resource:', resource.id);

    router.push({
      pathname: '/resource-details',
      params: { id: resource.id },
    });
  };

  // Add or remove a resource from Favorites.
  const toggleFavorite = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert('Login required', 'Please log in to use Favorites.');
      return;
    }

    setFavoriteLoading(true);

    try {
      const favoriteRef = doc(
        db,
        'users',
        currentUser.uid,
        'favorites',
        resource.id
      );

      if (isFavorite) {
        await deleteDoc(favoriteRef);
        setIsFavorite(false);
      } else {
        await setDoc(favoriteRef, {
          ...resource,
          savedAt: serverTimestamp(),
        });

        setIsFavorite(true);
      }
    } catch (error) {
      console.log('Favorite error:', error);
      Alert.alert('Error', 'Could not update Favorites.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Download the resource to the device.
  const downloadResource = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert('Login required', 'Please log in to download resources.');
      return;
    }

    if (!resource.storagePath) {
      Alert.alert('Error', 'File location is unavailable.');
      return;
    }

    setDownloadLoading(true);

    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .createSignedUrl(resource.storagePath, 3600);

      if (error || !data?.signedUrl) {
        throw error || new Error('Could not generate download link.');
      }

      const directory = FileSystem.documentDirectory;

      if (!directory) {
        throw new Error('Device storage is unavailable.');
      }

      const downloadDirectory = `${directory}downloads/`;

      await FileSystem.makeDirectoryAsync(downloadDirectory, {
        intermediates: true,
      }).catch(() => {});

      const safeFileName = (resource.fileName || 'resource')
        .replace(/[<>:"/\\|?*]/g, '_');

      const localUri =
        `${downloadDirectory}${resource.id}_${safeFileName}`;

      const result = await FileSystem.downloadAsync(
        data.signedUrl,
        localUri
      );

      if (result.status !== 200) {
        throw new Error('Download failed.');
      }

      await setDoc(
        doc(db, 'users', currentUser.uid, 'downloads', resource.id),
        {
          ...resource,
          localUri: result.uri,
          downloadedAt: serverTimestamp(),
        }
      );

      Alert.alert(
        'Download complete',
        'Resource saved to your Downloads.'
      );
    } catch (error) {
      console.log('Download error:', error);
      Alert.alert('Download failed', 'Could not download this resource.');
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Resource information: tap to open details */}
      <Pressable
        style={styles.resourceContent}
        onPress={openResource}
      >
        <View style={styles.topRow}>
          <View style={styles.fileIcon}>
            <Text style={styles.fileIconText}>▤</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {resource.title}
            </Text>

            <Text style={styles.subtitle} numberOfLines={1}>
              {resource.subject ||
                resource.category ||
                'Learning resource'}
            </Text>
          </View>
        </View>

        {resource.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {resource.description}
          </Text>
        ) : null}

        <Text style={styles.detailsHint}>
          Tap to view resource details →
        </Text>
      </Pressable>

      {/* Favorite and Download actions */}
      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.fileInfo}>
            {resource.fileType || 'FILE'}
            {resource.fileSize ? ` · ${resource.fileSize}` : ''}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.favoriteButton}
            onPress={toggleFavorite}
            disabled={favoriteLoading}
          >
            {favoriteLoading ? (
              <ActivityIndicator size="small" color="#222222" />
            ) : (
              <Text style={styles.favoriteIcon}>
                {isFavorite ? '♥' : '♡'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.downloadButton}
            onPress={downloadResource}
            disabled={downloadLoading}
          >
            {downloadLoading ? (
              <ActivityIndicator size="small" color="#222222" />
            ) : (
              <Text style={styles.downloadText}>↓ Download</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  resourceContent: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileIconText: {
    fontSize: 22,
    color: '#333333',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171717',
  },
  subtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666666',
    marginTop: 13,
  },
  detailsHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  fileInfo: {
    fontSize: 11,
    color: '#888888',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 22,
    color: '#D94B5B',
  },
  downloadButton: {
    backgroundColor: '#F1F1F1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 105,
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222222',
  },
});
