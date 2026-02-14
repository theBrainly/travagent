import api from './api';

export const adminService = {
    getCacheStatus: async () => {
        const response = await api.get<{ connected: boolean; enabled: boolean }>('/cache/status');
        return response.data;
    },

    flushCache: async () => {
        const response = await api.post<{ flushed: boolean }>('/cache/flush');
        return response.data;
    },

    invalidateCache: async (resource: string) => {
        const response = await api.post(`/cache/invalidate/${resource}`);
        return response.data;
    }
};
