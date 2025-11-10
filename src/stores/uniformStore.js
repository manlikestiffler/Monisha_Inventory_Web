import { create } from 'zustand';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useBatchStore } from './batchStore';

export const useUniformStore = create((set, get) => ({
  uniforms: [],
  loading: false,
  error: null,

  // Get all available uniforms
  getAvailableUniforms: async () => {
    try {
      set({ loading: true, error: null });
      const uniformsSnapshot = await getDocs(collection(db, 'uniforms'));
      const uniformsData = uniformsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ uniforms: uniformsData });
      return uniformsData;
    } catch (error) {
      console.error('Error fetching uniforms:', error);
      set({ error: error.message });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  // Add a new uniform and update batch inventory
  addUniform: async (uniformData) => {
    try {
      set({ loading: true, error: null });

      // Update batch inventory
      if (uniformData.variants) {
        await get().updateBatchInventory(uniformData.variants);
      }

      const docRef = await addDoc(collection(db, 'uniforms'), uniformData);
      const newUniform = { id: docRef.id, ...uniformData };
      set(state => ({ uniforms: [...state.uniforms, newUniform] }));
      return newUniform;
    } catch (error) {
      console.error('Error adding uniform:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Update batch inventory based on uniform variants
  updateBatchInventory: async (variants) => {
    const { batches, fetchBatches, updateBatch } = useBatchStore.getState();

    // Ensure batches are fetched
    if (batches.length === 0) {
      await fetchBatches();
    }
    
    for (const variant of variants) {
      for (const sizeInfo of variant.sizes) {
        const { size, quantity, batchId } = sizeInfo;

        if (!batchId || !quantity) continue;

        try {
          const batchRef = doc(db, 'batchInventory', batchId);
          
          await runTransaction(db, async (transaction) => {
            const batchDoc = await transaction.get(batchRef);

            if (!batchDoc.exists()) {
              throw new Error(`Batch with id ${batchId} not found`);
            }
            
            const batchData = batchDoc.data();
            const itemIndex = batchData.items.findIndex(
              (item) => item.variantType === variant.type && item.color === variant.color
            );

            if (itemIndex > -1) {
              const sizeIndex = batchData.items[itemIndex].sizes.findIndex(
                (s) => s.size === size
              );

              if (sizeIndex > -1) {
                const currentQuantity = batchData.items[itemIndex].sizes[sizeIndex].quantity;
                if (currentQuantity < quantity) {
                  throw new Error(`Not enough stock for ${variant.type} ${variant.color} size ${size}`);
                }
                batchData.items[itemIndex].sizes[sizeIndex].quantity -= quantity;
              } else {
                throw new Error(`Size ${size} not found for ${variant.type} ${variant.color}`);
              }
            } else {
              throw new Error(`Item ${variant.type} with color ${variant.color} not found in batch`);
            }

            transaction.update(batchRef, { items: batchData.items });
          });

        } catch (error) {
          console.error('Failed to update batch inventory', error);
          throw error;
        }
      }
    }
  },

  // Update an existing uniform
  updateUniform: async (uniformId, updateData) => {
    try {
      set({ loading: true, error: null });
      const uniformRef = doc(db, 'uniforms', uniformId);
      await updateDoc(uniformRef, updateData);
      set(state => ({
        uniforms: state.uniforms.map(uniform =>
          uniform.id === uniformId ? { ...uniform, ...updateData } : uniform
        )
      }));
      return { id: uniformId, ...updateData };
    } catch (error) {
      console.error('Error updating uniform:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Delete a uniform
  deleteUniform: async (uniformId) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'uniforms', uniformId));
      set(state => ({
        uniforms: state.uniforms.filter(uniform => uniform.id !== uniformId)
      }));
    } catch (error) {
      console.error('Error deleting uniform:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
})); 