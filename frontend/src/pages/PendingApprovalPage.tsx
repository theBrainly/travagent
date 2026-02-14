import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Plane, Clock, LogOut, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function PendingApprovalPage() {
    const { agent, logout, updateAgent } = useAuth();
    const [checking, setChecking] = useState(false);

    const handleCheckStatus = async () => {
        setChecking(true);
        try {
            const res = await authAPI.checkApprovalStatus();
            const data = res.data.data;
            if (data.approvalStatus === 'approved') {
                // Agent has been approved — update context with fresh data
                updateAgent({ ...agent!, isActive: true, isVerified: true });
                toast.success('🎉 Your account has been approved! Redirecting...');
            } else if (data.approvalStatus === 'rejected') {
                updateAgent({ ...agent!, isActive: false });
                toast.error('Your application has been rejected. Please contact admin.');
            } else {
                toast('Your application is still under review.', { icon: '⏳' });
            }
        } catch {
            toast.error('Failed to check status. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    const approvalStatus = agent?.isActive ? 'approved' : 'pending';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
                        <Plane className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">TravAgent</h1>
                    <p className="text-slate-400 mt-1">B2B Travel Agent Platform</p>
                </div>

                {/* Main Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
                    {/* Status Icon */}
                    <div className="mb-6">
                        {approvalStatus === 'pending' ? (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/20 rounded-full mb-4 animate-pulse">
                                <Clock className="w-10 h-10 text-amber-400" />
                            </div>
                        ) : approvalStatus === 'approved' ? (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>
                        ) : (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full mb-4">
                                <XCircle className="w-10 h-10 text-red-400" />
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    <h2 className="text-2xl font-bold text-white mb-3">Application Under Review</h2>
                    <p className="text-slate-300 text-base leading-relaxed mb-2">
                        Thank you for registering, <span className="text-sky-400 font-semibold">{agent?.firstName || 'Agent'}</span>!
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Your application is currently being reviewed by our admin team.
                        You'll get access to the platform once your account is approved.
                    </p>

                    {/* Agent Info Card */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-6">
                        <div className="grid grid-cols-2 gap-3 text-left">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Name</p>
                                <p className="text-sm text-white font-medium">{agent?.firstName} {agent?.lastName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Email</p>
                                <p className="text-sm text-white font-medium truncate">{agent?.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                    Pending Approval
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Role</p>
                                <p className="text-sm text-white font-medium capitalize">{agent?.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCheckStatus}
                            disabled={checking}
                            className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-sky-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {checking ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Checking Status...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Check Approval Status
                                </>
                            )}
                        </button>

                        <button
                            onClick={logout}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-white/10 flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>

                <p className="text-center text-slate-500 text-xs mt-6">
                    Need help? Contact admin at support@travagent.com
                </p>
            </div>
        </div>
    );
}
