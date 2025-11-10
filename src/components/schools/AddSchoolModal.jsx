import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useSchoolStore } from '../../stores/schoolStore';
import useNotificationStore from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';

const AddSchoolModal = ({ isOpen, onClose }) => {
  const { addSchool } = useSchoolStore();
  const { createSchoolNotification } = useNotificationStore();
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!schoolName.trim()) return;
    
    try {
      setLoading(true);
      
      // Create school with minimal data structure
      const schoolData = {
        name: schoolName.trim(),
        status: 'active',
        uniformPolicy: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const { user, userProfile } = useAuthStore.getState();
      
      console.log('🔍 AddSchoolModal - Raw user:', user);
      console.log('🔍 AddSchoolModal - Raw userProfile:', userProfile);
      
      const fullName = userProfile?.firstName && userProfile?.lastName 
        ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
        : userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Unknown User';
      
      const userInfo = {
        id: user?.uid,
        name: fullName,
        fullName: fullName,
        email: user?.email
      };
      
      console.log('📦 AddSchoolModal - Final userInfo:', userInfo);
      
      // The store already creates the notification, so we don't need to do it here
      await addSchool(schoolData, userInfo);
      
      // Reset form and close modal
      setSchoolName('');
      onClose();
    } catch (error) {
      console.error('Error adding school:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSchoolName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New School"
      size="sm"
    >
      <div className="space-y-6">
        <div>
          <Input
            label="School Name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Enter school name"
            required
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !schoolName.trim()}
          >
            {loading ? 'Adding...' : 'Add School'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddSchoolModal;
