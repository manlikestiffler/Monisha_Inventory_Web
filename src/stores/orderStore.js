import { create } from 'zustand';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

const useOrderStore = create((set, get) => ({
  orders: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchOrders: async (force = false) => {
    // If we have data and it's less than 5 minutes old, don't fetch again
    const now = Date.now();
    if (!force && get().orders.length > 0 && get().lastFetch && now - get().lastFetch < 300000) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      set({ orders, loading: false, lastFetch: now });
    } catch (error) {
      console.error('Error fetching orders:', error);
      set({ error: error.message, loading: false });
    }
  },

  getOrderById: async (id) => {
    try {
      if (!id) {
        console.error('No order ID provided');
        return null;
      }

      // First check if we have it in the store
      const cachedOrder = get().orders.find(order => order.id === id);
      if (cachedOrder) {
        return cachedOrder;
      }

      const docRef = doc(db, 'orders', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const orderData = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date()
        };
        return orderData;
      }
      return null;
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  },

  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newOrder = {
        id: docRef.id,
        ...orderData,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      set(state => ({
        orders: [newOrder, ...state.orders],
        loading: false
      }));

      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateOrder: async (orderId, updateData) => {
    set({ loading: true, error: null });
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        ...updateData,
        updatedAt: new Date()
      });

      set(state => ({
        orders: state.orders.map(order =>
          order.id === orderId
            ? {
                ...order,
                ...updateData,
                updatedAt: new Date()
              }
            : order
        ),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating order:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteOrder: async (orderId) => {
    set({ loading: true, error: null });
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      set(state => ({
        orders: state.orders.filter(order => order.id !== orderId),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting order:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  getOrdersBySchool: async (schoolId) => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Error getting orders by school:', error);
      throw error;
    }
  },

  getOrdersByStatus: async (status) => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Error getting orders by status:', error);
      throw error;
    }
  }
}));

export { useOrderStore }; 