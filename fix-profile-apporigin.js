// Fix existing user profile by adding appOrigin field
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

// Your Firebase config (replace with actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUserProfile() {
  const uid = 'clWosYyfcBWfgWWm7BexoiIAIa73'; // Your UID from the logs
  
  try {
    // Check staff collection first
    const staffDocRef = doc(db, 'inventory_staff', uid);
    const staffDoc = await getDoc(staffDocRef);
    
    if (staffDoc.exists()) {
      console.log('Found user in inventory_staff, updating...');
      await updateDoc(staffDocRef, {
        appOrigin: 'inventory'
      });
      console.log('✅ Successfully updated staff profile with appOrigin');
      return;
    }
    
    // Check managers collection
    const managerDocRef = doc(db, 'inventory_managers', uid);
    const managerDoc = await getDoc(managerDocRef);
    
    if (managerDoc.exists()) {
      console.log('Found user in inventory_managers, updating...');
      await updateDoc(managerDocRef, {
        appOrigin: 'inventory'
      });
      console.log('✅ Successfully updated manager profile with appOrigin');
      return;
    }
    
    console.log('❌ User not found in either collection');
  } catch (error) {
    console.error('❌ Error fixing profile:', error);
  }
}

fixUserProfile();
