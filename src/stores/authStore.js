import { create } from 'zustand';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { signOut, deleteUser, signInWithEmailAndPassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc, limit } from 'firebase/firestore';

// Hardcoded super admin email - this will ALWAYS get super admin privileges
const SUPER_ADMIN_EMAIL = 'tinashegomo96@gmail.com';

// Function to check if email is the permanent super admin
const isPermanentSuperAdmin = (email) => {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
};

export const useAuthStore = create((set, get) => ({
  user: null,
  userRole: null,
  userProfile: null,
  error: null,
  loading: false,
  authLoading: true, // New state to track initial auth check
  isFirstUserRegistration: false,
  roleCache: {}, // Cache roles to prevent unnecessary re-fetching
  
  // Check if current user is super admin
  isSuperAdmin: () => {
    const state = get();
    return isPermanentSuperAdmin(state.user?.email) || state.userRole === 'super_admin';
  },

  // Auto-assign super admin role after email verification
  checkAndAssignSuperAdmin: async (user) => {
    if (isPermanentSuperAdmin(user?.email) && user?.emailVerified) {
      try {
        // Create super admin profile in managers collection
        await setDoc(doc(db, 'inventory_managers', user.uid), {
          email: user.email,
          displayName: user.displayName || 'Super Admin',
          role: 'super_admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        });
        
        set({ 
          userRole: 'super_admin',
          userProfile: {
            email: user.email,
            displayName: user.displayName || 'Super Admin',
            role: 'super_admin'
          }
        });
        
        console.log('Super admin role assigned automatically');
        return true;
      } catch (error) {
        console.error('Error assigning super admin role:', error);
        return false;
      }
    }
    return false;
  },
  
  // Initialize by checking if this is the first user
  initializeFirstUserCheck: async () => {
    try {
      // Check if any managers exist
      const managersQuery = query(collection(db, 'inventory_managers'), limit(1));
      const managersSnapshot = await getDocs(managersQuery);
      
      // Check if any staff exist
      const staffQuery = query(collection(db, 'inventory_staff'), limit(1));
      const staffSnapshot = await getDocs(staffQuery);
      
      // If both collections are empty, this is the first user
      const isFirstUser = managersSnapshot.empty && staffSnapshot.empty;
      set({ isFirstUserRegistration: isFirstUser });
      return isFirstUser;
    } catch (error) {
      console.error('Error checking for first user:', error);
      return false;
    }
  },
  
  setUser: (user) => {
    console.log('🔍 AuthStore: Setting user:', user?.uid, user?.email);
    set({ user, error: null });
    // If user is null, it means they logged out, so we are no longer loading auth.
    if (!user) {
      set({ userProfile: null, userRole: null, authLoading: false, roleCache: {} });
    }
  },
  
  clearError: () => set({ error: null }),
  
  // Save user role and profile information with persistence
  setUserRole: (role) => {
    console.log('🔍 AuthStore: Setting user role to:', role);
    set({ userRole: role });
  },
  
  setUserProfile: (profile) => {
    console.log('🔍 AuthStore: Setting user profile:', profile);
    set({ userProfile: profile });
  },
  
  // Create or update staff profile in Firestore
  saveStaffProfile: async (uid, profileData) => {
    try {
      console.log('🔍 AuthStore: saveStaffProfile called', { uid, profileData });
      set({ loading: true });
      const currentProfile = get().userProfile || {};
      const updatedProfile = { 
        ...currentProfile, 
        ...profileData, 
        role: 'staff', 
        appOrigin: 'inventory',
        updatedAt: new Date().toISOString() 
      };
      
      console.log('🔍 AuthStore: Saving to inventory_staff collection:', updatedProfile);
      await setDoc(doc(db, 'inventory_staff', uid), updatedProfile, { merge: true });
      console.log('🔍 AuthStore: Successfully saved to Firebase');
      
      set({ 
        userProfile: updatedProfile,
        userRole: 'staff',
        loading: false 
      });
      console.log('🔍 AuthStore: Updated store state');
      return true;
    } catch (error) {
      console.error('🔍 AuthStore: Error saving staff profile:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  },
  
  // Create or update manager profile in Firestore (for admin use)
  saveManagerProfile: async (uid, profileData) => {
    try {
      console.log('🔍 AuthStore: saveManagerProfile called', { uid, profileData });
      set({ loading: true });
      const currentProfile = get().userProfile || {};
      const updatedProfile = { 
        ...currentProfile, 
        ...profileData, 
        role: 'manager', 
        appOrigin: 'inventory',
        updatedAt: new Date().toISOString() 
      };

      console.log('🔍 AuthStore: Saving to inventory_managers collection:', updatedProfile);
      await setDoc(doc(db, 'inventory_managers', uid), updatedProfile, { merge: true });
      console.log('🔍 AuthStore: Successfully saved to Firebase');
      
      set({ 
        userProfile: updatedProfile,
        userRole: 'manager',
        loading: false 
      });
      console.log('🔍 AuthStore: Updated store state');
      return true;
    } catch (error) {
      console.error('🔍 AuthStore: Error saving manager profile:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  },
  
  // Fetch user profile from both collections
  fetchUserProfile: async (uid) => {
    // This function is now responsible for setting authLoading to false
    console.log('🔍 AuthStore: fetchUserProfile called with uid:', uid);
    if (!uid) {
      console.log('🔍 AuthStore: No UID provided, clearing profile');
      set({ userProfile: null, userRole: null, authLoading: false }); // Stop loading if no user
      return;
    }

    // Check cache first to prevent unnecessary fetches
    const { roleCache } = get();
    if (roleCache[uid]) {
      console.log('🔍 AuthStore: Using cached role for uid:', uid, roleCache[uid]);
      set({ 
        userProfile: roleCache[uid].profile, 
        userRole: roleCache[uid].role 
      });
      return;
    }

    // Prevent multiple simultaneous fetches for the same user
    if (get().loading) {
      console.log('🔍 AuthStore: Already fetching profile, skipping duplicate request');
      return;
    }

    set({ loading: true });
    
    try {
      console.log('🔍 AuthStore: Fetching user profile from both collections simultaneously');
      
      // Fetch from both collections simultaneously to avoid race conditions
      const [managerDoc, staffDoc] = await Promise.all([
        getDoc(doc(db, 'inventory_managers', uid)),
        getDoc(doc(db, 'inventory_staff', uid))
      ]);
      
      let userDoc, role;
      
      // Prioritize manager collection if user exists in both
      if (managerDoc.exists()) {
        console.log('🔍 AuthStore: Found in inventory_managers collection');
        userDoc = managerDoc;
        role = 'manager';
      } else if (staffDoc.exists()) {
        console.log('🔍 AuthStore: Found in inventory_staff collection');
        userDoc = staffDoc;
        role = 'staff';
      } else {
        console.log('🔍 AuthStore: User not found in either collection');
        userDoc = null;
        role = null;
      }
      
      if (userDoc && userDoc.exists()) {
        const profile = userDoc.data();
        console.log('🔍 AuthStore: Found profile data:', profile);
        
        // ALWAYS use the role from the profile data to prevent random switching
        // Only fallback to collection-based role if profile.role is completely missing
        let actualRole;
        if (isPermanentSuperAdmin(profile.email)) {
          actualRole = 'manager'; // Super admin is always manager
        } else if (profile.role) {
          actualRole = profile.role; // Use stored role from profile
        } else {
          actualRole = role; // Fallback to collection-based role only if no role in profile
        }
        console.log('🔍 AuthStore: Determined role:', { profileRole: profile.role, collectionRole: role, finalRole: actualRole });
        
        // Check for app-specific identifier (allow both appOrigin and appSource)
        // Skip app origin check for super admin
        if (!isPermanentSuperAdmin(profile.email) && profile.appOrigin !== 'inventory' && profile.appSource !== 'inventory-app') {
          console.log('🔍 AuthStore: User not authorized - wrong app origin:', profile.appOrigin || profile.appSource);
          set({ userProfile: null, userRole: null, error: 'User is not authorized for this application.' });
          return;
        }

        console.log('🔍 AuthStore: Setting profile in store:', { profile, role: actualRole });
        
        // Cache the role to prevent future unnecessary fetches
        set((state) => ({
          userProfile: profile,
          userRole: actualRole,
          loading: false,
          authLoading: false, // Auth process is complete
          roleCache: {
            ...state.roleCache,
            [uid]: { profile, role: actualRole },
          },
        }));
      } else {
        console.log('🔍 AuthStore: No profile found in either collection');
        // If no profile, user might be new or in a different app, stop auth loading.
        set({ userProfile: null, userRole: null, loading: false, authLoading: false });
      }
    } catch (error) {
      console.error('🔍 AuthStore: Error fetching user profile:', error);
      set({ error: 'Failed to fetch user profile.', loading: false, authLoading: false }); // Stop loading on error
    }
  },
  
  // Get staff with pending manager requests
  getStaffWithPendingManagerRequests: async () => {
    try {
      set({ loading: true });
      const pendingRequestsQuery = query(
        collection(db, 'inventory_staff'), 
        where('pendingManagerRequest', '==', true)
      );
      const pendingSnapshot = await getDocs(pendingRequestsQuery);
      const pendingData = pendingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'staff'
      }));
      set({ loading: false });
      return pendingData;
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },
  
  // Get all staff
  getAllStaff: async () => {
    try {
      set({ loading: true });
      const staffSnapshot = await getDocs(collection(db, 'inventory_staff'));
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'staff'
      }));
      set({ loading: false });
      return staffData;
    } catch (error) {
      console.error('Error fetching staff:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },
  
  // Get all managers
  getAllManagers: async () => {
    try {
      set({ loading: true });
      const managersSnapshot = await getDocs(collection(db, 'inventory_managers'));
      const managersData = managersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'manager'
      }));
      set({ loading: false });
      return managersData;
    } catch (error) {
      console.error('Error fetching managers:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },
  
  // Check if user is a manager
  isManager: () => {
    const state = get();
    return state.userRole === 'manager' || state.user?.email === SUPER_ADMIN_EMAIL;
  },
  
  // Check if user is staff
  isStaff: () => {
    const state = get();
    return state.userRole === 'staff' && state.user?.email !== SUPER_ADMIN_EMAIL;
  },
  
  logout: async () => {
    try {
      await signOut(auth);
      // setUser(null) will handle clearing state and setting authLoading to false
      get().setUser(null);
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Delete a user from Firebase Auth and Firestore
  // Update user profile
  updateProfile: async (profileData) => {
    const state = get();
    const uid = state.user?.uid;
    const role = state.userRole;
    
    if (!uid || !role) {
      throw new Error('User not authenticated or role not found');
    }

    try {
      set({ loading: true });
      const currentProfile = state.userProfile || {};
      const updatedProfile = { 
        ...currentProfile, 
        ...profileData, 
        role: role, // Preserve existing role
        updatedAt: new Date().toISOString() 
      };
      
      const collection = role === 'manager' ? 'inventory_managers' : 'inventory_staff';
      await setDoc(doc(db, collection, uid), updatedProfile, { merge: true });
      
      // Update cache with new profile data
      set((state) => ({ 
        userProfile: updatedProfile,
        loading: false,
        roleCache: {
          ...state.roleCache,
          [uid]: { profile: updatedProfile, role: role }
        }
      }));
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteUser: async (uid) => {
    const state = get();
    if (!state.isManager() && !state.isSuperAdmin()) {
      throw new Error("You don't have permission to delete users.");
    }

    try {
      set({ loading: true });
      
      // It's important to have a backend function to delete users to avoid needing admin privileges on the client.
      // For this example, we assume an admin context or a specific cloud function is called.
      // The below line is a placeholder for a secure backend call.
      // await deleteUser(auth, uid); // This requires admin privileges, not suitable for direct client-side code.

      // Delete from 'managers' or 'staff'
      let userRef = doc(db, 'inventory_managers', uid);
      let userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        await deleteDoc(userRef);
      } else {
        userRef = doc(db, 'inventory_staff', uid);
        await deleteDoc(userRef);
      }
      
      set({ loading: false });
    } catch (error) {
      console.error('Error deleting user:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete current user's own account
  deleteUserAccount: async (password) => {
    const state = get();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('No user is currently signed in.');
    }

    try {
      set({ loading: true, error: null });
      
      // Re-authenticate user before deletion (required for sensitive operations)
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Delete user profile from Firestore first
      const userRole = state.userRole;
      const collection = userRole === 'manager' ? 'inventory_managers' : 'inventory_staff';
      const userRef = doc(db, collection, currentUser.uid);
      
      // Check if user document exists and delete it
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await deleteDoc(userRef);
      }
      
      // Also check and delete from other collections if exists
      const alternateCollection = userRole === 'manager' ? 'inventory_staff' : 'inventory_managers';
      const alternateRef = doc(db, alternateCollection, currentUser.uid);
      const alternateDoc = await getDoc(alternateRef);
      if (alternateDoc.exists()) {
        await deleteDoc(alternateRef);
      }
      
      // Delete the Firebase Auth user account
      await deleteUser(currentUser);
      
      // Clear the store state
      set({ 
        user: null, 
        userRole: null, 
        userProfile: null, 
        loading: false,
        error: null 
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting user account:', error);
      let errorMessage = 'Failed to delete account. Please try again.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign out and sign back in before deleting your account.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User account not found.';
      }
      
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  }
})); 