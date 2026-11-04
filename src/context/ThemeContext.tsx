
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = '@unisharehub_theme';

const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1A2332',
  secondaryText: '#64748B',
  mutedText: '#64748B',
  secondary: '#64748B',
  muted: '#64748B',
  border: '#E2E8F0',
  input: '#FFFFFF',
  soft: '#F1F5F9',
  accent: '#1A2332',
  danger: '#DC2626',
};

const darkColors = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  secondaryText: '#CBD5E1',
  mutedText: '#CBD5E1',
  secondary: '#CBD5E1',
  muted: '#CBD5E1',
  border: '#334155',
  input: '#1E293B',
  soft: '#334155',
  accent: '#E2E8F0',
  danger: '#F87171',
};

type ThemeContextType = {
  theme: ThemeMode;
  colors: typeof lightColors;
  isDark: boolean;
  isReady: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsReady(true);
      }
    };

    loadTheme();
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = async () => {
    await setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        isDark: theme === 'dark',
        isReady,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
