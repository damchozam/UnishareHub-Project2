
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
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors } = useTheme();

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
      Alert.alert(
        'Login required',
        'Please log in before uploading a resource.'
      );
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

    // Create the resource document in Firestore.
    const resourceRef = doc(collection(db, 'resources'));
    const uploaderName = user.displayName || 'Student';
    await setDoc(resourceRef, {
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
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        Share a Resource
      </Text>

      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Upload study materials to help other students.
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>
        Resource Title *
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.input,
            borderColor: colors.border,
          },
        ]}
        placeholder="Enter resource title"
        placeholderTextColor={colors.mutedText}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={[styles.label, { color: colors.text }]}>
        Subject / Module *
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.input,
            borderColor: colors.border,
          },
        ]}
        placeholder="Enter module name"
        placeholderTextColor={colors.mutedText}
        value={subject}
        onChangeText={setSubject}
      />

      <Text style={[styles.label, { color: colors.text }]}>
        Semester *
      </Text>

      <View style={styles.semesters}>
        {semesters.map((item) => {
          const selected = semester === item;

          return (
            <Pressable
              key={item}
              onPress={() => setSemester(item)}
              style={[
                styles.semesterButton,
                {
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accent : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.semesterText,
                  {
                    color: selected ? colors.background : colors.text,
                  },
                ]}
              >
                {item.replace('Semester ', 'Sem ')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>
        Category *
      </Text>

      <View style={styles.categories}>
        {categories.map((item) => {
          const selected = category === item;

          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[
                styles.categoryButton,
                {
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accent : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: selected ? colors.background : colors.text,
                  },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>
        Description
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.description,
          {
            color: colors.text,
            backgroundColor: colors.input,
            borderColor: colors.border,
          },
        ]}
        placeholder="Add a short description (optional)"
        placeholderTextColor={colors.mutedText}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.label, { color: colors.text }]}>
        Attach File *
      </Text>

      <Pressable
        style={[
          styles.filePicker,
          {
            borderColor: colors.border,
            backgroundColor: colors.soft,
          },
        ]}
        onPress={chooseFile}
      >
        <Text style={[styles.plus, { color: colors.text }]}>
          ＋
        </Text>

        <Text style={[styles.filePickerTitle, { color: colors.text }]}>
          Add your file
        </Text>

        <Text
          style={[
            styles.filePickerHint,
            { color: colors.secondaryText },
          ]}
        >
          PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX or TXT
        </Text>

        <Text
          style={[
            styles.filePickerHint,
            { color: colors.secondaryText },
          ]}
        >
          Maximum size: 20 MB
        </Text>
      </Pressable>

      {selectedFile && (
        <View
          style={[
            styles.selectedFile,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fileInfo}>
            <Text
              style={[styles.fileName, { color: colors.text }]}
              numberOfLines={2}
            >
              {selectedFile.name}
            </Text>

            <Text
              style={[
                styles.fileSize,
                { color: colors.secondaryText },
              ]}
            >
              {formatFileSize(selectedFile.size)}
            </Text>
          </View>

          <Pressable onPress={() => setSelectedFile(null)}>
            <Text style={[styles.removeText, { color: colors.danger }]}>
              Remove
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[
          styles.publishButton,
          {
            backgroundColor: colors.accent,
          },
          uploading && styles.disabledButton,
        ]}
        onPress={publishResource}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text
            style={[
              styles.publishText,
              { color: colors.background },
            ]}
          >
            Publish Resource
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 9,
    marginTop: 17,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
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
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 2,
  },
  semesterText: {
    fontSize: 12,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  categoryButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
  },
  filePicker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
  },
  plus: {
    fontSize: 35,
    marginBottom: 5,
  },
  filePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  filePickerHint: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
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
  },
  fileSize: {
    fontSize: 12,
    marginTop: 4,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  publishButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 28,
  },
  disabledButton: {
    opacity: 0.6,
  },
  publishText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
