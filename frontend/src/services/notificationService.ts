import api from './api';

export interface Notification {
    _id: string;
    recipient: string;
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
    isRead: boolean;
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
}

export interface NotificationResponse {
    notifications: Notification[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalRecords: number;
        limit: number;
    };
}

export const notificationService = {
    getAll: async (page = 1, limit = 10, isRead?: boolean) => {
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (isRead !== undefined) params.append('isRead', isRead.toString());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>(`/notifications?${params.toString()}`);
        return {
            notifications: response.data.data,
            pagination: response.data.pagination
        };
    },

    getUnreadCount: async () => {
        const response = await api.get<{ unreadCount: number }>('/notifications/unread-count');
        return response.data.data;
    },

    markAsRead: async (id: string) => {
        const response = await api.patch<{ notification: Notification }>(`/notifications/${id}/read`);
        return response.data.data;
    },

    markAllAsRead: async () => {
        const response = await api.patch<{ modifiedCount: number }>('/notifications/read-all');
        return response.data.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data.data;
    }
};
