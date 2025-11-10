import { useTheme as useThemeFromProvider } from '../components/ThemeProvider';

/**
 * A hook that provides access to the theme context
 * @returns {Object} The theme context containing theme state and setTheme function
 */
export const useTheme = () => {
  return useThemeFromProvider();
};