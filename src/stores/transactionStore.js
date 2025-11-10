import { create } from 'zustand';
import mockApi from '../services/mockApi.js';

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const data = await mockApi.get('/api/transactions');
      set({ transactions: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addTransaction: async (transaction) => {
    try {
      const data = await mockApi.post('/api/transactions', transaction);
      set((state) => ({
        transactions: [...state.transactions, data],
      }));
      return data;
    } catch (error) {
      throw error;
    }
  },

  updateTransaction: async (id, data) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updatedTransaction = await response.json();
      
      if (!response.ok) throw new Error(updatedTransaction.message);
      
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, ...updatedTransaction } : t
        ),
      }));
    } catch (error) {
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },

  updatePaymentStatus: async (id, status) => {
    try {
      const response = await fetch(`/api/transactions/${id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, paymentStatus: status } : t
        ),
      }));
    } catch (error) {
      throw error;
    }
  },

  getTransactionsBySchool: (schoolId) => {
    const state = get();
    return state.transactions.filter(t => t.schoolId === schoolId);
  },

  getTransactionsByDateRange: (startDate, endDate) => {
    const state = get();
    return state.transactions.filter(t => {
      const date = new Date(t.createdAt);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  },
})); 