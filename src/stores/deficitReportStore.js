import { create } from 'zustand';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const useDeficitReportStore = create((set, get) => ({
  // State
  deficitReports: [],
  loading: false,
  error: null,

  // Actions
  generateAndStoreDeficitReport: async (schoolId, schoolData, studentsData) => {
    try {
      set({ loading: true, error: null });

      const allPolicies = schoolData.uniformPolicy || [];
      const uniformDeficits = [];
      const sizeRequests = [];
      const studentDeficits = [];
      let studentsWithDeficits = 0;

      // Group policies by uniform for easier processing
      const uniformGroups = {};
      allPolicies.forEach(policy => {
        const key = `${policy.uniformId}-${policy.level}-${policy.gender}`;
        if (!uniformGroups[key]) {
          uniformGroups[key] = policy;
        }
      });

      // Process each student
      for (const student of studentsData) {
        const studentLog = student.uniformLog || [];
        let studentHasDeficit = false;
        let studentTotalDeficit = 0;
        const studentDeficitDetails = [];

        // Check each uniform requirement for this student
        Object.values(uniformGroups).forEach(policy => {
          // Skip if policy doesn't apply to this student
          if (policy.level !== student.level || policy.gender !== student.gender) {
            return;
          }

          // Calculate received vs required
          const receivedEntries = studentLog.filter(log => log.uniformId === policy.uniformId);
          const receivedQuantity = receivedEntries.reduce((sum, log) => sum + (log.quantityReceived || 0), 0);
          const deficit = Math.max(0, policy.quantityPerStudent - receivedQuantity);

          if (deficit > 0) {
            studentHasDeficit = true;
            studentTotalDeficit += deficit;
            
            studentDeficitDetails.push({
              uniformId: policy.uniformId,
              uniformName: policy.uniformName,
              uniformType: policy.uniformType,
              required: policy.quantityPerStudent,
              received: receivedQuantity,
              deficit: deficit
            });
            
            // Find or create uniform deficit entry
            let uniformDeficit = uniformDeficits.find(ud => 
              ud.uniformId === policy.uniformId && 
              ud.level === policy.level && 
              ud.gender === policy.gender
            );
            
            if (!uniformDeficit) {
              uniformDeficit = {
                uniformId: policy.uniformId,
                uniformName: policy.uniformName,
                uniformType: policy.uniformType,
                level: policy.level,
                gender: policy.gender,
                totalDeficit: 0,
                studentsAffected: []
              };
              uniformDeficits.push(uniformDeficit);
            }
            
            uniformDeficit.totalDeficit += deficit;
            uniformDeficit.studentsAffected.push({
              id: student.id,
              name: student.name,
              deficit: deficit
            });
          }

          // Check for size requests
          receivedEntries.forEach(log => {
            if (log.sizeWanted && !log.sizeReceived) {
              let sizeRequest = sizeRequests.find(sr => 
                sr.uniformId === policy.uniformId && 
                sr.sizeWanted === log.sizeWanted
              );
              
              if (!sizeRequest) {
                sizeRequest = {
                  uniformId: policy.uniformId,
                  uniformName: policy.uniformName,
                  sizeWanted: log.sizeWanted,
                  students: []
                };
                sizeRequests.push(sizeRequest);
              }
              
              if (!sizeRequest.students.find(s => s.id === student.id)) {
                sizeRequest.students.push({
                  id: student.id,
                  name: student.name,
                  requestedAt: log.loggedAt
                });
              }
            }
          });
        });

        if (studentHasDeficit) {
          studentsWithDeficits++;
          
          // Store individual student deficit report
          const studentDeficitReport = {
            studentId: student.id,
            studentName: student.name,
            studentForm: student.form,
            studentLevel: student.level,
            studentGender: student.gender,
            schoolId: schoolId,
            totalDeficit: studentTotalDeficit,
            deficitDetails: studentDeficitDetails,
            generatedAt: serverTimestamp(),
            type: 'individual'
          };
          
          studentDeficits.push(studentDeficitReport);
          
          // Store in Firebase
          await setDoc(
            doc(db, 'deficitReports', `${schoolId}_${student.id}`), 
            studentDeficitReport
          );
        }
      }

      // Store school-wide deficit report
      const schoolDeficitReport = {
        schoolId: schoolId,
        schoolName: schoolData.name,
        uniformDeficits: uniformDeficits.sort((a, b) => b.totalDeficit - a.totalDeficit),
        sizeRequests: sizeRequests.sort((a, b) => a.uniformName.localeCompare(b.uniformName)),
        totalStudents: studentsData.length,
        studentsWithDeficits: studentsWithDeficits,
        generatedAt: serverTimestamp(),
        type: 'school'
      };

      await setDoc(
        doc(db, 'deficitReports', `school_${schoolId}`), 
        schoolDeficitReport
      );

      console.log('✅ Deficit reports generated and stored successfully');
      return { schoolReport: schoolDeficitReport, studentReports: studentDeficits };

    } catch (error) {
      console.error('Error generating deficit report:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Get school-wide deficit report
  getSchoolDeficitReport: async (schoolId) => {
    try {
      set({ loading: true, error: null });
      
      const docRef = doc(db, 'deficitReports', `school_${schoolId}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const report = { id: docSnap.id, ...docSnap.data() };
        return report;
      } else {
        console.log('No school deficit report found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching school deficit report:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Get individual student deficit report
  getStudentDeficitReport: async (schoolId, studentId) => {
    try {
      set({ loading: true, error: null });
      
      const docRef = doc(db, 'deficitReports', `${schoolId}_${studentId}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const report = { id: docSnap.id, ...docSnap.data() };
        return report;
      } else {
        console.log('No student deficit report found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching student deficit report:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Get all student deficit reports for a school
  getStudentDeficitReports: async (schoolId) => {
    try {
      set({ loading: true, error: null });
      
      const q = query(
        collection(db, 'deficitReports'),
        where('schoolId', '==', schoolId),
        where('type', '==', 'individual'),
        orderBy('totalDeficit', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reports = [];
      
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      
      return reports;
    } catch (error) {
      console.error('Error fetching student deficit reports:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Delete old deficit reports (cleanup)
  cleanupOldDeficitReports: async (schoolId) => {
    try {
      // Delete school report
      await deleteDoc(doc(db, 'deficitReports', `school_${schoolId}`));
      
      // Delete all student reports for this school
      const q = query(
        collection(db, 'deficitReports'),
        where('schoolId', '==', schoolId),
        where('type', '==', 'individual')
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      console.log('✅ Old deficit reports cleaned up');
    } catch (error) {
      console.error('Error cleaning up old deficit reports:', error);
    }
  },

  // Refresh deficit reports (regenerate and store)
  refreshDeficitReports: async (schoolId, schoolData, studentsData) => {
    const store = get();
    try {
      // Clean up old reports first
      await store.cleanupOldDeficitReports(schoolId);
      
      // Generate new reports
      return await store.generateAndStoreDeficitReport(schoolId, schoolData, studentsData);
    } catch (error) {
      console.error('Error refreshing deficit reports:', error);
      throw error;
    }
  }
}));
