
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../context/ThemeContext';

export default function DocumentViewerScreen() {
  const { colors } = useTheme();

  const params = useLocalSearchParams<{
    uri?: string;
    fileName?: string;
  }>();

  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri;
  const fileName = Array.isArray(params.fileName)
    ? params.fileName[0]
    : params.fileName;

  const [opening, setOpening] = useState(false);

  const openDocument = async () => {
    if (!uri) {
      Alert.alert('Error', 'Document location is missing.');
      return;
    }

    try {
      setOpening(true);

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          'Not available',
          'Document sharing is not available on this device.'
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle: `Open ${fileName || 'document'}`,
      });
    } catch (error: any) {
      console.error('Document opening error:', error);

      Alert.alert(
        'Unable to open document',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    openDocument();
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/downloads');
            }
          }}
          style={[styles.backButton, { backgroundColor: colors.soft }]}
        >
          <Text style={[styles.backText, { color: colors.text }]}>←</Text>
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {fileName || 'Document'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
            Open with another app
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {opening ? (
          <>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={[styles.message, { color: colors.secondaryText }]}>
              Preparing your document...
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.message, { color: colors.text }]}>
              Your document is ready.
            </Text>

            <Pressable
              style={[styles.openButton, { backgroundColor: colors.accent }]}
              onPress={openDocument}
            >
              <Text style={[styles.openButtonText, { color: colors.background }]}>
                Open Document
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 25,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  message: {
    fontSize: 14,
    marginTop: 15,
    textAlign: 'center',
  },
  openButton: {
    marginTop: 22,
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 9,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
