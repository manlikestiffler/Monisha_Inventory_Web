import { create } from 'zustand';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, getDoc, updateDoc, where, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import useNotificationStore from './notificationStore';

export const useInventoryStore = create((set, get) => ({
  products: [],
  uniforms: [],
  uniformVariants: [],
  loading: false,
  error: null,
  unsubscribers: [], // Store unsubscribe functions

  // Setup real-time listeners for products
  setupRealtimeListeners: () => {
    const { unsubscribers } = get();
    
    // Clean up existing listeners
    unsubscribers.forEach(unsubscribe => unsubscribe());
    
    set({ loading: true, error: null });
    
    const newUnsubscribers = [];
    let uniformsData = [];
    let materialsData = [];
    let variantsData = [];
    
    // Listen to uniforms collection
    const uniformsQuery = query(collection(db, 'uniforms'), orderBy('createdAt', 'desc'));
    const uniformsUnsubscribe = onSnapshot(uniformsQuery, (snapshot) => {
      uniformsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      updateProductsState();
    }, (error) => {
      console.error('Error listening to uniforms:', error);
      set({ error: 'Failed to sync uniforms', loading: false });
    });
    newUnsubscribers.push(uniformsUnsubscribe);
    
    // Listen to uniform_variants collection
    const variantsQuery = query(collection(db, 'uniform_variants'));
    const variantsUnsubscribe = onSnapshot(variantsQuery, (snapshot) => {
      variantsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      updateProductsState();
    }, (error) => {
      console.error('Error listening to variants:', error);
      set({ error: 'Failed to sync variants', loading: false });
    });
    newUnsubscribers.push(variantsUnsubscribe);
    
    // Listen to raw_materials collection
    const materialsQuery = query(collection(db, 'raw_materials'), orderBy('createdAt', 'desc'));
    const materialsUnsubscribe = onSnapshot(materialsQuery, (snapshot) => {
      materialsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        variants: [] // Raw materials don't have variants
      }));
      updateProductsState();
    }, (error) => {
      console.error('Error listening to materials:', error);
      set({ error: 'Failed to sync materials', loading: false });
    });
    newUnsubscribers.push(materialsUnsubscribe);
    
    // Function to update state when any collection changes
    const updateProductsState = () => {
      // Combine uniforms with their variants, ensuring `variantType` is consistently available
      const uniformsWithVariants = uniformsData.map(uniform => {
        const variants = variantsData
          .filter(variant => variant.uniformId === uniform.id)
          .map(v => {
            // Critical fix: ensure the variant's own ID is preserved
            return {
              ...v,
              id: v.id, // Explicitly preserve the Firebase document ID
              variantType: v.variantType || v.variant,
            };
          });
        return { ...uniform, variants };
      });

      // Filter uniforms (exclude raw materials)
      const allUniforms = uniformsWithVariants.filter(item => item.productType === 'uniform');
      const allVariants = variantsData;
      
      // Combine and sort all products by createdAt (newest first)
      const allProducts = [...uniformsWithVariants, ...materialsData]
        .sort((a, b) => {
          // Handle different timestamp formats more robustly
          let aTime, bTime;
          
          // For Firebase Timestamp objects
          if (a.createdAt?.toDate) {
            aTime = a.createdAt.toDate();
          } else if (a.createdAt instanceof Date) {
            aTime = a.createdAt;
          } else if (typeof a.createdAt === 'string') {
            aTime = new Date(a.createdAt);
          } else {
            aTime = new Date(0); // Fallback for very old products
          }
          
          if (b.createdAt?.toDate) {
            bTime = b.createdAt.toDate();
          } else if (b.createdAt instanceof Date) {
            bTime = b.createdAt;
          } else if (typeof b.createdAt === 'string') {
            bTime = new Date(b.createdAt);
          } else {
            bTime = new Date(0); // Fallback for very old products
          }
          
          return bTime - aTime; // Descending order (newest first)
        });
      
      set({ 
        products: allProducts, 
        uniforms: allUniforms,
        uniformVariants: allVariants,
        loading: false,
        error: null
      });
      
      console.log('🌐 Real-time update: Products synced', {
        uniforms: uniformsWithVariants.length,
        materials: materialsData.length,
        variants: variantsData.length,
        firstThreeProducts: allProducts.slice(0, 3).map(p => ({
          name: p.name || p.productName,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          createdTimestamp: p.createdAt?.toDate?.() || p.createdAt,
          updatedTimestamp: p.updatedAt?.toDate?.() || p.updatedAt,
          id: p.id
        }))
      });
    };
    
    set({ unsubscribers: newUnsubscribers });
  },
  
  // Cleanup listeners
  cleanup: () => {
    const { unsubscribers } = get();
    unsubscribers.forEach(unsubscribe => unsubscribe());
    set({ unsubscribers: [] });
  },
  
  // Legacy method for compatibility
  fetchProducts: async () => {
    // For initial load or fallback, use the real-time listeners
    get().setupRealtimeListeners();
  },

  // Get products filtered by gender and level for uniform policies
  getProductsByGenderAndLevel: (gender, level) => {
    const { products } = get();
    
    return products.filter(product => {
      // Only filter uniforms, not raw materials
      if (product.productType !== 'uniform') return false;
      
      // Check if product matches the gender criteria
      const productGender = product.gender?.toLowerCase() || product.sex?.toLowerCase();
      const targetGender = gender?.toLowerCase();
      
      // Gender matching logic
      const genderMatch = 
        targetGender === 'unisex' || 
        productGender === 'unisex' ||
        productGender === targetGender;
      
      // Check if product matches the level criteria
      const productLevel = product.level?.toLowerCase();
      const targetLevel = level?.toLowerCase();
      
      // Level matching logic
      const levelMatch = 
        !targetLevel || // No level specified means all levels
        !productLevel || // Product has no level means it fits all levels
        productLevel === targetLevel;
      
      return genderMatch && levelMatch;
    });
  },

  // Get available uniforms for policy creation with detailed filtering
  getAvailableUniformsForPolicy: (gender, level) => {
    const { uniforms, uniformVariants } = get();
    
    const filteredUniforms = uniforms.filter(uniform => {
      // Check gender match
      const uniformGender = uniform.gender?.toLowerCase() || uniform.sex?.toLowerCase();
      const targetGender = gender?.toLowerCase();
      
      const genderMatch = 
        targetGender === 'unisex' || 
        uniformGender === 'unisex' ||
        uniformGender === targetGender;
      
      // Check level match
      const uniformLevel = uniform.level?.toLowerCase();
      const targetLevel = level?.toLowerCase();
      
      const levelMatch = 
        !targetLevel || 
        !uniformLevel || 
        uniformLevel === targetLevel;
      
      return genderMatch && levelMatch;
    });
    
    // Attach variants to each uniform
    return filteredUniforms.map(uniform => {
      const variants = uniformVariants.filter(variant => variant.uniformId === uniform.id);
      return { ...uniform, variants };
    });
  },

  addProduct: async (productData, type, userInfo) => {
    try {
      set({ loading: true, error: null });
      
      // CRITICAL FIX: Deduct quantities from batch inventory for all variants and sizes
      if (type === 'uniform' && productData.variants && productData.variants.length > 0) {
        
        // Process each variant and its sizes for batch deduction
        for (const variant of productData.variants) {
          if (variant.sizes && variant.sizes.length > 0) {
            for (const sizeData of variant.sizes) {
              if (sizeData.batchAllocations && sizeData.batchAllocations.length > 0) {
                // Process each batch allocation for this size
                for (const batchAllocation of sizeData.batchAllocations) {
                  await get().updateBatchInventory(
                    batchAllocation.batchId,
                    batchAllocation.variantType, // Correctly pass the variantType from the allocation
                    batchAllocation.color,       // Correctly pass the color from the allocation
                    sizeData.size,
                    sizeData.quantity
                  );
                }
              }
            }
          }
        }
      }

      if (type === 'uniform') {
        // Add uniform
        const uniformRef = await addDoc(collection(db, 'uniforms'), {
          ...productData,
          productType: 'uniform',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add variants
        const variantPromises = productData.variants.map(variant =>
          addDoc(collection(db, 'uniform_variants'), {
            uniformId: uniformRef.id,
            batchId: productData.batchId, // Include batchId from product data
            variantType: variant.variant,
            color: variant.color,
            sizes: variant.sizes,
            defaultReorderLevel: 5,
            createdAt: serverTimestamp()
          })
        );

        await Promise.all(variantPromises);
        
        // Create notification for product creation
        const { addNotification } = useNotificationStore.getState();
        await addNotification({
          type: 'product_created',
          title: 'New Product Added',
          message: `${type === 'uniform' ? 'Uniform' : 'Raw Material'} "${productData.name || productData.productName}" has been added to inventory`,
          category: 'inventory',
          priority: 'medium',
          icon: type === 'uniform' ? '👕' : '📦'
        }, userInfo);
        
        console.log('✅ Product created and batch inventory updated successfully');
      } else {
        // Add raw material
        await addDoc(collection(db, 'raw_materials'), {
          ...productData,
          productType: 'raw_material',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Create notification for raw material creation
        const { addNotification } = useNotificationStore.getState();
        await addNotification({
          type: 'product_created',
          title: 'New Raw Material Added',
          message: `Raw Material "${productData.name || productData.productName}" has been added to inventory`,
          category: 'inventory',
          priority: 'medium',
          icon: '📦'
        }, userInfo);
      }

      // Products will auto-update via real-time listeners
      set({ loading: false });
    } catch (error) {
      console.error('Error adding product:', error);
      set({ error: 'Failed to add product', loading: false });
      throw error; // Re-throw to handle in UI
    }
  },

  updateBatchInventory: async (batchId, variantType, color, size, quantityToSubtract) => {
    const batchRef = doc(db, 'batchInventory', batchId);
    try {
      const batchDoc = await getDoc(batchRef);
      
      if (batchDoc.exists()) {
        const batchData = batchDoc.data();
        
        if (!batchData.items || !Array.isArray(batchData.items)) {
          console.warn(`Batch ${batchId} has no items array, skipping deduction`);
          return;
        }
        
        const updatedItems = batchData.items.map(item => {
          if (item.variantType === variantType && item.color === color) {
            const updatedSizes = item.sizes.map(s => {
              if (s.size === size) {
                const newQuantity = (s.quantity || 0) - quantityToSubtract;
                if (newQuantity < 0) {
                  console.warn(`Negative stock for ${item.variantType} ${s.size}. Setting to 0.`);
                  return { ...s, quantity: 0 };
                }
                return { ...s, quantity: newQuantity };
              }
              return s;
            });
            return { ...item, sizes: updatedSizes };
          }
          return item;
        });

        await updateDoc(batchRef, { items: updatedItems });
      } else {
        console.warn(`Batch document not found with ID: ${batchId}`);
        return;
      }
    } catch (error) {
      console.error('Error updating batch inventory:', error);
      return;
    }
  },

  deleteProduct: async (productId, isRawMaterial, userInfo) => {
    try {
      set({ loading: true, error: null });
      
      // Get product name before deletion for notification
      const { products } = get();
      const product = products.find(p => p.id === productId);
      const productName = product?.name || product?.productName || 'Unknown Product';
      
      if (!isRawMaterial) {
        // Delete from uniforms collection
        await deleteDoc(doc(db, 'uniforms', productId));
      } else {
        // Delete from raw_materials collection
        await deleteDoc(doc(db, 'raw_materials', productId));
      }

      // Create notification for product deletion
      const { addNotification } = useNotificationStore.getState();
      await addNotification({
        type: 'product_deleted',
        title: 'Product Deleted',
        message: `${isRawMaterial ? 'Raw Material' : 'Uniform'} "${productName}" has been removed from inventory`,
        category: 'inventory',
        priority: 'medium',
        icon: '🗑️'
      }, userInfo);

      set(state => ({
        products: state.products.filter(p => p.id !== productId),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting product:', error);
      set({ error: 'Failed to delete product', loading: false });
      throw error; // Re-throw the error to be handled by the component
    }
  },

  // Check if product variant has sufficient stock
  checkProductStock: async (uniformId, size, quantityNeeded) => {
    try {
      const variantsQuery = query(collection(db, 'uniform_variants'));
      const variantsSnapshot = await getDocs(variantsQuery);
      
      for (const doc of variantsSnapshot.docs) {
        const variant = doc.data();
        if (variant.uniformId === uniformId) {
          const sizeData = variant.sizes?.find(s => s.size === size);
          if (sizeData) {
            return {
              available: sizeData.quantity >= quantityNeeded,
              currentStock: sizeData.quantity,
              variantId: doc.id,
              variant: { id: doc.id, ...variant }
            };
          }
        }
      }
      
      return { available: false, currentStock: 0, variantId: null, variant: null };
    } catch (error) {
      console.error('Error checking product stock:', error);
      throw error;
    }
  },

  // Deduct from product inventory when allocating to student
  deductProductInventory: async (variantId, size, quantity, studentId, userId) => {
    try {
      const variantRef = doc(db, 'uniform_variants', variantId);
      const variantDoc = await getDoc(variantRef);
      
      if (!variantDoc.exists()) {
        throw new Error('Variant not found');
      }
      
      const variantData = variantDoc.data();
      const updatedSizes = variantData.sizes.map(s => {
        if (s.size === size) {
          const newQuantity = (s.quantity || 0) - quantity;
          const newAllocated = (s.allocated || 0) + quantity;
          
          if (newQuantity < 0) {
            throw new Error(`Insufficient stock. Available: ${s.quantity}, Requested: ${quantity}`);
          }
          
          return {
            ...s,
            quantity: newQuantity,
            allocated: newAllocated
          };
        }
        return s;
      });
      
      // Add allocation history
      const allocationEntry = {
        studentId,
        size,
        quantity,
        allocatedBy: userId || 'unknown',
        allocatedAt: new Date().toISOString()
      };
      
      await updateDoc(variantRef, {
        sizes: updatedSizes,
        allocationHistory: arrayUnion(allocationEntry),
        updatedAt: new Date()
      });
      
      console.log('✅ Product inventory deducted:', { size, quantity, newStock: updatedSizes.find(s => s.size === size)?.quantity });
      return true;
    } catch (error) {
      console.error('Error deducting product inventory:', error);
      throw error;
    }
  },

  // Reorder from batch to product inventory with audit trail
  reorderFromBatch: async (variantId, batchId, size, quantityToAdd, userId, userName) => {
    try {
      console.log('🔄 Starting reorderFromBatch:', { variantId, batchId, size, quantityToAdd, userId, userName });
      
      // 1. Check batch has sufficient stock
      const batchRef = doc(db, 'batchInventory', batchId);
      const batchDoc = await getDoc(batchRef);
      
      if (!batchDoc.exists()) {
        console.error('❌ Batch document not found:', batchId);
        throw new Error(`Batch not found: ${batchId}`);
      }
      
      const batchData = batchDoc.data();
      const variantDoc = await getDoc(doc(db, 'uniform_variants', variantId));
      const variantData = variantDoc.data();
      
      // Find matching batch item - handle different field names
      let batchItemFound = false;
      const updatedBatchItems = batchData.items.map(item => {
        const itemVariantType = item.variantType || item.name || item.variant;
        const itemColor = item.color;
        const variantType = variantData.variantType || variantData.name;
        const variantColor = variantData.color;
        
        if (itemVariantType === variantType && itemColor === variantColor) {
          const updatedSizes = item.sizes.map(s => {
            if (s.size === size) {
              if (s.quantity < quantityToAdd) {
                throw new Error(`Insufficient batch stock. Available: ${s.quantity}, Requested: ${quantityToAdd}`);
              }
              batchItemFound = true;
              return { ...s, quantity: s.quantity - quantityToAdd };
            }
            return s;
          });
          return { ...item, sizes: updatedSizes };
        }
        return item;
      });
      
      if (!batchItemFound) {
        console.error('❌ Size not found in batch inventory:', { size, variantType, variantColor });
        throw new Error(`Size ${size} not found in batch inventory for ${variantType} - ${variantColor}`);
      }
      
      // 2. Deduct from batch
      await updateDoc(batchRef, { items: updatedBatchItems });
      
      // 3. Add to product inventory
      console.log('📦 Current variant sizes before update:', variantData.sizes);
      const updatedVariantSizes = variantData.sizes.map(s => {
        if (s.size === size) {
          const newQuantity = Number(s.quantity || 0) + Number(quantityToAdd);
          console.log(`📦 Updating size ${size}: ${s.quantity || 0} + ${quantityToAdd} = ${newQuantity}`);
          return { ...s, quantity: newQuantity };
        }
        return s;
      });
      
      console.log('📦 Updated variant sizes:', updatedVariantSizes);
      
      // 4. Add reorder history entry
      const reorderEntry = {
        reorderId: `REORDER-${Date.now()}`,
        reorderedBy: userId || 'unknown',
        reorderedByName: userName || 'Unknown User',
        reorderDate: new Date().toISOString(),
        quantityAdded: quantityToAdd,
        sizeReordered: size,
        batchId: batchId,
        remainingBatchStock: updatedBatchItems
          .flatMap(item => item.sizes)
          .find(s => s.size === size)?.quantity || 0
      };
      
      console.log('📦 Updating Firebase with new sizes and reorder history');
      await updateDoc(doc(db, 'uniform_variants', variantId), {
        sizes: updatedVariantSizes,
        reorderHistory: arrayUnion(reorderEntry),
        totalReorders: (variantData.totalReorders || 0) + 1,
        updatedAt: new Date()
      });
      
      console.log('✅ Reordered from batch successfully:', reorderEntry);
      return reorderEntry;
    } catch (error) {
      console.error('Error reordering from batch:', error);
      throw error;
    }
  },

  // Get product stock levels for display
  getProductStockLevels: async (uniformId) => {
    try {
      const variantsQuery = query(collection(db, 'uniform_variants'));
      const variantsSnapshot = await getDocs(variantsQuery);
      
      const stockLevels = [];
      for (const doc of variantsSnapshot.docs) {
        const variant = doc.data();
        if (variant.uniformId === uniformId) {
          variant.sizes?.forEach(sizeData => {
            const reorderLevel = sizeData.reorderLevel || variant.defaultReorderLevel || 5;
            stockLevels.push({
              variantId: doc.id,
              color: variant.color,
              size: sizeData.size,
              quantity: sizeData.quantity || 0,
              allocated: sizeData.allocated || 0,
              reorderLevel: reorderLevel,
              status: getStockStatus(sizeData.quantity || 0, reorderLevel)
            });
          });
        }
      }
      
      return stockLevels;
    } catch (error) {
      console.error('Error getting stock levels:', error);
      return [];
    }
  },

  // Set reorder level for a specific product variant size
  setProductReorderLevel: async (variantId, size, reorderLevel) => {
    try {
      const variantRef = doc(db, 'uniform_variants', variantId);
      const variantDoc = await getDoc(variantRef);
      
      if (!variantDoc.exists()) {
        throw new Error('Variant not found');
      }
      
      const variantData = variantDoc.data();
      const updatedSizes = variantData.sizes.map(s => {
        if (s.size === size) {
          return { ...s, reorderLevel };
        }
        return s;
      });
      
      await updateDoc(variantRef, {
        sizes: updatedSizes,
        updatedAt: new Date()
      });
      
      console.log('✅ Reorder level set:', { variantId, size, reorderLevel });
      return true;
    } catch (error) {
      console.error('Error setting reorder level:', error);
      throw error;
    }
  },

  // Set default reorder level for entire product variant
  setDefaultReorderLevel: async (variantId, defaultReorderLevel) => {
    try {
      const variantRef = doc(db, 'uniform_variants', variantId);
      
      await updateDoc(variantRef, {
        defaultReorderLevel,
        updatedAt: new Date()
      });
      
      console.log('✅ Default reorder level set:', { variantId, defaultReorderLevel });
      return true;
    } catch (error) {
      console.error('Error setting default reorder level:', error);
      throw error;
    }
  },

  // Get low stock alerts across all products
  getLowStockAlerts: async () => {
    try {
      const variantsQuery = query(collection(db, 'uniform_variants'));
      const variantsSnapshot = await getDocs(variantsQuery);
      
      const alerts = [];
      
      for (const doc of variantsSnapshot.docs) {
        const variant = doc.data();
        const defaultReorderLevel = variant.defaultReorderLevel || 5;
        
        variant.sizes?.forEach(sizeData => {
          const reorderLevel = sizeData.reorderLevel || defaultReorderLevel;
          const quantity = sizeData.quantity || 0;
          
          if (quantity <= reorderLevel && quantity > 0) {
            alerts.push({
              variantId: doc.id,
              uniformId: variant.uniformId,
              color: variant.color,
              size: sizeData.size,
              currentStock: quantity,
              reorderLevel: reorderLevel,
              alertType: 'LOW_STOCK',
              batchId: variant.batchId
            });
          } else if (quantity === 0) {
            alerts.push({
              variantId: doc.id,
              uniformId: variant.uniformId,
              color: variant.color,
              size: sizeData.size,
              currentStock: 0,
              reorderLevel: reorderLevel,
              alertType: 'OUT_OF_STOCK',
              batchId: variant.batchId
            });
          }
        });
      }
      
      return alerts;
    } catch (error) {
      console.error('Error getting low stock alerts:', error);
      return [];
    }
  },

  // Set reorder level for batch inventory
  setBatchReorderLevel: async (batchId, variantType, color, size, reorderLevel, reorderQuantity) => {
    try {
      const batchRef = doc(db, 'batchInventory', batchId);
      const batchDoc = await getDoc(batchRef);
      
      if (!batchDoc.exists()) {
        throw new Error('Batch not found');
      }
      
      const batchData = batchDoc.data();
      const updatedItems = batchData.items.map(item => {
        if (item.variantType === variantType && item.color === color) {
          const updatedSizes = item.sizes.map(s => {
            if (s.size === size) {
              return {
                ...s,
                reorderLevel: reorderLevel,
                reorderQuantity: reorderQuantity || reorderLevel * 2 // Default: reorder 2x the threshold
              };
            }
            return s;
          });
          return { ...item, sizes: updatedSizes };
        }
        return item;
      });
      
      await updateDoc(batchRef, {
        items: updatedItems,
        updatedAt: new Date()
      });
      
      console.log('✅ Batch reorder level set:', { batchId, variantType, color, size, reorderLevel });
      return true;
    } catch (error) {
      console.error('Error setting batch reorder level:', error);
      throw error;
    }
  },

  // Get batch low stock alerts
  getBatchLowStockAlerts: async () => {
    try {
      const batchQuery = query(collection(db, 'batchInventory'));
      const batchSnapshot = await getDocs(batchQuery);
      
      const alerts = [];
      
      for (const doc of batchSnapshot.docs) {
        const batch = doc.data();
        
        batch.items?.forEach(item => {
          item.sizes?.forEach(sizeData => {
            const reorderLevel = sizeData.reorderLevel || 10; // Default batch reorder at 10
            const quantity = sizeData.quantity || 0;
            
            if (quantity <= reorderLevel && quantity > 0) {
              alerts.push({
                batchId: doc.id,
                batchNumber: batch.batchNumber,
                variantType: item.variantType,
                color: item.color,
                size: sizeData.size,
                currentStock: quantity,
                reorderLevel: reorderLevel,
                reorderQuantity: sizeData.reorderQuantity || reorderLevel * 2,
                alertType: 'LOW_STOCK'
              });
            } else if (quantity === 0) {
              alerts.push({
                batchId: doc.id,
                batchNumber: batch.batchNumber,
                variantType: item.variantType,
                color: item.color,
                size: sizeData.size,
                currentStock: 0,
                reorderLevel: reorderLevel,
                reorderQuantity: sizeData.reorderQuantity || reorderLevel * 2,
                alertType: 'OUT_OF_STOCK'
              });
            }
          });
        });
      }
      
      return alerts;
    } catch (error) {
      console.error('Error getting batch low stock alerts:', error);
      return [];
    }
  }
}));

// Helper function for stock status with configurable reorder level
function getStockStatus(quantity, reorderLevel = 5) {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
} 