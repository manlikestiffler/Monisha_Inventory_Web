import { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuthStore } from '../../stores/authStore';
import { FiUserCheck, FiLock, FiCheck, FiX, FiArrowLeft, FiShield } from 'react-icons/fi';
import LoadingSpinner from '../ui/LoadingSpinner';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isManager, isSuperAdmin, user: currentUser, getAllStaff, getAllManagers, saveStaffProfile, saveManagerProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        setLoading(true);
        const staffData = await getAllStaff();
        const managersData = await getAllManagers();
        const allUsers = [...staffData, ...managersData];
        
        const regularUsers = allUsers.filter(user => !user.pendingManagerRequest);
        const requests = allUsers.filter(user => user.pendingManagerRequest);
        
        setUsers(regularUsers);
        setPendingRequests(requests);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    if (isManager()) {
      fetchAllUsers();
    } else {
      setLoading(false);
    }
  }, [isManager, getAllStaff, getAllManagers]);

  const handleApproveRequest = async (userId) => {
    try {
      const userRequest = pendingRequests.find(user => user.id === userId);
      if (!userRequest) throw new Error('Request not found');
      
      await saveManagerProfile(userId, {
        ...userRequest,
        role: 'manager',
        pendingManagerRequest: false,
        requestApprovedAt: new Date().toISOString(),
        requestApprovedBy: currentUser.uid
      });
      
      await deleteDoc(doc(db, 'staff', userId));
      
      setPendingRequests(pendingRequests.filter(req => req.id !== userId));
      setUsers(prevUsers => [...prevUsers, { ...userRequest, role: 'manager' }]);
    } catch (err) {
      console.error('Error approving request:', err);
      setError('Failed to approve request');
    }
  };

  const handleRejectRequest = async (userId) => {
    try {
      const staffRef = doc(db, 'staff', userId);
      await updateDoc(staffRef, { 
        pendingManagerRequest: false,
        requestRejectedAt: new Date().toISOString(),
        requestRejectedBy: currentUser.uid
      });
      
      const rejectedUser = pendingRequests.find(req => req.id === userId);
      setPendingRequests(pendingRequests.filter(req => req.id !== userId));
      if (rejectedUser) {
        setUsers(prevUsers => [...prevUsers, { ...rejectedUser, pendingManagerRequest: false }]);
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject request');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');

      // Only super admin can manage other managers
      if (!isSuperAdmin() && user.role === 'manager') {
        throw new Error('Only super admin can modify manager roles');
      }
      
      const newProfile = { ...user, role: newRole, updatedAt: new Date().toISOString(), updatedBy: currentUser.uid };
      
      if (newRole === 'manager') {
        // Promote to Manager
        await saveManagerProfile(userId, newProfile);
        await deleteDoc(doc(db, 'staff', userId));
      } else {
        // Demote to Staff
        await saveStaffProfile(userId, newProfile);
        await deleteDoc(doc(db, 'managers', userId));
      }
      
      setUsers(users.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const handleClearDatabase = async () => {
    if (!isSuperAdmin()) {
      setError('Only super admin can clear database');
      return;
    }

    if (!window.confirm('Are you sure you want to clear likeproducts and batches? This action cannot be undone.')) return;
    try {
      setLoading(true);
      const collectionsToClear = ['likeproducts', 'batches'];
      for (const col of collectionsToClear) {
        const snapshot = await getDocs(collection(db, col));
        for (const docToDel of snapshot.docs) {
          await deleteDoc(docToDel.ref);
        }
      }
      alert('Successfully cleared specified collections.');
    } catch (err) {
      console.error('Error clearing database:', err);
      setError('Failed to clear database');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!isManager()) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center p-8 max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700">
          <div className="bg-red-100 dark:bg-red-500/10 p-4 rounded-full mb-6 inline-flex">
            <FiLock className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <FiArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage staff and manager accounts for your inventory system</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">User Administration</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage users and their roles</p>
              </div>
              {isSuperAdmin() && (
                <button 
                  onClick={handleClearDatabase} 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  <FiX className="w-5 h-5" />
                  Clear Test Data
                </button>
              )}
            </div>
          </div>
          
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <FiUserCheck className="mr-2 h-5 w-5" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <FiShield className="mr-2 h-5 w-5" />
                Manager Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 py-0.5 px-2 rounded-full text-xs">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  {activeTab === 'requests' && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requested</th>}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(activeTab === 'users' ? users : pendingRequests).map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full" src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.displayName || 'No Name'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Created: {formatDate(user.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        {user.email}
                        {user.email === 'tinashegomo96@gmail.com' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                            <FiShield className="mr-1" />
                            Super Admin
                          </span>
                        )}
                      </div>
                    </td>
                    {activeTab === 'requests' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.managerRequestAt)}</td>}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === 'requests' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400">Pending Approval</span>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'manager' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400'}`}>{user.role}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {activeTab === 'requests' ? (
                        <div className="flex items-center gap-2">
                          {(isSuperAdmin() || user.email !== 'tinashegomo96@gmail.com') && (
                            <>
                              <button onClick={() => handleApproveRequest(user.id)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1">
                                <FiCheck /> Approve
                              </button>
                              <button onClick={() => handleRejectRequest(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1">
                                <FiX /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {user.email !== 'tinashegomo96@gmail.com' && (
                            <button 
                              onClick={() => handleRoleChange(user.id, user.role === 'manager' ? 'staff' : 'manager')} 
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              disabled={!isSuperAdmin() && user.role === 'manager'}
                            >
                              {user.role === 'manager' ? 'Demote' : 'Promote'}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;