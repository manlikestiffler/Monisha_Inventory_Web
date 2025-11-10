import { create } from 'zustand';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, getDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import useNotificationStore from './notificationStore';
import { useAuthStore } from './authStore';

const useSchoolStore = create((set, get) => ({
  schools: [],
  uniforms: [],
  loading: false,
  error: null,

  // Fetch schools directly from Firestore (no caching)
  fetchSchools: async () => {
    set({ loading: true, error: null });
    try {
      const querySnapshot = await getDocs(collection(db, 'schools'));
      const schools = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ schools, loading: false });
    } catch (error) {
      console.error('Error fetching schools:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Fetch uniforms directly from Firestore
  fetchUniforms: async () => {
    try {
      const uniformsRef = collection(db, 'uniforms');
      const snapshot = await getDocs(uniformsRef);
      const uniforms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ uniforms });
      return uniforms;
    } catch (error) {
      console.error('Error fetching uniforms:', error);
      throw error;
    }
  },

  // Get school by ID directly from Firestore (force server fetch to sync with mobile)
  getSchoolById: async (id) => {
    try {
      const docRef = doc(db, 'schools', id.toString());
      // Force fetch from server to get latest data (including mobile app changes)
      const docSnap = await getDoc(docRef, { source: 'server' });
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('School document does not exist');
      }
    } catch (error) {
      // If server fetch fails, try cache as fallback
      console.warn('Server fetch failed, trying cache:', error);
      try {
        const docRef = doc(db, 'schools', id.toString());
        const docSnap = await getDoc(docRef, { source: 'cache' });
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() };
        }
      } catch (cacheError) {
        console.error('Cache fetch also failed:', cacheError);
      }
      throw error;
    }
  },

  addSchool: async (schoolData, userInfo) => {
    set({ loading: true, error: null });
    try {
      const docRef = await addDoc(collection(db, 'schools'), {
        ...schoolData,
        students: [],
        uniformPolicy: [],
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const newSchool = {
        id: docRef.id,
        ...schoolData,
        students: [],
        uniformPolicy: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      set(state => ({
        schools: [...state.schools, newSchool],
        loading: false
      }));

      // Create notification for school creation
      const { addNotification } = useNotificationStore.getState();
      await addNotification({
        type: 'school_added',
        title: 'New School Added',
        message: `${schoolData.name} has been added to the system`,
        category: 'administration',
        priority: 'medium',
        icon: '🏫'
      }, userInfo);

      return newSchool;
    } catch (error) {
      console.error('Error adding school:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateSchool: async (schoolId, schoolData) => {
    set({ loading: true, error: null });
    try {
      if (!schoolId || typeof schoolId !== 'string') {
        throw new Error('Invalid school ID');
      }

      const docRef = doc(db, 'schools', schoolId.toString());
      
      // Ensure we're not losing any existing data
      const currentSchool = await getDoc(docRef);
      const currentData = currentSchool.data();
      
      const updatedData = {
        ...currentData,
        ...schoolData,
        updatedAt: new Date().toISOString(),
        uniformRequirements: {
          ...(currentData?.uniformRequirements || {}),
          ...(schoolData?.uniformRequirements || {})
        }
      };
      
      await updateDoc(docRef, updatedData);
      
      set(state => ({
        schools: state.schools.map(school =>
          school.id === schoolId ? { ...school, ...updatedData } : school
        ),
        loading: false
      }));
      
      return updatedData;
    } catch (error) {
      console.error('Error updating school:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteSchool: async (id, userInfo) => {
    set({ loading: true, error: null });
    try {
      // Get school name before deletion for notification
      const { schools } = get();
      const school = schools.find(s => s.id === id);
      const schoolName = school?.name || 'Unknown School';
      
      await deleteDoc(doc(db, 'schools', id));
      
      set(state => ({
        schools: state.schools.filter(school => school.id !== id),
        loading: false
      }));

      // Create notification for school deletion
      const { addNotification } = useNotificationStore.getState();
      await addNotification({
        type: 'school_deleted',
        title: 'School Deleted',
        message: `School "${schoolName}" has been removed from the system`,
        category: 'administration',
        priority: 'medium',
        icon: '🗑️'
      }, userInfo);
    } catch (error) {
      console.error('Error deleting school:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Add student with dual collection approach (mobile app pattern)
  addStudent: async (studentData) => {
    set({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const userId = user ? user.uid : 'unknown';
      
      const newStudentData = {
        ...studentData,
        uniformLog: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId
      };

      // Create student document in students collection
      const docRef = await addDoc(collection(db, 'students'), newStudentData);
      
      // Create student reference for school document
      const newStudentForSchool = {
        id: docRef.id,
        name: studentData.name,
        level: studentData.level,
        gender: studentData.gender,
        createdAt: new Date().toISOString()
      };
      
      // Add student reference to school document
      await updateDoc(doc(db, 'schools', studentData.schoolId), {
        students: arrayUnion(newStudentForSchool),
        updatedAt: serverTimestamp()
      });
      
      set({ loading: false });
      console.log('Student added successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding student:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update student in students collection
  updateStudent: async (studentId, studentData) => {
    set({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const userId = user ? user.uid : 'unknown';
      
      const updatedData = {
        ...studentData,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      };
      
      await updateDoc(doc(db, 'students', studentId), updatedData);
      
      set({ loading: false });
      return updatedData;
    } catch (error) {
      console.error('Error updating student:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete student from both collections (mobile app pattern)
  deleteStudent: async (schoolId, studentId) => {
    set({ loading: true, error: null });
    try {
      console.log('Starting student deletion process...');
      
      // Delete from students collection
      try {
        await deleteDoc(doc(db, 'students', studentId));
        console.log('Student deleted from students collection');
      } catch (error) {
        console.log('Student not found in students collection or already deleted');
      }
      
      // Get current school data
      const school = await get().getSchoolById(schoolId);
      if (!school) throw new Error('School not found');

      // Filter out the student and update school document
      const updatedStudents = (school.students || []).filter(student => student.id !== studentId);
      
      await updateDoc(doc(db, 'schools', schoolId), {
        students: updatedStudents,
        updatedAt: serverTimestamp()
      });
      
      console.log('Student removed from school document');
      set({ loading: false });
      
    } catch (error) {
      console.error('Error deleting student:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Add uniform policy (web app uses this name)
  addUniformPolicy: async (schoolId, policyData) => {
    set({ loading: true, error: null });
    try {
      const docRef = doc(db, 'schools', schoolId.toString());
      
      // Get current school data
      const currentSchool = await getDoc(docRef);
      const currentData = currentSchool.data();
      
      // Initialize uniformPolicy array if it doesn't exist
      const currentPolicies = currentData?.uniformPolicy || [];
      
      // Create new policy object (matching mobile app structure)
      const newPolicy = {
        id: Date.now().toString(),
        uniformId: policyData.uniformId,
        uniformName: policyData.uniformName,
        uniformType: policyData.uniformType || 'UNIFORM',
        level: policyData.level,
        gender: policyData.gender,
        isRequired: policyData.isRequired !== undefined ? policyData.isRequired : true,
        quantityPerStudent: policyData.quantityPerStudent || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to policies array
      const updatedPolicies = [...currentPolicies, newPolicy];
      
      // Update the document
      await updateDoc(docRef, {
        uniformPolicy: updatedPolicies,
        updatedAt: serverTimestamp()
      });
      
      set({ loading: false });
      return newPolicy;
    } catch (error) {
      console.error('Error adding school uniform policy:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update school uniform policy (mobile app pattern - alias for mobile compatibility)
  updateSchoolUniformPolicy: async (schoolId, policyData) => {
    return await get().addUniformPolicy(schoolId, policyData);
  },

  // Remove uniform policy (web app uses this name)
  removeUniformPolicy: async (schoolId, policyToRemove) => {
    set({ loading: true, error: null });
    try {
      const docRef = doc(db, 'schools', schoolId.toString());
      
      // Get current school data
      const currentSchool = await getDoc(docRef);
      const currentData = currentSchool.data();
      
      // Filter out the policy to remove
      // Handle both old policies (without id) and new policies (with id)
      const updatedPolicies = (currentData?.uniformPolicy || []).filter(policy => {
        // If both have id fields, match by id
        if (policy.id && policyToRemove.id) {
          return policy.id !== policyToRemove.id;
        }
        
        // For old policies without id, match by all key fields
        return !(
          policy.uniformId === policyToRemove.uniformId &&
          policy.level === policyToRemove.level &&
          policy.gender === policyToRemove.gender
        );
      });
      
      console.log('Policies before removal:', currentData?.uniformPolicy?.length);
      console.log('Policies after removal:', updatedPolicies.length);
      
      // Update the document
      await updateDoc(docRef, {
        uniformPolicy: updatedPolicies,
        updatedAt: serverTimestamp()
      });
      
      set({ loading: false });
      return true;
    } catch (error) {
      console.error('Error removing school uniform policy:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Remove school uniform policy (mobile app pattern - alias for mobile compatibility)
  removeSchoolUniformPolicy: async (schoolId, policyId) => {
    return await get().removeUniformPolicy(schoolId, policyId);
  },

  // Get policies for school with filtering
  getSchoolUniformPolicies: async (schoolId, level = null, gender = null) => {
    try {
      const school = await get().getSchoolById(schoolId);
      if (!school?.uniformPolicy) return [];
      
      let policies = school.uniformPolicy;
      
      if (level) policies = policies.filter(p => p.level === level);
      if (gender) policies = policies.filter(p => p.gender === gender);
      
      return policies;
    } catch (error) {
      console.error('Error getting uniform policies:', error);
      return [];
    }
  },

  // Get all students for a specific school
  getStudentsForSchool: async (schoolId) => {
    try {
      const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId)
      );
      const querySnapshot = await getDocs(q);
      
      const students = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() });
      });
      
      return students;
    } catch (error) {
      console.error('Error fetching students for school:', error);
      throw error;
    }
  },

  // Get student count for a specific school
  getStudentCountForSchool: async (schoolId) => {
    try {
      const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting student count for school:', error);
      return 0;
    }
  },

  // Get total student count across all schools
  getTotalStudentCount: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting total student count:', error);
      return 0;
    }
  },

  // Student uniform logging functions
  updateStudentUniformLog: async (studentId, logEntry) => {
    try {
      const docRef = doc(db, 'students', studentId.toString());
      
      // Add the log entry to the uniformLog array
      await updateDoc(docRef, {
        uniformLog: arrayUnion(logEntry),
        updatedAt: serverTimestamp()
      });
      
      console.log('Student uniform log updated successfully');
    } catch (error) {
      console.error('Error updating student uniform log:', error);
      throw error;
    }
  },

  // Get student by ID from students collection
  getStudentById: async (studentId) => {
    try {
      const docRef = doc(db, 'students', studentId.toString());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Student not found');
      }
    } catch (error) {
      console.error('Error getting student:', error);
      throw error;
    }
  },

  // Get students by school ID (alias for getStudentsForSchool for compatibility)
  getStudentsBySchool: async (schoolId) => {
    return await get().getStudentsForSchool(schoolId);
  }
}));

export { useSchoolStore }; 