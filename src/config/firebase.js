import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDHkE3k09XUzW1ONjN914fWgAHRPDTtsms",
  authDomain: "monisha-databse.firebaseapp.com",
  projectId: "monisha-databse",
  storageBucket: "monisha-databse.firebasestorage.app",
  messagingSenderId: "10224835048",
  appId: "1:10224835048:web:41ebdf9453a559c97fec5d",
  measurementId: "G-J8J31DHXBZ"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence
const db = initializeFirestore(app, {
  cache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);

export { db, auth, storage };