import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuthStore } from '../../stores/authStore';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  
  // Check if current user is super user
  const isSuperUser = user?.email === 'tinashegomo96@gmail.com';

  useEffect(() => {
    if (isSuperUser) {
      fetchUsers();
    }
  }, [isSuperUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const collections = ['staff', 'managers', 'users', 'accounts'];
      const allUsers = [];

      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          snapshot.docs.forEach(doc => {
            const userData = doc.data();
            allUsers.push({
              id: doc.id,
              collection: collectionName,
              name: userData.name || userData.fullName || userData.email || 'Unknown',
              email: userData.email,
              role: collectionName === 'managers' ? 'manager' : 'staff',
              ...userData
            });
          });
        } catch (error) {
          console.log(`Collection ${collectionName} not accessible:`, error.message);
        }
      }

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, currentCollection, newRole) => {
    try {
      const newCollection = newRole === 'manager' ? 'managers' : 'staff';
      
      if (currentCollection !== newCollection) {
        // Update the user's role in their current collection
        const userRef = doc(db, currentCollection, userId);
        await updateDoc(userRef, {
          role: newRole,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email
        });

        // Refresh the users list
        fetchUsers();
        
        alert(`User role updated to ${newRole} successfully!`);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  if (!isSuperUser) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">Only the super user can access user management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage employee roles and permissions</p>
        <div className="mt-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg inline-block">
          <span className="text-yellow-800 text-sm font-medium">Super User Access</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900">All Users ({users.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((userData) => (
                <tr key={`${userData.collection}-${userData.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {userData.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {userData.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      userData.role === 'manager' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {userData.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {userData.collection}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {userData.email !== 'tinashegomo96@gmail.com' && (
                      <div className="flex space-x-2">
                        {userData.role !== 'manager' && (
                          <button
                            onClick={() => updateUserRole(userData.id, userData.collection, 'manager')}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Promote to Manager
                          </button>
                        )}
                        {userData.role !== 'staff' && (
                          <button
                            onClick={() => updateUserRole(userData.id, userData.collection, 'staff')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Demote to Staff
                          </button>
                        )}
                      </div>
                    )}
                    {userData.email === 'tinashegomo96@gmail.com' && (
                      <span className="text-yellow-600 font-medium text-xs">Super User</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No users found in the system.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
