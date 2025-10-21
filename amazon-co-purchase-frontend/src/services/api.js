import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/network';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        console.log(`发起请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        console.log(`请求成功: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        console.error(`请求失败:`, error);
        return Promise.reject(error);
    }
);

export const networkAPI = {
    // 健康检查
    healthCheck: () => api.get('/health'),

    // 获取完整网络数据
    getFullNetwork: () => api.get('/full'),

    // 获取统计信息
    getStatistics: () => api.get('/statistics'),

    // 获取所有商品类别
    getGroups: () => api.get('/groups'),

    // 根据类别筛选商品
    getNodesByGroup: (group) => api.get(`/nodes/group/${group}`),

    // 获取节点详情
    getNodeDetail: (id) => api.get(`/nodes/${id}`),

    // 获取热门商品
    getHighlyConnectedNodes: (limit = 10) =>
        api.get('/nodes/highly-connected', { params: { limit } }),

    // 获取邻居节点
    getNeighbors: (id) => api.get(`/nodes/${id}/neighbors`),

    // 搜索商品
    searchNodes: (keyword) =>
        api.get('/nodes/search', { params: { keyword } }),
};

export default api;