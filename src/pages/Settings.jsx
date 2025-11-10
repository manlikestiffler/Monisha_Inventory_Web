import { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useAuthStore } from '../stores/authStore';

const SettingsSection = ({ title, children }) => (
  <Card>
    <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
    {children}
  </Card>
);

const Settings = () => {
  const { user, updateProfile } = useAuthStore();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
    language: 'en',
    notifications: {
      email: true,
      browser: true,
      lowStock: true,
      orderUpdates: true
    },
    theme: 'light'
  });

  const [loading, setLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(profileData);
      // Show success message
    } catch (error) {
      console.error('Error updating profile:', error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <SettingsSection title="Profile Settings">
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Email"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              label="Avatar URL"
              value={profileData.avatar}
              onChange={(e) => setProfileData(prev => ({ ...prev, avatar: e.target.value }))}
            />
            <Select
              label="Language"
              value={profileData.language}
              onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
                { value: 'ta', label: 'Tamil' }
              ]}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </SettingsSection>

      {/* Notification Settings */}
      <SettingsSection title="Notification Preferences">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-500">Receive email updates about your account</p>
            </div>
            <input
              type="checkbox"
              checked={profileData.notifications.email}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                notifications: { ...prev.notifications, email: e.target.checked }
              }))}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Browser Notifications</h3>
              <p className="text-sm text-gray-500">Get real-time notifications in your browser</p>
            </div>
            <input
              type="checkbox"
              checked={profileData.notifications.browser}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                notifications: { ...prev.notifications, browser: e.target.checked }
              }))}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Low Stock Alerts</h3>
              <p className="text-sm text-gray-500">Get notified when inventory is running low</p>
            </div>
            <input
              type="checkbox"
              checked={profileData.notifications.lowStock}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                notifications: { ...prev.notifications, lowStock: e.target.checked }
              }))}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Order Updates</h3>
              <p className="text-sm text-gray-500">Get notified about order status changes</p>
            </div>
            <input
              type="checkbox"
              checked={profileData.notifications.orderUpdates}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                notifications: { ...prev.notifications, orderUpdates: e.target.checked }
              }))}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
              <p className="text-sm text-gray-500">Receive push notifications on your device</p>
            </div>
            <input
              type="checkbox"
              checked={profileData.notifications.push || false}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                notifications: { ...prev.notifications, push: e.target.checked }
              }))}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </SettingsSection>

      {/* Appearance Settings */}
      <SettingsSection title="Appearance">
        <div className="space-y-4">
          <Select
            label="Theme"
            value={profileData.theme}
            onChange={(e) => setProfileData(prev => ({ ...prev, theme: e.target.value }))}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System Default' }
            ]}
          />
        </div>
      </SettingsSection>

      {/* Export Data */}
      <SettingsSection title="Data Export">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Export your data in different formats
          </p>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => {}}>
              Export as CSV
            </Button>
            <Button variant="outline" onClick={() => {}}>
              Export as Excel
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Danger Zone">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-600">Delete Account</h3>
              <p className="text-sm text-gray-500">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <Button variant="danger" onClick={() => {}}>
              Delete Account
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default Settings; 