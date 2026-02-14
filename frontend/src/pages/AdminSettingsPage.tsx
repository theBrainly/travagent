import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Database, Trash2, RefreshCw, Server } from 'lucide-react';

const AdminSettingsPage: React.FC = () => {
    const { agent } = useAuth();
    const [cacheStatus, setCacheStatus] = useState<{ connected: boolean; enabled: boolean } | null>(null);
    const [loading, setLoading] = useState(false);

    // If user is not admin, redirect or show denied (handled by route protection usually)
    if (agent?.role !== 'admin' && agent?.role !== 'super_admin') {
        return <div className="p-8 text-center text-red-600">Access Denied</div>;
    }

    const checkStatus = async () => {
        try {
            const status = await adminService.getCacheStatus();
            setCacheStatus(status);
        } catch (error) {
            console.error('Failed to get cache status');
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const handleFlushCache = async () => {
        if (!window.confirm('Are you sure you want to clear the entire system cache? This may temporarily impact performance.')) return;

        try {
            setLoading(true);
            await adminService.flushCache();
            toast.success('Cache flushed successfully');
            checkStatus();
        } catch (error) {
            toast.error('Failed to flush cache');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 border-b pb-4">Admin Settings</h1>

            {/* Redis Cache Section */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Database className="w-5 h-5 text-indigo-600" />
                            Redis Cache Management
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage the application's caching layer to optimize performance.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${cacheStatus?.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {cacheStatus?.connected ? 'Connected' : 'Disconnected'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${cacheStatus?.enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                            {cacheStatus?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                    <button
                        onClick={checkStatus}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Status
                    </button>

                    <button
                        onClick={handleFlushCache}
                        disabled={!cacheStatus?.connected || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        Flush All Cache
                    </button>
                </div>

                <div className="mt-6 bg-gray-50 p-4 rounded-md text-sm text-gray-600">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Cache Statistics (Estimated)
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Bookings List TTL: 5 minutes</li>
                        <li>Dashboard Stats TTL: 2 minutes</li>
                        <li>Customer Data TTL: 10 minutes</li>
                        <li>Invalidation Strategy: Smart Pattern Deletion</li>
                    </ul>
                </div>
            </section>
        </div>
    );
};

export default AdminSettingsPage;
