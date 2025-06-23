// contexts/ThemeContext.js

import React, { createContext, useState, useContext } from 'react';
import { lightTheme, darkTheme } from '../constants/colors';

// Create the context
const ThemeContext = createContext();

// Create a provider component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Function to toggle between light and dark mode
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // Select the theme object based on the state
  const theme = isDarkMode ? darkTheme : lightTheme;

  // The value provided to consuming components
  const value = {
    isDarkMode,
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useTheme = () => useContext(ThemeContext);