import React, { useEffect, useState } from 'react';
import { auditService, AuditLog } from '../services/auditService';
import { format } from 'date-fns';
import { Eye, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const AuditLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Filters
    const [actionFilter, setActionFilter] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 20,
                action: actionFilter || undefined,
                resourceType: resourceFilter || undefined,
                severity: severityFilter || undefined,
                performedBy: userSearch || undefined // backend expects ID, but here we simulate simplistic filtering
            };

            const data = await auditService.getAll(params);
            setLogs(data.data);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, actionFilter, resourceFilter, severityFilter, userSearch]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">Track all system activities and changes</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Refresh"
                >
                    <RotateCcw className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
                    <input
                        type="text"
                        placeholder="e.g. BOOKING_CREATED"
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Resource</label>
                    <select
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={resourceFilter}
                        onChange={(e) => setResourceFilter(e.target.value)}
                    >
                        <option value="">All Resources</option>
                        <option value="Booking">Booking</option>
                        <option value="Payment">Payment</option>
                        <option value="Lead">Lead</option>
                        <option value="Agent">Agent</option>
                        <option value="Before">Auth</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                    <select
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                        <option value="">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={() => { setActionFilter(''); setResourceFilter(''); setSeverityFilter(''); }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                    No audit logs found matching your criteria
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                                            {log.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {log.action}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System'}
                                        <span className="block text-xs text-gray-400">{log.performedByRole}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.targetModel}
                                        <span className="block text-xs text-mono text-gray-400">ID: ...{log.targetId?.slice(-6)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-full"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedLog(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Audit Log Details
                                </h3>
                                <div className="mt-4 space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700">
                                        <p><strong>Action:</strong> {selectedLog.action}</p>
                                        <p><strong>User:</strong> {selectedLog.performedBy?.firstName} {selectedLog.performedBy?.lastName} ({selectedLog.performedBy?.email})</p>
                                        <p><strong>Date:</strong> {format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                                        <p><strong>Description:</strong> {selectedLog.description}</p>
                                        <p className="mt-2 text-xs text-gray-500">
                                            IP: {selectedLog.metadata?.ip || 'N/A'} • User-Agent: {selectedLog.metadata?.userAgent || 'N/A'}
                                        </p>
                                    </div>

                                    {selectedLog.changes && (selectedLog.changes.before || selectedLog.changes.after) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedLog.changes.before && (
                                                <div className="border border-gray-200 rounded-md p-3">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Before</h4>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                                                        {JSON.stringify(selectedLog.changes.before, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {selectedLog.changes.after && (
                                                <div className="border border-gray-200 rounded-md p-3">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">After</h4>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                                                        {JSON.stringify(selectedLog.changes.after, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                                    onClick={() => setSelectedLog(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogsPage;
