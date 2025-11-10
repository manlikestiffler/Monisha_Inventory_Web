import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMail, FiShield, FiCalendar, FiEdit2, FiPhone, FiCreditCard, FiUpload, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useAuthStore } from '../stores/authStore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../config/firebase';
import { motion } from 'framer-motion';

// Add loading button component
const LoadingButton = ({ isLoading, text, loadingText }) => (
  <button
    type="submit"
    disabled={isLoading}
    className={`mt-6 w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 ${
      isLoading ? 'opacity-80 cursor-not-allowed' : ''
    }`}
  >
    {isLoading ? (
      <>
        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
        <span>{loadingText}</span>
      </>
    ) : (
      text
    )}
  </button>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, userProfile, userRole, saveStaffProfile, saveManagerProfile, fetchUserProfile, deleteUserAccount } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    photoURL: userProfile?.photoURL || '',
    phoneNumber: userProfile?.phoneNumber || '',
    nationalId: userProfile?.nationalId || '',
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user profile on component mount and when user changes
  React.useEffect(() => {
    console.log('🔍 ProfilePage: Checking user for profile fetch', { uid: user?.uid, email: user?.email });
    if (user?.uid) {
      console.log('🔍 ProfilePage: Fetching user profile for uid:', user.uid);
      fetchUserProfile(user.uid);
    }
  }, [user?.uid, fetchUserProfile]);

  // Update form data when userProfile changes
  React.useEffect(() => {
    console.log('🔍 ProfilePage: UserProfile changed:', userProfile);
    if (userProfile) {
      const newFormData = {
        photoURL: userProfile.photoURL || '',
        phoneNumber: userProfile.phoneNumber || '',
        nationalId: userProfile.nationalId || '',
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
      };
      console.log('🔍 ProfilePage: Setting form data:', newFormData);
      setFormData(newFormData);
    }
  }, [userProfile]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim();
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    
    return 'U';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadProgress(0);
      setLoading(true);
      setMessage({ type: 'info', text: 'Uploading profile picture...' });

      // Create a reference to the storage location
      const storage = getStorage();
      const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);
      
      // Upload the file
      const uploadTask = uploadBytes(storageRef, file);
      
      // Wait for upload to complete
      await uploadTask;
      setUploadProgress(100);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update form data with the new URL
      setFormData(prev => ({
        ...prev,
        photoURL: downloadURL
      }));
      
      setMessage({ type: 'success', text: 'Profile picture uploaded successfully!' });
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({ type: 'error', text: 'Failed to upload profile picture. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      console.log('🔍 ProfilePage: Saving profile data:', updateData);
      console.log('🔍 ProfilePage: User role:', userRole);
      console.log('🔍 ProfilePage: User UID:', user.uid);

      if (userRole === 'manager') {
        const result = await saveManagerProfile(user.uid, updateData);
        console.log('🔍 ProfilePage: Manager profile save result:', result);
      } else {
        const result = await saveStaffProfile(user.uid, updateData);
        console.log('🔍 ProfilePage: Staff profile save result:', result);
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Force refetch after save
      console.log('🔍 ProfilePage: Force refetching profile after save');
      await fetchUserProfile(user.uid);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setMessage({ type: 'error', text: 'Please enter your password to confirm account deletion.' });
      return;
    }

    setIsDeleting(true);
    setMessage({ type: '', text: '' });

    try {
      await deleteUserAccount(deletePassword);
      // User will be automatically signed out and redirected
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 dark:bg-black min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center">
              <FiUser className="mr-3 text-red-500" />
              Profile
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 font-light">View and manage your profile information</p>
          </div>
        </div>
        <div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiEdit2 className="mr-2" />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 md:p-8">
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 
              message.type === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
              'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
            }`}>
              {message.text}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-start gap-8">
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <div className="h-32 w-32 rounded-full bg-brand-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-4 relative group">
                {userProfile?.photoURL ? (
                  <img 
                    src={userProfile.photoURL} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-brand-700 dark:text-gray-300 font-bold text-4xl">
                    {getUserInitials()}
                  </span>
                )}
                {isEditing && (
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={triggerFileInput}
                  >
                    <FiUpload className="text-white text-xl" />
                  </div>
                )}
              </div>
              {isEditing && (
                <>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*"
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mb-4"
                  >
                    Change Photo
                  </button>
                </>
              )}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                userRole === 'manager' 
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' 
                  : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
              }`}>
                <FiShield className="inline-block mr-1" />
                {userRole === 'manager' ? 'Manager' : 'Staff'}
              </div>
            </div>

            {/* Profile Information */}
            <div className="flex-1">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-6 mt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. +1234567890"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      National ID
                    </label>
                    <input
                      type="text"
                      name="nationalId"
                      value={formData.nationalId}
                      onChange={handleInputChange}
                      placeholder="e.g. 123-456-789"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <LoadingButton 
                    isLoading={loading} 
                    text="Save Changes" 
                    loadingText="Saving..." 
                  />
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <FiUser className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'User'}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-700" />

                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Account Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoItem 
                      icon={<FiMail />} 
                      label="Email Status"
                      value={user?.emailVerified ? 'Verified' : 'Not Verified'}
                      badgeColor={user?.emailVerified ? 'green' : 'yellow'}
                    />
                    <InfoItem 
                      icon={<FiUser />} 
                      label="Full Name"
                      value={`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Not specified'}
                    />
                    <InfoItem 
                      icon={<FiPhone />} 
                      label="Phone Number"
                      value={userProfile?.phoneNumber || 'Not specified'}
                    />
                    <InfoItem 
                      icon={<FiCreditCard />} 
                      label="National ID"
                      value={userProfile?.nationalId || 'Not specified'}
                    />
                    <InfoItem 
                      icon={<FiCalendar />} 
                      label="Account Created"
                      value={formatDate(user?.metadata?.creationTime)}
                    />
                    <InfoItem 
                      icon={<FiCalendar />} 
                      label="Last Login"
                      value={formatDate(user?.metadata?.lastSignInTime)}
                    />
                  </div>

                  {/* Delete Account Section */}
                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="flex-shrink-0">
                          <FiAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                            Danger Zone
                          </h3>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-2xl">
                            Once you delete your account, there is no going back. This action cannot be undone and will permanently delete your account and all associated data.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to delete your account? This will permanently remove all your data and cannot be reversed.
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Please enter your password to confirm:
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:ring-red-500 focus:border-red-500"
                disabled={isDeleting}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setMessage({ type: '', text: '' });
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ icon, label, value, badgeColor }) => (
  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
    <div className="flex items-center mb-2">
      <div className="text-gray-400 dark:text-gray-500 mr-3">{icon}</div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    </div>
    {badgeColor ? (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
        badgeColor === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
      }`}>
        {value}
      </span>
    ) : (
      <p className="text-base text-gray-900 dark:text-gray-200">{value}</p>
    )}
  </div>
);

export default ProfilePage; 