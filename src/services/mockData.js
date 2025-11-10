export const mockData = {
  uniforms: [
    {
      id: 1,
      name: 'School Blazer',
      category: 'Formal',
      stock: 150,
      variants: ['S', 'M', 'L', 'XL'],
      material: 'Polyester Blend',
      price: 1200
    },
    {
      id: 2,
      name: 'White Shirt',
      category: 'Regular',
      stock: 300,
      variants: ['S', 'M', 'L'],
      material: 'Cotton',
      price: 450
    },
    {
      id: 3,
      name: 'Grey Trousers',
      category: 'Regular',
      stock: 200,
      variants: ['28', '30', '32', '34'],
      material: 'Polyester Cotton',
      price: 650
    }
  ],

  schools: [
    {
      id: 1,
      name: 'St. Mary\'s High School',
      address: '123 Education Street, City',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'contact@stmarys.edu'
    },
    {
      id: 2,
      name: 'Delhi Public School',
      address: '456 Learning Avenue, Town',
      contactPerson: 'Jane Smith',
      phone: '9876543210',
      email: 'info@dps.edu'
    }
  ],

  batches: [
    {
      id: 1,
      batchId: 'B001',
      productName: 'School Blazer',
      quantity: 100,
      status: 'inProduction',
      startDate: '2024-01-10',
      expectedCompletion: '2024-01-20'
    },
    {
      id: 2,
      batchId: 'B002',
      productName: 'White Shirt',
      quantity: 200,
      status: 'completed',
      startDate: '2024-01-05',
      completionDate: '2024-01-15'
    }
  ],

  orders: [
    {
      id: 1,
      orderId: 'ORD001',
      schoolName: 'St. Mary\'s High School',
      date: '2024-01-12',
      status: 'processing',
      total: 25000,
      items: [
        { id: 1, name: 'School Blazer', quantity: 50, price: 500 }
      ]
    },
    {
      id: 2,
      orderId: 'ORD002',
      schoolName: 'Delhi Public School',
      date: '2024-01-15',
      status: 'completed',
      total: 35000,
      items: [
        { id: 1, name: 'White Shirt', quantity: 100, price: 350 }
      ]
    }
  ]
};

export const mockApi = {
  get: async (endpoint) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockData[endpoint] || [];
  },

  post: async (endpoint, data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { ...data, id: Date.now() };
  },

  put: async (endpoint, id, data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { ...data, id };
  },

  delete: async (endpoint, id) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  }
}; 