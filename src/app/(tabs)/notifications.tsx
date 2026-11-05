
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';

type NotificationItem = {
  id: string;
  resourceId: string;
  title: string;
  subject?: string;
  category?: string;
  uploaderName?: string;
  createdBy: string;
  createdAt?: {
    toDate?: () => Date;
    toMillis?: () => number;
  };
};

function BellIcon({
  color,
}: {
  color: string;
}) {
  return (
    <View style={bellStyles.bellIcon}>
      <View
        style={[
          bellStyles.bellBody,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          bellStyles.bellBase,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          bellStyles.bellClapper,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const bellStyles = StyleSheet.create({
  bellIcon: {
    width: 23,
    height: 25,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bellBody: {
    width: 17,
    height: 17,
    borderWidth: 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 0,
  },
  bellBase: {
    width: 21,
    height: 2,
    borderRadius: 2,
  },
  bellClapper: {
    position: 'absolute',
    bottom: 0,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});

function formatNotificationDate(
  timestamp?: NotificationItem['createdAt']
) {
  if (!timestamp?.toDate) return 'Recently';

  const date = timestamp.toDate();
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotificationsScreen() {
  const { colors } = useTheme();

  const styles = createStyles(colors);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingResource, setOpeningResource] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    // Mark notifications as viewed when the screen opens.
    updateDoc(doc(db, 'users', user.uid), {
      lastViewedNotificationsAt: serverTimestamp(),
    }).catch((error) => {
      console.error('Unable to update notification read time:', error);
    });

    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as NotificationItem[];

        setNotifications(
          items.filter((item) => item.createdBy !== user.uid)
        );

        setLoading(false);
      },
      (error) => {
        console.error('Notifications loading error:', error);
        setLoading(false);

        Alert.alert(
          'Unable to load notifications',
          'Please check your internet connection and try again.'
        );
      }
    );

    return unsubscribe;
  }, []);

  const openResource = async (resourceId: string) => {
    if (!resourceId || openingResource) return;

    try {
      setOpeningResource(resourceId);

      const resourceRef = doc(db, 'resources', resourceId);
      const resourceSnapshot = await getDoc(resourceRef);

      if (!resourceSnapshot.exists()) {
        Alert.alert(
          'Resource unavailable',
          'This resource may have been removed by its uploader.'
        );
        return;
      }

      router.push({
        pathname: '/resource-details',
        params: { id: resourceId },
      });
    } catch (error) {
      console.error('Unable to open notification resource:', error);

      Alert.alert(
        'Unable to open resource',
        'Please try again in a moment.'
      );
    } finally {
      setOpeningResource(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Notifications
            </Text>

            <Text style={styles.headerSubtitle}>
              Updates about newly shared resources
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <BellIcon color={colors.accent} />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.accent}
            />

            <Text style={styles.loadingText}>
              Loading notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <BellIcon color={colors.secondaryText} />
            </View>

            <Text style={styles.emptyTitle}>
              You're all caught up
            </Text>

            <Text style={styles.emptyDescription}>
              When other students share new academic resources, their updates
              will appear here.
            </Text>

            <Pressable
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.browseButtonText}>
                Explore Resources
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Recent Activity
              </Text>

              <Text style={styles.sectionCount}>
                {notifications.length} updates
              </Text>
            </View>

            <View style={styles.notificationList}>
              {notifications.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.notificationCard,
                    pressed && styles.notificationCardPressed,
                  ]}
                  onPress={() => openResource(item.resourceId)}
                  disabled={openingResource !== null}
                >
                  <View style={styles.documentIconContainer}>
                    <Text style={styles.documentIcon}>▤</Text>
                  </View>

                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationHeading}>
                      New resource shared
                    </Text>

                    <Text
                      style={styles.notificationTitle}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    {!!item.subject && (
                      <Text style={styles.notificationSubject}>
                        {item.subject}
                      </Text>
                    )}

                    <View style={styles.notificationMeta}>
                      {!!item.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {item.category}
                          </Text>
                        </View>
                      )}

                      <Text style={styles.notificationDate}>
                        {formatNotificationDate(item.createdAt)}
                      </Text>
                    </View>

                    <Text style={styles.uploaderText}>
                      Shared by {item.uploaderName || 'A student'}
                    </Text>
                  </View>

                  <View style={styles.trailingContainer}>
                    {openingResource === item.resourceId ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.secondaryText}
                      />
                    ) : (
                      <Text style={styles.chevron}>›</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      padding: 20,
      paddingBottom: 35,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 30,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    backArrow: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 34,
      marginTop: -3,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
    },
    headerSubtitle: {
      color: colors.secondaryText,
      fontSize: 11,
      marginTop: 4,
    },
    headerIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      minHeight: 300,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.secondaryText,
      fontSize: 13,
      marginTop: 12,
    },
    emptyContainer: {
      flex: 1,
      minHeight: 380,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    emptyIconContainer: {
      width: 76,
      height: 76,
      borderRadius: 24,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    emptyDescription: {
      color: colors.secondaryText,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'center',
      marginTop: 9,
      maxWidth: 280,
    },
    browseButton: {
      marginTop: 22,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 9,
      backgroundColor: colors.accent,
    },
    browseButtonText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: '700',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionCount: {
      color: colors.secondaryText,
      fontSize: 11,
    },
    notificationList: {
      gap: 12,
    },
    notificationCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    notificationCardPressed: {
      opacity: 0.7,
    },
    documentIconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    documentIcon: {
      color: colors.accent,
      fontSize: 23,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeading: {
      color: colors.secondaryText,
      fontSize: 11,
      fontWeight: '600',
    },
    notificationTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 5,
      lineHeight: 20,
    },
    notificationSubject: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 4,
    },
    notificationMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    categoryBadge: {
      backgroundColor: colors.soft,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 6,
    },
    categoryBadgeText: {
      color: colors.secondaryText,
      fontSize: 10,
      fontWeight: '600',
    },
    notificationDate: {
      color: colors.mutedText,
      fontSize: 10,
    },
    uploaderText: {
      color: colors.secondaryText,
      fontSize: 11,
      marginTop: 9,
    },
    trailingContainer: {
      width: 20,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginLeft: 6,
    },
    chevron: {
      color: colors.mutedText,
      fontSize: 26,
    },
  });
}
