import api from './api';

export const adminService = {
    getCacheStatus: async () => {
        const response = await api.get<{ data: { connected: boolean; enabled: boolean } }>('/cache/status');
        return response.data.data;
    },

    flushCache: async () => {
        const response = await api.post<{ data: { flushed: boolean } }>('/cache/flush');
        return response.data.data;
    },

    invalidateCache: async (resource: string) => {
        const response = await api.post<{ data: null }>(`/cache/invalidate/${resource}`);
        return response.data.data;
    }
};
