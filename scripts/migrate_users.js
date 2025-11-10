
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';

const SUPER_ADMIN_DOC_ID = 'c1WosYyfcBWfgWWm7BexoiIAIa73';
const SUPER_ADMIN_EMAIL = 'tinashegomo96@gmail.com';

const createSuperUser = async () => {
    console.log(`Creating superuser with doc ID: ${SUPER_ADMIN_DOC_ID}`);

    const newManagerDocRef = doc(db, 'inventory_managers', SUPER_ADMIN_DOC_ID);
    const oldStaffDocRef = doc(db, 'inventory_staff', SUPER_ADMIN_DOC_ID);

    const superAdminData = {
        email: SUPER_ADMIN_EMAIL,
        role: 'manager',
        appSource: 'inventory-app',
        firstName: 'Tinashe',
        lastName: 'Gomo',
        displayName: 'Tinashe Gomo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    try {
        // Create/update the user in the inventory_managers collection
        await setDoc(newManagerDocRef, superAdminData, { merge: true });
        console.log(`Superuser successfully created/updated in 'inventory_managers'.`);

        // Delete the old record from inventory_staff
        await deleteDoc(oldStaffDocRef);
        console.log(`Old superuser record deleted from 'inventory_staff'.`);

    } catch (error) {
        console.error('An error occurred during superuser creation:', error);
    }
};

createSuperUser(); 