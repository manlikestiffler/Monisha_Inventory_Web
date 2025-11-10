import { mockApi } from './mockData';

class ApiService {
  constructor() {
    this.api = mockApi;
  }

  async getUniforms() {
    return this.api.get('uniforms');
  }

  async getSchools() {
    return this.api.get('schools');
  }

  async getBatches() {
    return this.api.get('batches');
  }

  async getOrders() {
    return this.api.get('orders');
  }

  async createUniform(data) {
    return this.api.post('uniforms', data);
  }

  async updateUniform(id, data) {
    return this.api.put('uniforms', id, data);
  }

  async deleteUniform(id) {
    return this.api.delete('uniforms', id);
  }

  // Similar methods for schools, batches, and orders...
}

export const apiService = new ApiService(); 