import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器，添加token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理错误
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    // 处理401认证错误
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response ? error.response.data : error.message);
  }
);

// 认证相关API
export const authAPI = {
  // 登录
  login: (data) => api.post('/auth/login', data),
  // 注册
  register: (data) => api.post('/auth/register', data)
};

// 酒店相关API
export const hotelAPI = {
  // 创建酒店
  create: (data) => api.post('/hotels', data),
  // 获取酒店列表
  getList: () => api.get('/hotels'),
  // 获取单个酒店详情
  getDetail: (id) => api.get(`/hotels/${id}`),
  // 更新酒店状态
  updateStatus: (id, data) => api.put(`/hotels/${id}/status`, data),
  // 删除酒店
  delete: (id) => api.delete(`/hotels/${id}`),
  // 添加房间类型
  addRoomType: (hotelId, data) => api.post(`/hotels/${hotelId}/room-types`, data),
  // 更新房间类型
  updateRoomType: (hotelId, roomTypeId, data) => api.put(`/hotels/${hotelId}/room-types/${roomTypeId}`, data),
  // 删除房间类型
  deleteRoomType: (hotelId, roomTypeId) => api.delete(`/hotels/${hotelId}/room-types/${roomTypeId}`)
};

export default api;
