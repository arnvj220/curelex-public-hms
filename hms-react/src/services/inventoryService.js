// hms-react/src/services/inventoryService.js
import API from '../utils/api';

const inventoryService = {
  // Inventory Items
  getItems: (params) => API.get('/inventory', { params }),
  getItem: (id) => API.get(`/inventory/${id}`),
  createItem: (data) => API.post('/inventory', data),
  updateItem: (id, data) => API.put(`/inventory/${id}`, data),
  deleteItem: (id) => API.delete(`/inventory/${id}`),
  
  // Stock Transactions
  addTransaction: (id, data) => API.post(`/inventory/${id}/transaction`, data),
  getTransactions: (id, limit = 50) => API.get(`/inventory/${id}/transactions?limit=${limit}`),
  
  // Alerts & Reports - these return arrays directly
  getLowStock: () => API.get('/inventory/alerts/low-stock'),
  getOutOfStock: () => API.get('/inventory/alerts/out-of-stock'),
  getDueMaintenance: () => API.get('/inventory/alerts/due-maintenance'),
  getOverdueMaintenance: () => API.get('/inventory/alerts/overdue-maintenance'),
  getValuation: (category) => API.get(`/inventory/reports/valuation${category ? `?category=${category}` : ''}`),
  
  // Equipment specific
  getEquipment: (params) => API.get('/inventory/equipment', { params }),
  logMaintenance: (id, data) => API.post(`/inventory/${id}/maintenance`, data),
  getMaintenanceHistory: (id) => API.get(`/inventory/${id}/maintenance-history`),
};

export default inventoryService;