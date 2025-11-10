import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { collection, getDocs, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../stores/authStore';
import { FiUsers, FiShield, FiTrash2, FiArrowUp, FiArrowDown, FiSearch, FiDatabase, FiUserCheck, FiUserX } from 'react-icons/fi';
import { motion } from 'framer-motion';

const AdminSuperAdmin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmPromote, setConfirmPromote] = useState(null);
  const [confirmDemote, setConfirmDemote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  // Check if current user is super admin
  const isSuperAdmin = currentUser?.email === 'tinashegomo96@gmail.com';

  useEffect(() => {
    // Check if user is super admin, if not redirect
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }

    fetchUsers();
  }, [navigate, isSuperAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch managers
      const managersSnapshot = await getDocs(collection(db, 'inventory_managers'));
      const managersData = managersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'manager'
      }));

      // Fetch staff
      const staffSnapshot = await getDocs(collection(db, 'inventory_staff'));
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'staff'
      }));

      // Combine both sets of users
      const allUsers = [...managersData, ...staffData];
      
      // Sort by creation date (newest first)
      allUsers.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setUsers(allUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (userId) => {
    try {
      setLoading(true);
      
      // Get user data from staff collection
      const staffDoc = await getDoc(doc(db, 'inventory_staff', userId));
      
      if (!staffDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = staffDoc.data();
      
      // Create a new manager document with the same data
      await setDoc(doc(db, 'inventory_managers', userId), {
        ...userData,
        role: 'manager',
        promotedAt: new Date().toISOString(),
        promotedBy: currentUser.email
      });
      
      // Delete the staff document
      await deleteDoc(doc(db, 'inventory_staff', userId));
      
      // Refresh the user list
      await fetchUsers();
      
      setConfirmPromote(null);
    } catch (err) {
      console.error('Error promoting user:', err);
      setError('Failed to promote user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteUser = async (userId) => {
    try {
      setLoading(true);
      
      // Get user data from managers collection
      const managerDoc = await getDoc(doc(db, 'inventory_managers', userId));
      
      if (!managerDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = managerDoc.data();
      
      // Create a new staff document with the same data
      await setDoc(doc(db, 'inventory_staff', userId), {
        ...userData,
        role: 'staff',
        demotedAt: new Date().toISOString(),
        demotedBy: currentUser.email
      });
      
      // Delete the manager document
      await deleteDoc(doc(db, 'inventory_managers', userId));
      
      // Refresh the user list
      await fetchUsers();
      
      setConfirmDemote(null);
    } catch (err) {
      console.error('Error demoting user:', err);
      setError('Failed to demote user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setLoading(true);
      
      // Find the user
      const userToDelete = users.find(user => user.id === userId);
      
      if (!userToDelete) {
        throw new Error('User not found');
      }
      
      // Delete from the appropriate collection
      if (userToDelete.role === 'manager') {
        await deleteDoc(doc(db, 'inventory_managers', userId));
      } else {
        await deleteDoc(doc(db, 'inventory_staff', userId));
      }
      
      // Refresh the user list
      await fetchUsers();
      
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = (
      user.displayName?.toLowerCase().includes(searchString) ||
      user.email?.toLowerCase().includes(searchString) ||
      user.firstName?.toLowerCase().includes(searchString) ||
      user.lastName?.toLowerCase().includes(searchString)
    );
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const getUserStats = () => {
    const totalUsers = users.length;
    const managers = users.filter(u => u.role === 'manager').length;
    const staff = users.filter(u => u.role === 'staff').length;
    const verified = users.filter(u => u.emailVerified).length;
    
    return { totalUsers, managers, staff, verified };
  };

  const stats = getUserStats();

  return (
    <div className="p-6 space-y-8 bg-gray-50 dark:bg-black min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center">
            <FiShield className="mr-3 text-red-500" />
            Super Admin Dashboard
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 font-light">Complete user management and database access</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
            Super Admin Access
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiUsers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FiShield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Managers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.managers}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FiUsers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.staff}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <FiUserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Verified</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.verified}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-gray-100 w-64"
              />
            </div>
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Roles</option>
              <option value="manager">Managers</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiDatabase className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex justify-center items-center">
                      <div className="w-6 h-6 border-2 border-t-transparent border-red-500 rounded-full animate-spin mr-2"></div>
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="h-10 w-10 rounded-full" />
                          ) : (
                            <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                              {user.firstName?.[0] || user.displayName?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.displayName || `${user.firstName} ${user.lastName}`}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.firstName} {user.lastName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {user.email === 'tinashegomo96@gmail.com' ? (
                        <span className="flex items-center">
                          {user.email}
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                            Super Admin
                          </span>
                        </span>
                      ) : (
                        user.email
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'manager' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}>
                        {user.role === 'manager' ? 'Manager' : 'Staff'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.emailVerified 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        {user.emailVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.email !== 'tinashegomo96@gmail.com' && (
                        <div className="flex justify-end space-x-2">
                          {user.role === 'staff' && (
                            <button
                              onClick={() => setConfirmPromote(user)}
                              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                            >
                              <FiArrowUp className="w-3 h-3" />
                              Promote
                            </button>
                          )}
                          {user.role === 'manager' && (
                            <button
                              onClick={() => setConfirmDemote(user)}
                              className="flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded transition-colors"
                            >
                              <FiArrowDown className="w-3 h-3" />
                              Demote
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(user)}
                            className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded transition-colors"
                          >
                            <FiTrash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for User Deletion */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                <FiTrash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Confirm User Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to permanently delete <span className="font-semibold text-gray-900 dark:text-gray-100">{confirmDelete.displayName || `${confirmDelete.firstName} ${confirmDelete.lastName}`}</span>?
              This action cannot be undone and will remove all user data from the database.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal for User Promotion */}
      {confirmPromote && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                <FiArrowUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Confirm User Promotion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to promote <span className="font-semibold text-gray-900 dark:text-gray-100">{confirmPromote.displayName || `${confirmPromote.firstName} ${confirmPromote.lastName}`}</span> to Manager?
              This will give them additional privileges and access to management features.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmPromote(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePromoteUser(confirmPromote.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Promote to Manager
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal for User Demotion */}
      {confirmDemote && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                <FiArrowDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Confirm User Demotion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to demote <span className="font-semibold text-gray-900 dark:text-gray-100">{confirmDemote.displayName || `${confirmDemote.firstName} ${confirmDemote.lastName}`}</span> to Staff?
              This will remove their management privileges and access.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDemote(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDemoteUser(confirmDemote.id)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Demote to Staff
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminSuperAdmin;
