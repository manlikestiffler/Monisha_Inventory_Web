/**
 * Theme Management Utility
 * Provides functions for theme initialization, application, and toggling
 */

const STORAGE_KEY = 'app-theme';

/**
 * Get the initial theme based on localStorage or system preference
 * @returns {'dark' | 'light'} The initial theme
 */
export function getInitialTheme() {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

/**
 * Apply the theme to the document
 * Sets both data-theme attribute and class for Tailwind compatibility
 * @param {'dark' | 'light'} theme - The theme to apply
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  
  // Set data-theme attribute (canonical source)
  root.setAttribute('data-theme', theme);
  
  // Update class for Tailwind compatibility
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  
  // Store preference
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Toggle between dark and light themes
 * @returns {'dark' | 'light'} The new theme after toggling
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
}

/**
 * Get the current theme
 * @returns {'dark' | 'light'} The current theme
 */
export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * Listen for system theme changes and apply automatically
 * @param {boolean} enable - Whether to enable system theme sync
 * @returns {Function} Cleanup function to remove listener
 */
export function syncWithSystemTheme(enable = true) {
  if (!enable || !window.matchMedia) return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e) => {
    const systemTheme = e.matches ? 'dark' : 'light';
    applyTheme(systemTheme);
  };

  mediaQuery.addEventListener('change', handleChange);
  
  return () => mediaQuery.removeEventListener('change', handleChange);
}
