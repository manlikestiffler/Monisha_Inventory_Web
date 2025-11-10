import { useInventoryStore } from './inventoryStore';
import { useSchoolStore } from './schoolStore';
import { useBatchStore } from './batchStore';
import { useOrderStore } from './orderStore';
import { useReportStore } from './reportStore';
import { useAuthStore } from './authStore';

export const useStore = () => ({
  inventory: useInventoryStore(),
  schools: useSchoolStore(),
  batches: useBatchStore(),
  orders: useOrderStore(),
  reports: useReportStore(),
  auth: useAuthStore()
}); 