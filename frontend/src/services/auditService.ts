import api from './api';

export interface AuditLog {
    _id: string;
    action: string;
    performedBy: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    performedByRole: string;
    targetModel: string;
    targetId: string;
    changes?: {
        before?: any;
        after?: any;
    };
    metadata?: {
        ip: string;
        userAgent: string;
    };
    description: string;
    severity: 'info' | 'warning' | 'critical';
    createdAt: string;
}

export interface AuditStats {
    actionStats: { _id: string; count: number }[];
    resourceStats: { _id: string; count: number }[];
    userStats: { name: string; email: string; count: number }[];
    severityStats: { _id: string; count: number }[];
    recentActivity24h: number;
    totalLogs: number;
}

export const auditService = {
    getAll: async (params: any) => {
        // Filter out undefined/null/empty values to avoid sending "action=undefined" etc.
        const cleanParams: Record<string, string> = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                cleanParams[key] = String(value);
            }
        }
        const query = new URLSearchParams(cleanParams).toString();
        const response = await api.get<{ data: AuditLog[]; pagination: any }>(`/audit-logs?${query}`);
        return response.data;
    },

    getStats: async () => {
        const response = await api.get<AuditStats>('/audit-logs/stats');
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<{ auditLog: AuditLog }>(`/audit-logs/${id}`);
        return response.data;
    }
};
