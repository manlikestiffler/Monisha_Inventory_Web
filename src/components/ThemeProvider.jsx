import React, { createContext, useContext, useEffect, useState } from 'react';
import { getInitialTheme, applyTheme } from '../utils/theme';

const ThemeContext = createContext();

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'app-theme',
  ...props
}) {
  const [theme, setTheme] = useState(() => {
    // Use the theme utility to get initial theme
    if (defaultTheme === 'system') {
      return getInitialTheme();
    }
    
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem(storageKey);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    
    return defaultTheme === 'dark' || defaultTheme === 'light' ? defaultTheme : 'light';
  });

  useEffect(() => {
    // Apply theme using utility function
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes if theme is set to system
  useEffect(() => {
    if (defaultTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        const systemTheme = e.matches ? 'dark' : 'light';
        setTheme(systemTheme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [defaultTheme]);

  const value = {
    theme,
    setTheme: (newTheme) => {
      if (newTheme === 'dark' || newTheme === 'light') {
        setTheme(newTheme);
      }
    },
  };

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};