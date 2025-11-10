import { useState, useEffect } from 'react';

/**
 * A hook that detects if the current theme is dark mode
 * @returns {boolean} True if dark mode is active, false otherwise
 */
export const useThemeDetector = () => {
  const [isDark, setIsDark] = useState(() => {
    // Check if dark class is on the document element
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Function to check if dark mode is active
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Set up a mutation observer to watch for class changes on the document element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    // Clean up the observer when the component unmounts
    return () => observer.disconnect();
  }, []);

  return isDark;
};