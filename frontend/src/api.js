const BASE_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:8000';

let token = localStorage.getItem('token') || null;

export const api = {
  setToken(newToken) {
    token = newToken;
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  },

  getToken() {
    return token;
  },

  isAuthenticated() {
    return !!token;
  },

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // If unauthorized, clear token and redirect or throw
      if (response.status === 401) {
        api.setToken(null);
      }

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        let errorMessage = 'An error occurred';
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.msg).join(', ');
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else {
            errorMessage = JSON.stringify(data.detail);
          }
        } else if (data?.message) {
          errorMessage = data.message;
        }
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },

  // Auth operations
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async register(username, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    this.setToken(null);
  },

  // Contacts operations
  async getContacts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.name) params.append('name', filters.name);
    if (filters.city) params.append('city', filters.city);
    if (filters.phone) params.append('phone', filters.phone);
    if (filters.email) params.append('email', filters.email);
    if (filters.category_id) params.append('category_id', filters.category_id);

    const queryString = params.toString();
    const endpoint = `/contacts${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint, { method: 'GET' });
  },

  async createContact(contact) {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  },

  async updateContact(id, contact) {
    return this.request(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(contact),
    });
  },

  async toggleFavorite(id) {
    return this.request(`/contacts/${id}/favorite`, {
      method: 'POST',
    });
  },

  async deleteContact(id) {
    return this.request(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories operations
  async getCategories() {
    return this.request('/categories', { method: 'GET' });
  },

  async createCategory(name) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }
};
