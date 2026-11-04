
import { useCallback, useEffect, useState } from 'react';
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
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import ResourceCard, { type Resource } from '../../components/ResourceCard';

const categories = [
  { title: 'Lecture Notes', symbol: '▤' },
  { title: 'Assignments', symbol: '▧' },
  { title: 'Lab Materials', symbol: '⌘' },
  { title: 'Past Papers', symbol: '▥' },
];

function BellIcon({ color }: { color: string }) {
  return (
    <View style={bellStyles.container}>
      <View style={[bellStyles.body, { borderColor: color }]} />
      <View style={[bellStyles.base, { backgroundColor: color }]} />
      <View style={[bellStyles.clapper, { backgroundColor: color }]} />
    </View>
  );
}

const bellStyles = StyleSheet.create({
  container: {
    width: 23,
    height: 25,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  body: {
    width: 17,
    height: 17,
    borderWidth: 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 0,
  },
  base: {
    width: 21,
    height: 2,
    borderRadius: 2,
  },
  clapper: {
    position: 'absolute',
    bottom: 0,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});

export default function HomeScreen() {
  const { colors } = useTheme();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
      paddingBottom: 30,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    greeting: {
      color: colors.secondaryText,
      fontSize: 14,
    },
    brand: {
      color: colors.text,
      fontSize: 25,
      fontWeight: '800',
      marginTop: 3,
    },
    notificationButton: {
      width: 43,
      height: 43,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationBadge: {
      position: 'absolute',
      top: -4,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#DC2626',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    notificationBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '700',
    },
    avatar: {
      width: 43,
      height: 43,
      borderRadius: 22,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: colors.background,
      fontSize: 17,
      fontWeight: '700',
    },
    description: {
      color: colors.secondaryText,
      fontSize: 13,
      marginTop: 8,
    },
    searchBox: {
      height: 49,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginTop: 24,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchIcon: {
      fontSize: 24,
      color: colors.secondaryText,
      marginRight: 10,
    },
    searchPlaceholder: {
      color: colors.mutedText,
      fontSize: 13,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 30,
      marginBottom: 14,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    sectionCaption: {
      color: colors.secondaryText,
      fontSize: 12,
    },
    seeAll: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    categoryCard: {
      width: '48%',
      minHeight: 105,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      justifyContent: 'center',
    },
    categorySymbol: {
      color: colors.accent,
      fontSize: 25,
      marginBottom: 9,
    },
    categoryTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    loader: {
      marginTop: 35,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      alignItems: 'center',
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptySymbol: {
      fontSize: 27,
      color: colors.accent,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 15,
    },
    emptyDescription: {
      color: colors.secondaryText,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 7,
    },
    browseButton: {
      marginTop: 17,
      paddingHorizontal: 20,
      paddingVertical: 11,
      backgroundColor: colors.accent,
      borderRadius: 8,
    },
    browseButtonText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '600',
    },
    resourceList: {
      gap: 11,
    },
  });

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'resources'));

      const items = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as Resource[];

      items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() ?? 0;
        const timeB = b.createdAt?.toMillis?.() ?? 0;
        return timeB - timeA;
      });

      setResources(items.slice(0, 5));
    } catch (error) {
      console.error('Home resources error:', error);
      Alert.alert(
        'Unable to load resources',
        'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    let lastViewedTime = 0;
    let notificationItems: any[] = [];

    const updateUnreadCount = () => {
      const unread = notificationItems.filter((item) => {
        if (item.createdBy === user.uid) return false;

        const createdTime = item.createdAt?.toMillis?.() ?? 0;
        return createdTime > lastViewedTime;
      });

      setUnreadCount(unread.length);
    };

    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const lastViewed =
          snapshot.data()?.lastViewedNotificationsAt;

        lastViewedTime = lastViewed?.toMillis?.() ?? 0;
        updateUnreadCount();
      },
      (error) => {
        console.error('Notification read-time error:', error);
      }
    );

    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        notificationItems = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        updateUnreadCount();
      },
      (error) => {
        console.error('Notification count error:', error);
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeNotifications();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.brand}>UniShareHub</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
              hitSlop={10}
            >
              <BellIcon color={colors.accent} />

              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.avatar}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.avatarText}>
                {(auth.currentUser?.displayName?.[0] || 'U').toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.description}>
          Your academic resources, all in one place.
        </Text>

        <Pressable
          style={styles.searchBox}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchPlaceholder}>
            Search notes, modules and more
          </Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <Text style={styles.sectionCaption}>Explore resources</Text>
        </View>

        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <Pressable
              key={category.title}
              style={styles.categoryCard}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/search',
                  params: { category: category.title },
                })
              }
            >
              <Text style={styles.categorySymbol}>{category.symbol}</Text>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Shared</Text>
          <Pressable onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={styles.loader}
          />
        ) : resources.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptySymbol}>▤</Text>
            </View>
            <Text style={styles.emptyTitle}>No resources yet</Text>
            <Text style={styles.emptyDescription}>
              Upload academic materials to start building your resource library.
            </Text>
            <Pressable
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/upload')}
            >
              <Text style={styles.browseButtonText}>Upload a Resource</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resourceList}>
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
