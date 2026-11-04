import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { supabase } from '../../lib/supabase';

const categories = [
  'Lecture Notes',
  'Assignments',
  'Lab Materials',
  'Past Papers',
];

const semesters = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
];

const allowedExtensions = [
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export default function UploadScreen() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState(semesters[0]);
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');

  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [uploading, setUploading] = useState(false);

  const chooseFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (!extension || !allowedExtensions.includes(extension)) {
        Alert.alert(
          'Unsupported file',
          'Please select a PDF, Word, PowerPoint, Excel, or TXT file.'
        );
        return;
      }

      if (file.size && file.size > MAX_FILE_SIZE) {
        Alert.alert(
          'File too large',
          'Please select a file smaller than 20 MB.'
        );
        return;
      }

      setSelectedFile(file);
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('Error', 'Could not open the file manager.');
    }
  };

  const publishResource = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Login required', 'Please log in before uploading a resource.');
      return;
    }

    if (!title.trim() || !subject.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter the resource title and subject.'
      );
      return;
    }

    if (!selectedFile) {
      Alert.alert('File required', 'Please select a file to upload.');
      return;
    }

    setUploading(true);

    let uploadedPath: string | null = null;

    try {
      const extension =
        selectedFile.name.split('.').pop()?.toLowerCase() ?? '';

      const safeFileName = selectedFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

      const storagePath = `${user.uid}/${Date.now()}-${safeFileName}`;

      const response = await fetch(selectedFile.uri);

      if (!response.ok) {
        throw new Error('Could not read the selected file.');
      }

      const fileBuffer = await response.arrayBuffer();

      const contentType =
        selectedFile.mimeType || 'application/octet-stream';

      const { error: storageError } = await supabase.storage
        .from('resources')
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: false,
        });

      if (storageError) {
        console.log('SUPABASE UPLOAD ERROR:', {
          message: storageError.message,
          name: storageError.name,
          statusCode: storageError.statusCode,
        });

        throw storageError;
      }

      uploadedPath = storagePath;

      // Create both Firestore documents together.
      const resourceRef = doc(collection(db, 'resources'));
      const notificationRef = doc(collection(db, 'notifications'));

      const uploaderName = user.displayName || 'Student';

      const batch = writeBatch(db);

      batch.set(resourceRef, {
        title: title.trim(),
        subject: subject.trim(),
        semester,
        category,
        description: description.trim(),
        fileName: selectedFile.name,
        fileType: extension,
        fileSize: selectedFile.size ?? null,
        storagePath,
        createdBy: user.uid,
        uploaderName,
        createdAt: serverTimestamp(),
      });

      batch.set(notificationRef, {
        resourceId: resourceRef.id,
        title: title.trim(),
        subject: subject.trim(),
        category,
        uploaderName,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      Alert.alert('Success', 'Your resource has been published.');

      setTitle('');
      setSubject('');
      setSemester(semesters[0]);
      setCategory(categories[0]);
      setDescription('');
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Resource upload error:', error);

      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from('resources')
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error('Storage cleanup error:', cleanupError);
        }
      }

      const message =
        error?.message || 'Something went wrong. Please try again.';

      Alert.alert(
        'Upload failed',
        message.includes('JWT') || message.includes('role')
          ? 'Your Firebase account needs the Supabase authentication claim. We need to configure this before uploading.'
          : message
      );
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Size unavailable';

    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Share a Resource</Text>

      <Text style={styles.subtitle}>
        Upload study materials to help other students.
      </Text>

      <Text style={styles.label}>Resource Title *</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter resource title"
        placeholderTextColor="#888"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Subject / Module *</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter module name"
        placeholderTextColor="#888"
        value={subject}
        onChangeText={setSubject}
      />

      <Text style={styles.label}>Semester *</Text>

      <View style={styles.semesters}>
        {semesters.map((item) => (
          <Pressable
            key={item}
            onPress={() => setSemester(item)}
            style={[
              styles.semesterButton,
              semester === item && styles.semesterSelected,
            ]}
          >
            <Text
              style={[
                styles.semesterText,
                semester === item && styles.semesterTextSelected,
              ]}
            >
              {item.replace('Semester ', 'Sem ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Category *</Text>

      <View style={styles.categories}>
        {categories.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            style={[
              styles.categoryButton,
              category === item && styles.categorySelected,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                category === item && styles.categoryTextSelected,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>

      <TextInput
        style={[styles.input, styles.description]}
        placeholder="Add a short description (optional)"
        placeholderTextColor="#888"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Attach File *</Text>

      <Pressable style={styles.filePicker} onPress={chooseFile}>
        <Text style={styles.plus}>＋</Text>

        <Text style={styles.filePickerTitle}>Add your file</Text>

        <Text style={styles.filePickerHint}>
          PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX or TXT
        </Text>

        <Text style={styles.filePickerHint}>
          Maximum size: 20 MB
        </Text>
      </Pressable>

      {selectedFile && (
        <View style={styles.selectedFile}>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={2}>
              {selectedFile.name}
            </Text>

            <Text style={styles.fileSize}>
              {formatFileSize(selectedFile.size)}
            </Text>
          </View>

          <Pressable onPress={() => setSelectedFile(null)}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[
          styles.publishButton,
          uploading && styles.disabledButton,
        ]}
        onPress={publishResource}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.publishText}>Publish Resource</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 25,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 9,
    marginTop: 17,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#222222',
    backgroundColor: '#FFFFFF',
  },
  description: {
    height: 95,
  },
  semesters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  semesterButton: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 2,
  },
  semesterSelected: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  semesterText: {
    fontSize: 12,
    color: '#444444',
  },
  semesterTextSelected: {
    color: '#FFFFFF',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginBottom: 2,
  },
  categorySelected: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  categoryText: {
    fontSize: 12,
    color: '#444444',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  filePicker: {
    borderWidth: 1.5,
    borderColor: '#BBBBBB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  plus: {
    fontSize: 35,
    color: '#222222',
    marginBottom: 5,
  },
  filePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  filePickerHint: {
    fontSize: 12,
    color: '#777777',
    marginTop: 5,
    textAlign: 'center',
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 13,
    marginTop: 12,
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
  },
  fileSize: {
    fontSize: 12,
    color: '#777777',
    marginTop: 4,
  },
  removeText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: '#222222',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 28,
  },
  disabledButton: {
    opacity: 0.6,
  },
  publishText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});