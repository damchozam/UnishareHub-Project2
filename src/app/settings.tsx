
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const { theme, isDark, colors, setTheme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </Pressable>

        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Account Settings
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Personalize your UniShareHub experience.
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
          APPEARANCE
        </Text>

        <View
          style={[
            styles.settingCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Dark Mode
            </Text>
            <Text
              style={[
                styles.settingDescription,
                { color: colors.secondaryText },
              ]}
            >
              Use a darker appearance throughout the app.
            </Text>
          </View>

          <Switch
            value={isDark}
            onValueChange={(enabled) =>
              setTheme(enabled ? 'dark' : 'light')
            }
            trackColor={{
              false: '#CBD5E1',
              true: '#64748B',
            }}
            thumbColor={isDark ? '#F8FAFC' : '#FFFFFF'}
          />
        </View>

        <View
          style={[
            styles.settingCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Current Theme
            </Text>
            <Text
              style={[
                styles.settingDescription,
                { color: colors.secondaryText },
              ]}
            >
              Your selected appearance.
            </Text>
          </View>

          <Text style={[styles.themeValue, { color: colors.accent }]}>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
          ABOUT
        </Text>

        <View
          style={[
            styles.aboutCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.aboutTitle, { color: colors.text }]}>
            UniShareHub
          </Text>
          <Text
            style={[styles.aboutDescription, { color: colors.secondaryText }]}
          >
            A Cross-Platform Student Resource Sharing Application.
          </Text>
          <Text style={[styles.version, { color: colors.mutedText }]}>
            Project II
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  backButton: {
    marginRight: 14,
    paddingRight: 5,
  },
  backText: {
    fontSize: 34,
    lineHeight: 38,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 10,
  },
  settingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 17,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  themeValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  aboutCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 25,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  aboutDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  version: {
    fontSize: 11,
    marginTop: 12,
  },
});
