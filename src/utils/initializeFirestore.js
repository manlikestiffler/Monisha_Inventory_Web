import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function checkAndInitializeFirestore() {
  try {
    // Check connection by attempting to read a known document
    const initDoc = doc(db, '_init', 'status');
    const initSnapshot = await getDoc(initDoc);

    if (!initSnapshot.exists()) {
      // Create initialization document if it doesn't exist
      await setDoc(initDoc, {
        initialized: true,
        timestamp: new Date().toISOString()
      });
    }

    return true;
  } catch (error) {
    console.error('Firestore initialization error:', error);
    return false;
  }
} 