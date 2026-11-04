
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

type Resource = {
  id: string;
  title?: string;
  subject?: string;
  semester?: string;
  category?: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number | null;
  storagePath?: string;
  createdBy?: string;
  uploaderName?: string;
  createdAt?: Timestamp | null;
};

export default function MyUploadsScreen() {
  const { colors } = useTheme();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUploads = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      setResources([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const uploadsQuery = query(
        collection(db, 'resources'),
        where('createdBy', '==', user.uid)
      );

      const snapshot = await getDocs(uploadsQuery);

      const items: Resource[] = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Resource[];

      items.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() ?? 0;
        const dateB = b.createdAt?.toMillis?.() ?? 0;
        return dateB - dateA;
      });

      setResources(items);
    } catch (error) {
      console.error('My Uploads loading error:', error);
      Alert.alert('Error', 'Could not load your uploaded resources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUploads();
    }, [loadUploads])
  );

  const formatDate = (createdAt?: Timestamp | null) => {
    if (!createdAt?.toDate) return 'Date unavailable';

    return createdAt.toDate().toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Size unavailable';

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const deleteUpload = (resource: Resource) => {
    Alert.alert(
      'Delete resource',
      `Are you sure you want to delete "${resource.title || 'this resource'}"? This will remove the uploaded file and its listing.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(resource),
        },
      ]
    );
  };

  const confirmDelete = async (resource: Resource) => {
    const user = auth.currentUser;

    if (!user || resource.createdBy !== user.uid) {
      Alert.alert('Not allowed', 'You can only delete your own uploads.');
      return;
    }

    if (!resource.storagePath) {
      Alert.alert('Error', 'The file location could not be found.');
      return;
    }

    try {
      setDeletingId(resource.id);

      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([resource.storagePath]);

      if (storageError) {
        throw storageError;
      }

      await deleteDoc(doc(db, 'resources', resource.id));

      setResources((current) =>
        current.filter((item) => item.id !== resource.id)
      );

      Alert.alert('Deleted', 'Your resource has been deleted.');
    } catch (error: any) {
      console.error('Delete upload error:', error);
      Alert.alert(
        'Delete failed',
        error?.message || 'Could not delete this resource. Please try again.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openResource = (resource: Resource) => {
    router.push({
      pathname: '/resource-details',
      params: { id: resource.id },
    });
  };

  const renderResource = ({ item }: { item: Resource }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        style={styles.resourceContent}
        onPress={() => openResource(item)}
      >
        <View style={styles.cardTop}>
          <Text
            style={[styles.category, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.category || 'Resource'}
          </Text>

          <Text style={[styles.arrow, { color: colors.text }]}>↗</Text>
        </View>

        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.title || 'Untitled resource'}
        </Text>

        <Text
          style={[styles.subject, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.subject || 'Subject unavailable'}
        </Text>

        {item.semester ? (
          <Text style={[styles.semester, { color: colors.text }]}>
            {item.semester}
          </Text>
        ) : null}

        <View
          style={[
            styles.fileBox,
            { backgroundColor: colors.soft },
          ]}
        >
          <Text style={[styles.fileIcon, { color: colors.text }]}>
            {item.fileType?.toUpperCase() || 'FILE'}
          </Text>

          <View style={styles.fileDetails}>
            <Text
              style={[styles.fileName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.fileName || 'File name unavailable'}
            </Text>

            <Text style={[styles.fileSize, { color: colors.text }]}>
              {formatFileSize(item.fileSize)}
            </Text>
          </View>
        </View>

        <Text style={[styles.date, { color: colors.text }]}>
          Uploaded {formatDate(item.createdAt)}
        </Text>
      </Pressable>

      <View
        style={[
          styles.cardFooter,
          { borderTopColor: colors.border },
        ]}
      >
        <Text style={[styles.footerHint, { color: colors.text }]}>
          Tap to view details
        </Text>

        <Pressable
          onPress={() => deleteUpload(item)}
          disabled={deletingId === item.id}
          style={styles.deleteButton}
        >
          {deletingId === item.id ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <Text style={[styles.deleteText, { color: colors.danger }]}>
              Delete
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={[styles.heading, { color: colors.text }]}>
            My Uploads
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Resources you have shared with other students
          </Text>
        </View>
      </View>

      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.text }]}>
          {resources.length} {resources.length === 1 ? 'resource' : 'resources'}
        </Text>

        <Pressable onPress={loadUploads}>
          <Text style={[styles.refreshText, { color: colors.text }]}>
            Refresh
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your uploads...
          </Text>
        </View>
      ) : resources.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyIcon, { color: colors.text }]}>↑</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No uploads yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            The resources you publish will appear here.
          </Text>

          <Pressable
            style={[styles.uploadButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/(tabs)/upload')}
          >
            <Text style={styles.uploadButtonText}>Upload a Resource</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          renderItem={renderResource}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  backButton: {
    width: 38,
    height: 42,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 36,
    lineHeight: 40,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  resourceContent: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arrow: {
    fontSize: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
  },
  subject: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 5,
  },
  semester: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    padding: 11,
    marginTop: 15,
  },
  fileIcon: {
    fontSize: 11,
    fontWeight: '700',
    width: 48,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  uploadButton: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 9,
    marginTop: 20,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
