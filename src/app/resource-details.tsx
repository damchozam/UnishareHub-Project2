
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  title?: string;
  subject?: string;
  category?: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number | string | null;
  storagePath?: string;
  uploaderName?: string;
  createdBy?: string;
  createdAt?: any;
  localUri?: string;
};

const REPORT_REASONS = [
  'Incorrect or misleading information',
  'Unrelated to the subject or module',
  'Inappropriate content',
  'Uploaded by mistake',
];

export default function ResourceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    console.log('RESOURCE DETAILS SCREEN OPENED. ID:', id);

    const loadResource = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'resources', id));

        if (snapshot.exists()) {
          setResource({
            id: snapshot.id,
            ...snapshot.data(),
          } as Resource);
        } else {
          Alert.alert(
            'Resource unavailable',
            'This resource may have been removed.'
          );
        }

        const user = auth.currentUser;

        if (user && snapshot.exists()) {
          const favorite = await getDoc(
            doc(db, 'users', user.uid, 'favorites', id)
          );

          setIsFavorite(favorite.exists());
        }
      } catch (error: any) {
        console.error('Load resource details error:', error);

        Alert.alert(
          'Unable to load resource',
          error?.message || 'Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadResource();
  }, [id]);

  // Add or remove the resource from Favorites.
  const toggleFavorite = async () => {
    const user = auth.currentUser;

    if (!user || !resource) {
      Alert.alert(
        'Login required',
        'Please log in to save favorites.'
      );
      return;
    }

    if (savingFavorite) return;

    setSavingFavorite(true);

    const favoriteRef = doc(
      db,
      'users',
      user.uid,
      'favorites',
      resource.id
    );

    try {
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
    } catch (error: any) {
      console.error('Favorite error:', error);

      Alert.alert(
        'Unable to update favorites',
        error?.message || 'Please try again.'
      );
    } finally {
      setSavingFavorite(false);
    }
  };

  // Open the resource file using a signed Supabase URL.
  const openFile = async () => {
    if (!resource?.storagePath) {
      Alert.alert(
        'File unavailable',
        'No attached file was found.'
      );
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .createSignedUrl(resource.storagePath, 3600);

      if (error || !data?.signedUrl) {
        throw error || new Error('Could not generate file link.');
      }

      await Linking.openURL(data.signedUrl);
    } catch (error: any) {
      console.error('Open file error:', error);

      Alert.alert(
        'Unable to open file',
        error?.message || 'Please try again.'
      );
    }
  };

  // Download the file and save its information in Firestore.
  const downloadFile = async () => {
    const user = auth.currentUser;

    if (!user || !resource?.storagePath) {
      Alert.alert(
        'File unavailable',
        'Please log in and try again.'
      );
      return;
    }

    if (downloading) return;

    setDownloading(true);

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

      const downloadsDirectory = `${directory}downloads/`;

      await FileSystem.makeDirectoryAsync(downloadsDirectory, {
        intermediates: true,
      }).catch(() => {});

      const safeName = (resource.fileName || 'resource')
        .replace(/[<>:"/\\|?*]/g, '_');

      const localUri = `${downloadsDirectory}${resource.id}_${safeName}`;

      const result = await FileSystem.downloadAsync(
        data.signedUrl,
        localUri
      );

      if (result.status !== 200) {
        throw new Error('The file could not be downloaded.');
      }

      await setDoc(
        doc(db, 'users', user.uid, 'downloads', resource.id),
        {
          ...resource,
          localUri: result.uri,
          downloadedAt: serverTimestamp(),
        }
      );

      Alert.alert(
        'Download complete',
        `${resource.fileName || 'Resource'} has been saved to Downloads.`
      );
    } catch (error: any) {
      console.error('Download error:', error);

      Alert.alert(
        'Download failed',
        error?.message || 'Please try again.'
      );
    } finally {
      setDownloading(false);
    }
  };

  // Open the report form.
  const openReportForm = () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        'Login required',
        'Please log in to report a resource.'
      );
      return;
    }

    if (resource?.createdBy === user.uid) {
      Alert.alert(
        'Cannot report your own resource',
        'You cannot report a resource that you uploaded.'
      );
      return;
    }

    setSelectedReason('');
    setReportDescription('');
    setReportModalVisible(true);
  };

  // Submit the report directly without reading the reports collection.
  const submitReport = async () => {
    const user = auth.currentUser;

    if (!user || !resource) {
      Alert.alert(
        'Login required',
        'Please log in and try again.'
      );
      return;
    }

    if (resource.createdBy === user.uid) {
      Alert.alert(
        'Cannot report your own resource',
        'You cannot report a resource that you uploaded.'
      );
      return;
    }

    if (!selectedReason) {
      Alert.alert(
        'Select a reason',
        'Please choose why you are reporting this resource.'
      );
      return;
    }

    if (submittingReport) return;

    setSubmittingReport(true);

    try {
      // A fixed document ID allows only one report per user per resource.
      const reportId = `${resource.id}_${user.uid}`;
      const reportRef = doc(db, 'reports', reportId);

      // Do not call getDoc(reportRef).
      // The Firestore rules intentionally prevent reading reports.
      await setDoc(reportRef, {
        resourceId: resource.id,
        resourceTitle: resource.title || 'Untitled resource',
        resourceOwner: resource.createdBy || '',
        reportedBy: user.uid,
        reporterName: user.displayName || 'Student',
        reporterEmail: user.email || '',
        reason: selectedReason,
        description: reportDescription.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setReportModalVisible(false);
      setSelectedReason('');
      setReportDescription('');

      Alert.alert(
        'Report submitted',
        'Thank you. Your report has been submitted for review.'
      );
    } catch (error: any) {
      console.error('Submit report error:', error);

      Alert.alert(
        'Unable to submit report',
        error?.message || 'Please try again.'
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  // Display an existing formatted size or convert bytes to KB/MB.
  const formatSize = (bytes?: number | string | null) => {
    if (bytes === undefined || bytes === null || bytes === '') {
      return 'Not specified';
    }

    if (typeof bytes === 'string') {
      return bytes;
    }

    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1A2332" />
          <Text style={styles.muted}>
            Loading resource details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!resource) {
    return (
      <SafeAreaView style={styles.container}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>‹  Go back</Text>
        </Pressable>

        <View style={styles.center}>
          <Text style={styles.heading}>Resource not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroSymbol}>▤</Text>
          </View>

          <Text style={styles.category}>
            {(resource.category || 'ACADEMIC RESOURCE').toUpperCase()}
          </Text>

          <Text style={styles.title}>
            {resource.title || 'Untitled resource'}
          </Text>

          <Text style={styles.subject}>
            {resource.subject || 'No subject specified'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.primaryButton}
            onPress={downloadFile}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                ↓  Download
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={openFile}
          >
            <Text style={styles.secondaryButtonText}>
              Open file ↗
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.favoriteButton}
          onPress={toggleFavorite}
          disabled={savingFavorite}
        >
          {savingFavorite ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <Text
              style={[
                styles.favoriteText,
                isFavorite && styles.favoriteActive,
              ]}
            >
              {isFavorite
                ? '♥  Saved to Favorites'
                : '♡  Add to Favorites'}
            </Text>
          )}
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            About this resource
          </Text>

          <Text style={styles.description}>
            {resource.description ||
              'No description has been provided for this resource.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            File information
          </Text>

          <InfoRow
            label="File name"
            value={resource.fileName || 'Not specified'}
          />

          <InfoRow
            label="File type"
            value={resource.fileType || 'Not specified'}
          />

          <InfoRow
            label="File size"
            value={formatSize(resource.fileSize)}
          />

          <InfoRow
            label="Category"
            value={resource.category || 'Not specified'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Shared by
          </Text>

          <View style={styles.uploader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(resource.uploaderName || 'S')
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View>
              <Text style={styles.uploaderName}>
                {resource.uploaderName || 'Student'}
              </Text>

              <Text style={styles.uploaderCaption}>
                UniShareHub contributor
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.reportButton}
          onPress={openReportForm}
        >
          <Text style={styles.reportButtonText}>
            ⚑  Report this resource
          </Text>
        </Pressable>

        <Text style={styles.footer}>
          Shared through UniShareHub
        </Text>
      </ScrollView>

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Report Resource
            </Text>

            <Text style={styles.modalSubtitle}>
              Why are you reporting this resource?
            </Text>

            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={styles.reasonOption}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={styles.radioOuter}>
                  {selectedReason === reason && (
                    <View style={styles.radioInner} />
                  )}
                </View>

                <Text style={styles.reasonText}>
                  {reason}
                </Text>
              </Pressable>
            ))}

            <Text style={styles.inputLabel}>
              Additional details (optional)
            </Text>

            <TextInput
              style={styles.reportInput}
              placeholder="Explain the issue if necessary..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={reportDescription}
              onChangeText={setReportDescription}
              maxLength={500}
            />

            <Text style={styles.characterCount}>
              {reportDescription.length}/500
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setReportModalVisible(false)}
                disabled={submittingReport}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={styles.submitButton}
                onPress={submitReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Submit Report
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 18,
  },
  backText: {
    fontSize: 15,
    color: '#1A2332',
    fontWeight: '600',
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    padding: 23,
    alignItems: 'center',
  },
  heroIcon: {
    height: 70,
    width: 70,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  heroSymbol: {
    fontSize: 34,
    color: '#1A2332',
  },
  category: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  subject: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 7,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: '#1A2332',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1A2332',
    fontWeight: '700',
    fontSize: 13,
  },
  favoriteButton: {
    backgroundColor: '#FFF1F2',
    borderRadius: 11,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  favoriteText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  favoriteActive: {
    color: '#E05260',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    padding: 17,
    marginTop: 17,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 13,
  },
  description: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    flex: 1,
  },
  infoValue: {
    color: '#1A2332',
    fontSize: 12,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  uploader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1A2332',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  uploaderName: {
    color: '#1A2332',
    fontSize: 13,
    fontWeight: '700',
  },
  uploaderCaption: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  muted: {
    color: '#64748B',
    marginTop: 10,
  },
  heading: {
    color: '#1A2332',
    fontSize: 18,
    fontWeight: '700',
  },
  reportButton: {
    marginTop: 18,
    padding: 15,
    borderRadius: 11,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 7,
    marginBottom: 15,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A2332',
  },
  reasonText: {
    flex: 1,
    color: '#1E293B',
    fontSize: 13,
  },
  inputLabel: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  reportInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    color: '#1E293B',
    fontSize: 13,
  },
  characterCount: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 5,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  submitButton: {
    flex: 1.5,
    minHeight: 45,
    borderRadius: 10,
    backgroundColor: '#1A2332',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
