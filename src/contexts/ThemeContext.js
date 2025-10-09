// contexts/ThemeContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Appearance, ActivityIndicator, View } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { lightTheme, darkTheme } from '../constants/colors'; 

const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@user_theme_preference'; 

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        
        if (savedTheme === 'dark') {
          setIsDarkMode(true);
        }
        
      } catch (error) {
        console.error('Failed to load theme from storage.', error);
        // On error, it will just use the default state, which is light mode.
      } finally {
        setIsLoadingTheme(false);
      }
    };

    loadThemePreference();
  }, []);

  const toggleTheme = useCallback(async () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme to storage.', error);
    }
  }, [isDarkMode]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  if (isLoadingTheme) {
  const systemDark = Appearance.getColorScheme() === 'dark';
  const fallbackTheme = systemDark ? darkTheme : lightTheme;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: fallbackTheme.background }}>
      <ActivityIndicator color={fallbackTheme.primary} />
    </View>
  );
}
  const value = {
    isDarkMode,
    theme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};