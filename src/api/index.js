import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：自动带 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const payload = error?.response?.data;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }

    const message =
      (typeof payload === 'string' && payload) ||
      payload?.message ||
      payload?.error?.message ||
      error?.message ||
      'Request failed';

    return Promise.reject({
      status,
      ...((payload && typeof payload === 'object') ? payload : {}),
      message
    });
  }
);

// 认证 API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data)
};

// 酒店管理 API（PC）
export const hotelAPI = {
  create: (data) => api.post('/hotels', data),
  getList: () => api.get('/hotels'),
  getDetail: (id) => api.get(`/hotels/${id}`),

  // ✅ 新增：编辑酒店基础信息/移动端展示字段
  update: (id, data) => api.put(`/hotels/${id}`, data),

  updateStatus: (id, data) => api.put(`/hotels/${id}/status`, data),
  delete: (id) => api.delete(`/hotels/${id}`),

  addRoomType: (hotelId, data) => api.post(`/hotels/${hotelId}/room-types`, data),
  updateRoomType: (hotelId, roomTypeId, data) => api.put(`/hotels/${hotelId}/room-types/${roomTypeId}`, data),
  deleteRoomType: (hotelId, roomTypeId) => api.delete(`/hotels/${hotelId}/room-types/${roomTypeId}`)
};

// 可选：给你调试移动端接口时在 PC 直接测试用（不影响现有页面）
export const publicHotelsAPI = {
  getMeta: () => api.get('/public/hotels/meta'),
  getBanners: (limit = 5) => api.get('/public/hotels/banners', { params: { limit } }),
  getList: (params = {}) => api.get('/public/hotels', { params }),
  getDetail: (id) => api.get(`/public/hotels/${id}`)
};

export default api;