import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiSettings, 
  FiTrash2, 
  FiAlertTriangle, 
  FiInfo, 
  FiRefreshCw, 
  FiShield,
  FiThumbsUp
} from 'react-icons/fi';
import { useAuthStore } from '../stores/authStore';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, userRole, deleteAccount } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setMessage({ 
        type: 'error', 
        text: 'Please type DELETE to confirm account deletion'
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await deleteAccount();
      setMessage({ 
        type: 'success', 
        text: 'Your account has been deleted. You will be logged out shortly.' 
      });
      
      // Add timeout before logout to show success message
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to delete account. Please try again or contact support.' 
      });
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
              <FiSettings className="mr-3 text-red-500" />
              Account Settings
            </h1>
            <p className="mt-1 text-gray-500 font-light">Manage your account settings and preferences</p>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8">
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-8">
            {/* Account Status */}
            <div className="pb-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FiInfo className="mr-2 text-red-500" />
                Account Status
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Current Role</p>
                    <div className="mt-1 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        userRole === 'manager' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        <FiShield className="mr-1" />
                        {userRole === 'manager' ? 'Manager' : 'Staff'}
                      </span>
                    </div>
                  </div>
                  {userRole !== 'manager' && (
                    <button 
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm flex items-center"
                      onClick={() => setMessage({ type: 'info', text: 'Please contact an administrator to request a role change.' })}
                    >
                      <FiRefreshCw className="mr-1" />
                      Request Role Change
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="mt-1 text-sm text-gray-600">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="pb-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FiThumbsUp className="mr-2 text-red-500" />
                Preferences
              </h2>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-gray-900">Theme</p>
                <div className="mt-3 flex space-x-3">
                  <button className="h-8 w-8 bg-white border-2 border-red-500 rounded-full"></button>
                  <button className="h-8 w-8 bg-gray-800 border border-gray-700 rounded-full"></button>
                  <button className="h-8 w-8 bg-blue-600 border border-blue-700 rounded-full"></button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Theme preferences coming soon</p>
              </div>
            </div>

            {/* Danger Zone */}
            <div>
              <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center">
                <FiAlertTriangle className="mr-2" />
                Danger Zone
              </h2>
              
              <div className="bg-red-50 p-6 rounded-lg border border-red-100">
                <h3 className="text-lg font-medium text-red-800">Delete Account</h3>
                <p className="mt-1 text-sm text-red-600">
                  Once your account is deleted, all of your data will be permanently removed. This action cannot be undone.
                </p>
                
                {showDeleteConfirm ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-1">
                        Type DELETE to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="DELETE"
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                      >
                        <FiTrash2 className="mr-2" />
                        {loading ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-4 px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center"
                  >
                    <FiTrash2 className="mr-2" />
                    Delete My Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 