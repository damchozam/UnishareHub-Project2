
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
import { useTheme } from '../context/ThemeContext';

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

function getDocumentFormat(resource: Resource): 'pdf' | 'docx' | 'other' {
  const fileName = (resource.fileName || '').toLowerCase();
  const fileType = (resource.fileType || '').toLowerCase();

  if (
    fileName.endsWith('.pdf') ||
    fileType === 'pdf' ||
    fileType.includes('application/pdf')
  ) {
    return 'pdf';
  }

  if (
    fileName.endsWith('.docx') ||
    fileType === 'docx' ||
    fileType.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml'
    )
  ) {
    return 'docx';
  }

  return 'other';
}

export default function ResourceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [openingFile, setOpeningFile] = useState(false);

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

  const openFile = async () => {
    if (!resource?.storagePath) {
      Alert.alert(
        'File unavailable',
        'No attached file was found.'
      );
      return;
    }

    if (openingFile) return;

    setOpeningFile(true);

    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .createSignedUrl(resource.storagePath, 3600);

      if (error || !data?.signedUrl) {
        throw error || new Error('Could not generate file link.');
      }

      const format = getDocumentFormat(resource);

      // PDF and DOCX are downloaded to a temporary cache location
      // and opened inside UniShareHub.
      if (format === 'pdf' || format === 'docx') {
        const cacheDirectory = FileSystem.cacheDirectory;

        if (!cacheDirectory) {
          throw new Error('Device cache storage is unavailable.');
        }

        const viewerDirectory = `${cacheDirectory}unisharehub-viewer/`;

        await FileSystem.makeDirectoryAsync(viewerDirectory, {
          intermediates: true,
        }).catch(() => {});

        const safeName = (resource.fileName || `resource.${format}`)
          .replace(/[<>:"/\\|?*]/g, '_');

        const localUri = `${viewerDirectory}${resource.id}_${safeName}`;

        await FileSystem.deleteAsync(localUri, {
          idempotent: true,
        }).catch(() => {});

        const result = await FileSystem.downloadAsync(
          data.signedUrl,
          localUri
        );

        if (result.status !== 200) {
          throw new Error('The document could not be prepared for viewing.');
        }

        router.push({
          pathname: '/document-viewer',
          params: {
            uri: result.uri,
            fileName: resource.fileName || `Resource.${format}`,
            fileType: resource.fileType || format,
          },
        });

        return;
      }

      // Other file formats retain their previous external-opening behaviour.
      await Linking.openURL(data.signedUrl);
    } catch (error: any) {
      console.error('Open file error:', error);

      Alert.alert(
        'Unable to open file',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpeningFile(false);
    }
  };

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
      const reportId = `${resource.id}_${user.uid}`;
      const reportRef = doc(db, 'reports', reportId);

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

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
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
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
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
            disabled={openingFile}
          >
            {openingFile ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Open file ↗
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={styles.favoriteButton}
          onPress={toggleFavorite}
          disabled={savingFavorite}
        >
          {savingFavorite ? (
            <ActivityIndicator size="small" color={colors.secondaryText} />
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
            colors={colors}
          />

          <InfoRow
            label="File type"
            value={resource.fileType || 'Not specified'}
            colors={colors}
          />

          <InfoRow
            label="File size"
            value={formatSize(resource.fileSize)}
            colors={colors}
          />

          <InfoRow
            label="Category"
            value={resource.category || 'Not specified'}
            colors={colors}
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
              placeholderTextColor={colors.mutedText}
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
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.accent,
      fontWeight: '600',
    },
    hero: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 23,
      alignItems: 'center',
    },
    heroIcon: {
      height: 70,
      width: 70,
      borderRadius: 20,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
    },
    heroSymbol: {
      fontSize: 34,
      color: colors.accent,
    },
    category: {
      color: colors.secondaryText,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 10,
    },
    subject: {
      color: colors.secondaryText,
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
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: colors.background,
      fontWeight: '700',
      fontSize: 13,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 11,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    favoriteButton: {
      backgroundColor: colors.soft,
      borderRadius: 11,
      padding: 14,
      alignItems: 'center',
      marginTop: 10,
    },
    favoriteText: {
      color: colors.secondaryText,
      fontWeight: '700',
      fontSize: 13,
    },
    favoriteActive: {
      color: '#E05260',
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 17,
      marginTop: 17,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 13,
    },
    description: {
      color: colors.secondaryText,
      fontSize: 13,
      lineHeight: 21,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 15,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: {
      color: colors.secondaryText,
      fontSize: 12,
      flex: 1,
    },
    infoValue: {
      color: colors.text,
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
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '700',
    },
    uploaderName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    uploaderCaption: {
      color: colors.mutedText,
      fontSize: 11,
      marginTop: 3,
    },
    muted: {
      color: colors.secondaryText,
      marginTop: 10,
    },
    heading: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    reportButton: {
      marginTop: 18,
      padding: 15,
      borderRadius: 11,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    reportButtonText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700',
    },
    footer: {
      color: colors.mutedText,
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
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 20,
      maxHeight: '90%',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    modalSubtitle: {
      color: colors.secondaryText,
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
      borderColor: colors.secondaryText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    reasonText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
    },
    inputLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 12,
      marginBottom: 8,
    },
    reportInput: {
      minHeight: 90,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 10,
      padding: 12,
      color: colors.text,
      fontSize: 13,
    },
    characterCount: {
      color: colors.mutedText,
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
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      color: colors.secondaryText,
      fontWeight: '700',
      fontSize: 13,
    },
    submitButton: {
      flex: 1.5,
      minHeight: 45,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: {
      color: colors.background,
      fontWeight: '700',
      fontSize: 13,
    },
  });
}
