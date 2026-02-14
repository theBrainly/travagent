import { useState, useEffect } from 'react';
import { agentAPI } from '../services/api';
import {
    UserCheck, UserX, Clock, Search, RefreshCw, Loader2,
    Mail, Phone, Building2, Calendar, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PendingAgent {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    agencyName?: string;
    agencyLicense?: string;
    role: string;
    createdAt: string;
    address?: {
        city?: string;
        state?: string;
        country?: string;
    };
}

export default function AgentApprovalsPage() {
    const [agents, setAgents] = useState<PendingAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await agentAPI.getPending();
            setAgents(res.data.data?.agents || []);
        } catch {
            toast.error('Failed to fetch pending agents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id: string, name: string) => {
        setActionLoading(id);
        try {
            await agentAPI.approve(id);
            toast.success(`✅ ${name} has been approved!`);
            setAgents((prev) => prev.filter((a) => a._id !== id));
        } catch {
            toast.error('Failed to approve agent');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string, name: string) => {
        setActionLoading(id);
        try {
            await agentAPI.reject(id, rejectReason);
            toast.success(`${name} has been rejected.`);
            setAgents((prev) => prev.filter((a) => a._id !== id));
            setShowRejectModal(null);
            setRejectReason('');
        } catch {
            toast.error('Failed to reject agent');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = agents.filter((a) => {
        const q = search.toLowerCase();
        return (
            a.firstName.toLowerCase().includes(q) ||
            a.lastName.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            (a.agencyName || '').toLowerCase().includes(q)
        );
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Agent Approvals</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review and approve new agent registrations
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
                        <Clock className="w-4 h-4" />
                        {agents.length} Pending
                    </span>
                    <button
                        onClick={fetchPending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, or agency..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                    <span className="ml-3 text-gray-500">Loading pending requests...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                        <UserCheck className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {agents.length === 0 ? 'No Pending Requests' : 'No Matching Results'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {agents.length === 0
                            ? 'All agent registrations have been reviewed. Check back later.'
                            : 'Try adjusting your search query.'}
                    </p>
                </div>
            ) : (
                /* Agent Cards */
                <div className="space-y-4">
                    {filtered.map((agent) => (
                        <div
                            key={agent._id}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Main Row */}
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                            {agent.firstName.charAt(0).toUpperCase()}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-semibold text-gray-900">
                                                    {agent.firstName} {agent.lastName}
                                                </h3>
                                                <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Pending
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                                <span className="inline-flex items-center gap-1">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {agent.email}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {agent.phone}
                                                </span>
                                                {agent.agencyName && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        {agent.agencyName}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(agent.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleApprove(agent._id, `${agent.firstName} ${agent.lastName}`)}
                                            disabled={actionLoading === agent._id}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === agent._id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <UserCheck className="w-4 h-4" />
                                            )}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(agent._id)}
                                            disabled={actionLoading === agent._id}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                                        >
                                            <UserX className="w-4 h-4" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => setExpandedId(expandedId === agent._id ? null : agent._id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            {expandedId === agent._id ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === agent._id && (
                                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Applied Role</p>
                                            <p className="text-sm font-medium text-gray-900 capitalize">{agent.role.replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Agency License</p>
                                            <p className="text-sm font-medium text-gray-900">{agent.agencyLicense || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Location</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {[agent.address?.city, agent.address?.state, agent.address?.country].filter(Boolean).join(', ') || 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Agent ID</p>
                                            <p className="text-sm font-mono text-gray-500">{agent._id.slice(-8)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowRejectModal(null); setRejectReason(''); }} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Reject Agent</h3>
                                    <p className="text-sm text-gray-500">
                                        {(() => {
                                            const a = agents.find((ag) => ag._id === showRejectModal);
                                            return a ? `${a.firstName} ${a.lastName} (${a.email})` : '';
                                        })()}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Incomplete documentation, invalid license..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const a = agents.find((ag) => ag._id === showRejectModal);
                                        if (a) handleReject(a._id, `${a.firstName} ${a.lastName}`);
                                    }}
                                    disabled={actionLoading === showRejectModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === showRejectModal ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <UserX className="w-4 h-4" />
                                    )}
                                    Reject Agent
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
