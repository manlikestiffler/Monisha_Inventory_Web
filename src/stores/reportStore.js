import { create } from 'zustand';

const mockData = {
  totalRevenue: 1250000,
  totalOrders: 450,
  lowStockItems: 12,
  averageOrderValue: 2778,
  monthlyRevenue: [
    { month: 'Jan', revenue: 95000, orders: 35 },
    { month: 'Feb', revenue: 115000, orders: 42 },
    { month: 'Mar', revenue: 125000, orders: 45 },
    { month: 'Apr', revenue: 140000, orders: 50 },
    { month: 'May', revenue: 135000, orders: 48 },
    { month: 'Jun', revenue: 150000, orders: 55 }
  ],
  topSellingUniforms: [
    { name: 'School Shirt', quantity: 250, revenue: 125000 },
    { name: 'Trousers', quantity: 200, revenue: 100000 },
    { name: 'Blazer', quantity: 150, revenue: 225000 },
    { name: 'PE Kit', quantity: 180, revenue: 90000 },
    { name: 'Tie', quantity: 300, revenue: 45000 }
  ],
  batchEfficiency: [
    { name: 'Completed', value: 65 },
    { name: 'In Progress', value: 25 },
    { name: 'Pending', value: 10 }
  ],
  batchCosts: [
    { id: 'B001', name: 'Summer Uniforms', cost: 250000, quantity: 500 },
    { id: 'B002', name: 'Winter Uniforms', cost: 350000, quantity: 400 },
    { id: 'B003', name: 'Sports Kits', cost: 180000, quantity: 300 }
  ],
  schoolPerformance: [
    {
      id: 1,
      name: "Delhi Public School",
      location: 'Delhi',
      orders: 120,
      pendingOrders: 5,
      revenue: 450000,
      paymentStatus: 'paid',
      lastOrder: '2024-01-10'
    },
    {
      id: 2,
      name: "St. Mary's School",
      location: 'Mumbai',
      orders: 85,
      pendingOrders: 8,
      revenue: 320000,
      paymentStatus: 'partial',
      lastOrder: '2024-01-12'
    },
    {
      id: 3,
      name: "Kendriya Vidyalaya",
      location: 'Bangalore',
      orders: 95,
      pendingOrders: 0,
      revenue: 380000,
      paymentStatus: 'paid',
      lastOrder: '2024-01-14'
    },
    {
      id: 4,
      name: "Army Public School",
      location: 'Chennai',
      orders: 75,
      pendingOrders: 12,
      revenue: 280000,
      paymentStatus: 'pending',
      lastOrder: '2024-01-08'
    }
  ],
  inventoryAlerts: [
    { type: 'Low Stock', count: 8, status: 'warning' },
    { type: 'Out of Stock', count: 4, status: 'error' },
    { type: 'Reorder Required', count: 6, status: 'info' }
  ],
  recentTransactions: [
    {
      id: 'T001',
      school: "Delhi Public School",
      amount: 85000,
      date: '2024-01-14',
      status: 'completed'
    },
    {
      id: 'T002',
      school: "St. Mary's School",
      amount: 65000,
      date: '2024-01-13',
      status: 'pending'
    },
    {
      id: 'T003',
      school: "Kendriya Vidyalaya",
      amount: 72000,
      date: '2024-01-12',
      status: 'completed'
    }
  ],
  sizeDistribution: {
    shirts: {
      'XS': { count: 150, percentage: 10, trend: '+5%' },
      'S': { count: 300, percentage: 20, trend: '+8%' },
      'M': { count: 450, percentage: 30, trend: '+2%' },
      'L': { count: 375, percentage: 25, trend: '-3%' },
      'XL': { count: 225, percentage: 15, trend: '+1%' }
    },
    trousers: {
      '26': { count: 180, percentage: 12, trend: '+4%' },
      '28': { count: 285, percentage: 19, trend: '+6%' },
      '30': { count: 420, percentage: 28, trend: '+3%' },
      '32': { count: 375, percentage: 25, trend: '-2%' },
      '34': { count: 240, percentage: 16, trend: '+1%' }
    }
  },
  recommendations: {
    inventory: [
      {
        category: 'Shirts',
        sizes: [
          { size: 'M', suggestedStock: 500, currentStock: 450, reason: 'High demand trend' },
          { size: 'S', suggestedStock: 350, currentStock: 300, reason: 'Growing segment' }
        ],
        trend: 'increasing'
      },
      {
        category: 'Trousers',
        sizes: [
          { size: '30', suggestedStock: 450, currentStock: 420, reason: 'Popular size' },
          { size: '28', suggestedStock: 300, currentStock: 285, reason: 'Growing demand' }
        ],
        trend: 'stable'
      }
    ],
    restockPriority: [
      { item: 'White Shirts - M', priority: 'High', deficit: 50 },
      { item: 'Grey Trousers - 30', priority: 'Medium', deficit: 30 }
    ]
  },
  schoolSpecificAnalytics: {
    sizePreferences: [
      {
        schoolId: 1,
        name: "Delhi Public School",
        preferences: {
          shirts: { topSize: 'M', percentage: 35 },
          trousers: { topSize: '30', percentage: 32 }
        },
        studentCount: 1200,
        gradeDistribution: {
          'Primary (1-5)': 40,
          'Middle (6-8)': 35,
          'High (9-12)': 25
        }
      },
      // ... more schools
    ],
    seasonalTrends: {
      summer: {
        topItems: ['White Shirts', 'Grey Shorts'],
        peakMonth: 'April',
        averageOrderSize: 85
      },
      winter: {
        topItems: ['Sweaters', 'Blazers'],
        peakMonth: 'November',
        averageOrderSize: 120
      }
    }
  },
  inventoryAnalytics: {
    stockUtilization: {
      overallRate: 78,
      byCategory: [
        { category: 'Shirts', rate: 82, value: 450000 },
        { category: 'Trousers', rate: 75, value: 380000 },
        { category: 'Blazers', rate: 65, value: 620000 }
      ]
    },
    warehouseCapacity: {
      total: 10000,
      used: 7800,
      byLocation: [
        { location: 'Main Warehouse', capacity: 6000, used: 4800 },
        { location: 'Secondary Storage', capacity: 4000, used: 3000 }
      ]
    }
  },
  qualityMetrics: {
    returns: {
      rate: 2.5,
      topReasons: [
        { reason: 'Size Issue', percentage: 45 },
        { reason: 'Quality Concern', percentage: 30 },
        { reason: 'Wrong Item', percentage: 25 }
      ]
    },
    satisfaction: {
      overall: 4.2,
      byCategory: [
        { category: 'Product Quality', rating: 4.3 },
        { category: 'Size Accuracy', rating: 4.0 },
        { category: 'Durability', rating: 4.4 }
      ]
    }
  },
  forecastAnalytics: {
    nextQuarter: {
      expectedDemand: {
        total: 5200,
        byCategory: [
          { category: 'Shirts', quantity: 2000, growth: '+8%' },
          { category: 'Trousers', quantity: 1800, growth: '+5%' },
          { category: 'Blazers', quantity: 1400, growth: '+12%' }
        ]
      },
      suggestedPreparation: [
        {
          action: 'Increase Production',
          items: ['White Shirts - M, L', 'Grey Trousers - 30, 32'],
          reason: 'Expected 15% growth in demand'
        },
        {
          action: 'Stock Optimization',
          items: ['Reduce XS sizes', 'Increase L sizes'],
          reason: 'Shifting size demographics'
        }
      ]
    },
    seasonalPlanning: {
      upcomingSeason: 'Summer 2024',
      keyFocus: [
        {
          category: 'Summer Uniforms',
          expectedDemand: 3000,
          productionDeadline: '2024-03-15',
          notes: 'Start production early due to expected material delays'
        }
      ]
    }
  }
};

export const useReportStore = create((set) => ({
  metrics: null,
  loading: false,
  error: null,

  fetchMetrics: async () => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ metrics: mockData, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  exportReport: async (format) => {
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Exporting report in ${format} format`);
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
})); 