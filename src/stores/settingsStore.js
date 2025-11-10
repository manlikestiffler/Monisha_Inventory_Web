import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultSettings = {
  language: 'en',
  theme: 'system',
  notifications: {
    email: true,
    browser: true,
    lowStock: true,
    orderUpdates: true
  },
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h'
};

export const useSettingsStore = create(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },
      
      resetSettings: () => {
        set({ settings: defaultSettings });
      }
    }),
    {
      name: 'settings-storage'
    }
  )
); 