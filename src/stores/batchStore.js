import { create } from 'zustand';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import useNotificationStore from './notificationStore';
import mockApi from '../services/mockApi.js';

// Add batch data to mockApi.js
const batchData = {
  batches: [
    {
      id: 'B1',
      schoolId: 'S1',
      uniformId: '1',
      quantity: 100,
      status: 'in_production',
      expectedDeliveryDate: '2024-02-01',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'B2',
      schoolId: 'S2',
      uniformId: '2',
      quantity: 150,
      status: 'completed',
      deliveryDate: '2024-01-10',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-10T15:00:00Z'
    }
  ]
};

export const useBatchStore = create((set, get) => ({
  batches: [],
  loading: false,
  error: null,

  fetchBatches: async () => {
    set({ loading: true });
    try {
      const batchesSnapshot = await getDocs(collection(db, 'batchInventory'));
      const batchesData = batchesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id, // Must come AFTER spread to overwrite any local id field
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      set({ batches: batchesData, loading: false });
    } catch (error) {
      console.error('Error fetching batches:', error);
      set({ error: error.message, loading: false });
    }
  },

  getBatch: async (id) => {
    try {
      const batchDoc = await getDoc(doc(db, 'batchInventory', id));
      if (batchDoc.exists()) {
        const data = batchDoc.data();
        return {
          ...data,
          id: batchDoc.id, // Must come AFTER spread to overwrite any local id field
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting batch:', error);
      throw error;
    }
  },

  subscribeToBatch: (id, callback) => {
    const batchRef = doc(db, 'batchInventory', id);
    const unsubscribe = onSnapshot(batchRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          ...data,
          id: doc.id, // Must come AFTER spread to overwrite any local id field
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("Error subscribing to batch:", error);
      callback(null);
    });
    return unsubscribe;
  },

  addBatch: async (batch, userInfo) => {
    try {
      // Add to Firebase
      const docRef = await addDoc(collection(db, 'batchInventory'), {
        ...batch,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update local state
      const newBatch = {
        id: docRef.id,
        ...batch,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      set((state) => ({
        batches: [...state.batches, newBatch]
      }));

      // Create notification for batch creation
      const { addNotification } = useNotificationStore.getState();
      const itemCount = batch.items?.length || 0;
      await addNotification({
        type: 'batch_created',
        title: 'New Batch Created',
        message: `Batch "${batch.name || batch.batchNumber}" created with ${itemCount} products`,
        category: 'inventory',
        priority: 'medium',
        icon: '📦'
      }, userInfo);

      return newBatch;
    } catch (error) {
      console.error('Error adding batch:', error);
      throw error;
    }
  },

  updateBatch: async (id, data, userInfo) => {
    try {
      const batchRef = doc(db, 'batchInventory', id);
      await updateDoc(batchRef, {
        ...data,
        updatedAt: new Date(),
        updatedBy: userInfo?.id || 'unknown'
      });

      set((state) => ({
        batches: state.batches.map((b) =>
          b.id === id ? { ...b, ...data, updatedAt: new Date(), updatedBy: userInfo?.id || 'unknown' } : b
        )
      }));

      // Create notification for batch update
      if (userInfo) {
        const { addNotification } = useNotificationStore.getState();
        await addNotification({
          type: 'batch_updated',
          title: 'Batch Updated',
          message: `Batch "${data.name || 'Unknown'}" was updated by ${userInfo.name || 'Unknown User'}`,
          category: 'inventory',
          priority: 'low',
          icon: '📝'
        }, userInfo);
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error;
    }
  },

  deleteBatch: async (id, userInfo) => {
    try {
      // Get batch name before deletion for notification
      const { batches } = get();
      const batch = batches.find(b => b.id === id);
      const batchName = batch?.name || batch?.batchNumber || 'Unknown Batch';

      // Delete from Firebase
      await deleteDoc(doc(db, 'batchInventory', id));

      // Update local state
      set((state) => ({
        batches: state.batches.filter(batch => batch.id !== id)
      }));

      // Create notification for batch deletion
      const { addNotification } = useNotificationStore.getState();
      await addNotification({
        type: 'batch_deleted',
        title: 'Batch Deleted',
        message: `Batch "${batchName}" has been removed from inventory`,
        category: 'inventory',
        priority: 'medium',
        icon: '🗑️'
      }, userInfo);
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw error;
    }
  },

  updateBatchStatus: async (id, status) => {
    try {
      const updatedBatch = await mockApi.patch(`/api/batches/${id}/status`, { status });
      set((state) => ({
        batches: state.batches.map((b) =>
          b.id === id ? { ...b, status } : b
        )
      }));
      return updatedBatch;
    } catch (error) {
      throw error;
    }
  },

  getBatchesBySchool: (schoolId) => {
    const state = get();
    return state.batches.filter(b => b.schoolId === schoolId);
  },

  getBatchesByStatus: (status) => {
    const state = get();
    return state.batches.filter(b => b.status === status);
  }
})); 