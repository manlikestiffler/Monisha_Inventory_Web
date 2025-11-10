import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig.js';

// This is a placeholder. You might need to fetch this from your auth system or have a predefined map.
// If a user is not found by email, this map can be used as a fallback.
const emailToUidMap = {
  // Example: 'test@example.com': 'some-uid-from-auth',
  'tinashegomo96@gmail.com': 'c1WosYyfcBWfgWWm7BexoiIAIa73',
};

const findUserByEmail = async (email) => {
  // First, check the inventory_managers collection
  let q = query(collection(db, 'inventory_managers'), where('email', '==', email));
  let querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }

  // If not found, check the inventory_staff collection
  q = query(collection(db, 'inventory_staff'), where('email', '==', email));
  querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }

  return null;
};

const updateProductsWithCreatorUid = async () => {
  const productCollections = ['uniforms', 'raw_materials'];
  let updatedCount = 0;

  for (const collectionName of productCollections) {
    console.log(`Processing collection: ${collectionName}...`);
    const productsCollection = collection(db, collectionName);
    const productsSnapshot = await getDocs(productsCollection);

    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      const productId = productDoc.id;
      const incorrectUid = 'clWosYyfcBWfgWWm7BexoiIAIa73';

      // Update if createdByUid is missing OR if it matches the known incorrect one
      if ((!productData.createdByUid || productData.createdByUid === incorrectUid) && productData.createdBy) {
        const userEmail = productData.createdBy;
        let userId = emailToUidMap[userEmail];
        
        if (!userId) {
            const user = await findUserByEmail(userEmail);
            if(user) {
                userId = user.id;
            }
        }
        
        if (userId) {
          try {
            const productRef = doc(db, collectionName, productId);
            await updateDoc(productRef, { createdByUid: userId });
            console.log(`Updated product ${productId} in ${collectionName} with UID: ${userId}`);
            updatedCount++;
          } catch (error) {
            console.error(`Failed to update product ${productId} in ${collectionName}:`, error);
          }
        } else {
          console.log(`UID not found for email: ${userEmail} for product ${productId} in ${collectionName}. Consider adding to emailToUidMap.`);
        }
      } else {
        console.log(`Skipping product ${productId} in ${collectionName}.`);
        if (productData.createdByUid && productData.createdByUid !== incorrectUid) {
            console.log(`  - Reason: Product already has a valid 'createdByUid' field: '${productData.createdByUid}'`);
        } else if (!productData.createdBy) {
            console.log(`  - Reason: Product is missing the 'createdBy' (email) field.`);
        }
      }
    }
  }

  console.log(`\nMigration complete. Total products updated: ${updatedCount}`);
};

updateProductsWithCreatorUid().catch(console.error); 