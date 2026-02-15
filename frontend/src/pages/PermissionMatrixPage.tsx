import { useState, useEffect } from 'react';
import { permissionAPI } from '../services/api';
import type { Permission } from '../types';
import { Skeleton } from '../components/Skeleton';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { Loader2, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export function PermissionMatrixPage() {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
    const showSlowSkeleton = useDelayedLoading(loading, 400);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        setLoading(true);
        try {
            const res = await permissionAPI.getAll();
            const data = res.data.data.permissions;
            const perms = Array.isArray(data) ? data : [];
            setPermissions(perms);

            // Extract all unique permission keys from the first available role (usually admin or super_admin has all)
            // Or union of all keys
            const keys = new Set<string>();
            perms.forEach(p => {
                if (p.permissions) {
                    Object.keys(p.permissions).forEach(k => keys.add(k));
                }
            });
            setPermissionKeys(Array.from(keys).sort());
        } catch (error) {
            console.error('Failed to load permissions:', error);
            toast.error('Failed to load permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (role: string, key: string, currentValue: boolean) => {
        // Optimistic update
        setPermissions(prev => prev.map(p => {
            if (p.role === role) {
                return {
                    ...p,
                    permissions: {
                        ...p.permissions,
                        [key]: !currentValue
                    }
                };
            }
            return p;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update each modified role
            // In a real app, we might track dirty states. Here we just update all or just iterate.
            // API update takes (role, permissions).

            const promises = permissions.map(p => {
                // Skip super_admin if protected, but API should handle it. 
                // Let's safe guard against updating super_admin if not needed, but usually we might want to.
                return permissionAPI.update(p.role, p.permissions);
            });

            await Promise.all(promises);
            toast.success('Permissions updated successfully');
            loadPermissions(); // Reload to be sure
        } catch (error) {
            console.error('Failed to save permissions:', error);
            toast.error('Failed to save changes');
            loadPermissions(); // Revert on error
        } finally {
            setSaving(false);
        }
    };

    const formatPermissionName = (key: string) => {
        // convert canCreateAdmin -> Can Create Admin
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    const roleOrder = ['super_admin', 'admin', 'senior_agent', 'agent', 'junior_agent'];
    const sortedPermissions = [...permissions].sort((a, b) => {
        return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    });

    if (loading && permissions.length === 0) {
        if (!showSlowSkeleton) {
            return <div className="h-24" />;
        }

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-7 w-52" />
                        <Skeleton className="h-4 w-56 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    {Array.from({ length: 10 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-sky-500" />
                        Permission Matrix
                    </h1>
                    <p className="text-sm text-gray-500">Manage role-based access controls</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium text-sm hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Permission</th>
                                {sortedPermissions.map(p => (
                                    <th key={p.role} className="px-6 py-4 font-semibold text-center capitalize min-w-[120px]">
                                        {p.role.replace('_', ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {permissionKeys.map(key => (
                                <tr key={key} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-900">{formatPermissionName(key)}</td>
                                    {sortedPermissions.map(p => {
                                        const isEnabled = p.permissions?.[key] || false;
                                        const isSuperAdmin = p.role === 'super_admin'; // Often immutable

                                        return (
                                            <td key={`${p.role}-${key}`} className="px-6 py-3 text-center">
                                                <label className="inline-flex items-center justify-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isEnabled}
                                                        onChange={() => !isSuperAdmin && handleToggle(p.role, key, isEnabled)}
                                                        disabled={isSuperAdmin}
                                                    />
                                                    <div className={`w-10 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500 transition-colors ${isEnabled ? 'bg-sky-500' : 'bg-gray-200'
                                                        } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative`}></div>
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
