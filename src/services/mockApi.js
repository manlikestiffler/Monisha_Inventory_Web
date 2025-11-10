// Mock data for development
const mockData = {
  uniforms: [
    {
      id: '1',
      name: 'Summer Uniform Set',
      description: 'Premium cotton summer uniform set with breathable fabric',
      category: 'summer',
      price: 49.99,
      variants: [
        { id: '1a', size: 'S', color: 'White', quantity: 100 },
        { id: '1b', size: 'M', color: 'White', quantity: 150 },
        { id: '1c', size: 'L', color: 'White', quantity: 75 }
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: '2',
      name: 'Winter Blazer',
      description: 'Warm wool blend winter blazer with school logo',
      category: 'winter',
      price: 89.99,
      variants: [
        { id: '2a', size: 'S', color: 'Navy', quantity: 80 },
        { id: '2b', size: 'M', color: 'Navy', quantity: 120 },
        { id: '2c', size: 'L', color: 'Navy', quantity: 60 }
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: '3',
      name: 'Sports Kit',
      description: 'Complete sports uniform with moisture-wicking fabric',
      category: 'sports',
      price: 45.99,
      variants: [
        { id: '3a', size: 'S', color: 'Blue', quantity: 90 },
        { id: '3b', size: 'M', color: 'Blue', quantity: 130 },
        { id: '3c', size: 'L', color: 'Blue', quantity: 70 }
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    }
  ],
  transactions: [
    {
      id: 'T1',
      schoolId: 'S1',
      items: [
        { uniformId: '1', variantId: '1a', quantity: 10, price: 49.99 }
      ],
      totalAmount: 499.90,
      status: 'completed',
      paymentMethod: 'card',
      paymentDate: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'T2',
      schoolId: 'S2',
      items: [
        { uniformId: '2', variantId: '2b', quantity: 15, price: 89.99 }
      ],
      totalAmount: 1349.85,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      createdAt: '2024-01-16T09:00:00Z',
      updatedAt: '2024-01-16T09:00:00Z'
    }
  ],
  schools: [
    {
      id: 'S1',
      name: 'Washington High',
      address: '123 School St',
      city: 'Washington',
      state: 'DC',
      pincode: '20001',
      contactPerson: 'John Doe',
      phone: '(202) 555-0123',
      email: 'contact@washingtonhigh.edu',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'S2',
      name: 'St. John Prep',
      address: '456 Education Ave',
      city: 'Boston',
      state: 'MA',
      pincode: '02108',
      contactPerson: 'Jane Smith',
      phone: '(617) 555-0123',
      email: 'office@stjohnprep.edu',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ],
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

// Mock API service
const mockApi = {
  get: async (endpoint) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (endpoint.includes('?')) {
      // Handle queries
      const [base, params] = endpoint.split('?');
      const searchParams = new URLSearchParams(params);
      
      if (base === '/api/transactions') {
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const schoolId = searchParams.get('schoolId');
        
        let filtered = [...mockData.transactions];
        
        if (startDate && endDate) {
          filtered = filtered.filter(t => 
            new Date(t.createdAt) >= new Date(startDate) &&
            new Date(t.createdAt) <= new Date(endDate)
          );
        }
        
        if (schoolId) {
          filtered = filtered.filter(t => t.schoolId === schoolId);
        }
        
        return filtered;
      }
    }
    
    switch (endpoint) {
      case '/api/uniforms':
        return mockData.uniforms;
      case '/api/transactions':
        return mockData.transactions;
      case '/api/schools':
        return mockData.schools;
      case '/api/batches':
        return mockData.batches;
      default:
        if (endpoint.startsWith('/api/uniforms/')) {
          const id = endpoint.split('/')[3];
          const uniform = mockData.uniforms.find(u => u.id === id);
          if (uniform) return uniform;
        }
        throw new Error('Endpoint not found');
    }
  },

  post: async (endpoint, data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const now = new Date().toISOString();
    
    switch (endpoint) {
      case '/api/uniforms':
        const newUniform = {
          id: Date.now().toString(),
          ...data,
          createdAt: now,
          updatedAt: now
        };
        mockData.uniforms.push(newUniform);
        return newUniform;
        
      case '/api/transactions':
        const newTransaction = {
          id: `T${Date.now()}`,
          ...data,
          createdAt: now,
          updatedAt: now
        };
        mockData.transactions.push(newTransaction);
        return newTransaction;
        
      case '/api/schools':
        const newSchool = {
          id: `S${Date.now()}`,
          ...data,
          createdAt: now,
          updatedAt: now
        };
        mockData.schools.push(newSchool);
        return newSchool;
        
      case '/api/batches':
        const newBatch = {
          id: `B${Date.now()}`,
          ...data,
          createdAt: now,
          updatedAt: now
        };
        mockData.batches.push(newBatch);
        return newBatch;
        
      default:
        throw new Error('Endpoint not found');
    }
  },

  patch: async (endpoint, data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const now = new Date().toISOString();
    
    if (endpoint.startsWith('/api/uniforms/')) {
      const id = endpoint.split('/')[3];
      const index = mockData.uniforms.findIndex(u => u.id === id);
      if (index !== -1) {
        mockData.uniforms[index] = {
          ...mockData.uniforms[index],
          ...data,
          updatedAt: now
        };
        return mockData.uniforms[index];
      }
    }
    
    if (endpoint.startsWith('/api/transactions/')) {
      const id = endpoint.split('/')[3];
      const index = mockData.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        mockData.transactions[index] = {
          ...mockData.transactions[index],
          ...data,
          updatedAt: now
        };
        return mockData.transactions[index];
      }
    }
    
    if (endpoint.startsWith('/api/batches/')) {
      const id = endpoint.split('/')[3];
      const index = mockData.batches.findIndex(b => b.id === id);
      if (index !== -1) {
        mockData.batches[index] = {
          ...mockData.batches[index],
          ...data,
          updatedAt: now
        };
        return mockData.batches[index];
      }
    }
    
    throw new Error('Endpoint not found');
  },

  delete: async (endpoint) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (endpoint.startsWith('/api/uniforms/')) {
      const id = endpoint.split('/')[3];
      const index = mockData.uniforms.findIndex(u => u.id === id);
      if (index !== -1) {
        mockData.uniforms.splice(index, 1);
        return true;
      }
    }
    
    if (endpoint.startsWith('/api/transactions/')) {
      const id = endpoint.split('/')[3];
      const index = mockData.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        mockData.transactions.splice(index, 1);
        return true;
      }
    }
    
    if (endpoint.startsWith('/api/batches/')) {
      const id = endpoint.split('/')[3];
      const index = mockData.batches.findIndex(b => b.id === id);
      if (index !== -1) {
        mockData.batches.splice(index, 1);
        return true;
      }
    }
    
    throw new Error('Endpoint not found');
  }
};

export default mockApi;