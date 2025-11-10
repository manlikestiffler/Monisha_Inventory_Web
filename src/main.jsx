import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { useAuthStore } from './stores/authStore';
import { ThemeProvider } from './components/ThemeProvider.jsx';
import { getInitialTheme, applyTheme } from './utils/theme';

// Initialize the first user check
const initializeApp = async () => {
  try {
    // Check if this is the first user registration
    await useAuthStore.getState().initializeFirstUserCheck();
    
    // Apply initial theme before rendering
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    
    // Proceed with rendering the app
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ThemeProvider defaultTheme="system" storageKey="app-theme">
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Error initializing app:', error);
    
    // Apply fallback theme
    applyTheme('light');
    
    // Render the app anyway, even if initialization failed
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ThemeProvider defaultTheme="system" storageKey="app-theme">
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );
  }
};

// Start the initialization process
initializeApp();
