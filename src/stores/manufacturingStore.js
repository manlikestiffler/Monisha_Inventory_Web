import { create } from 'zustand';

const mockBatches = [
  {
    id: 1,
    batchId: 'B001',
    productName: 'School Blazer',
    quantity: 100,
    status: 'inProduction',
    startDate: '2024-01-10',
    expectedCompletion: '2024-01-20'
  },
  // Add more mock data...
];

export const useManufacturingStore = create((set) => ({
  batches: [],
  loading: false,
  error: null,

  fetchBatches: async () => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ batches: mockBatches, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch batches', loading: false });
    }
  },

  addBatch: (batch) => {
    set((state) => ({
      batches: [...state.batches, { id: Date.now(), ...batch }]
    }));
  },

  updateBatch: (id, updates) => {
    set((state) => ({
      batches: state.batches.map((batch) =>
        batch.id === id ? { ...batch, ...updates } : batch
      )
    }));
  },

  deleteBatch: (id) => {
    set((state) => ({
      batches: state.batches.filter((batch) => batch.id !== id)
    }));
  }
})); 