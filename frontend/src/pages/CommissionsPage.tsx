import { useState, useEffect } from 'react';
import { commissionAPI, bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Commission, Booking } from '../types';
import { Loader2, DollarSign, CheckCircle2, Clock, XCircle, TrendingUp, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export function CommissionsPage() {
  const { agent } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => { loadCommissions(); }, []);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      let data: Commission[] = [];
      try {
        const res = agent?._id
          ? await commissionAPI.getByAgent(agent._id)
          : await commissionAPI.getAll();
        data = res.data?.data?.commissions || res.data?.data || res.data?.commissions || res.data || [];
      } catch {
        const res = await commissionAPI.getAll();
        data = res.data?.data?.commissions || res.data?.data || res.data?.commissions || res.data || [];
      }
      setCommissions(Array.isArray(data) ? data : []);
    } catch {
      // If commission API doesn't exist, compute from bookings
      try {
        const res = await bookingAPI.getAll();
        const bookings: Booking[] = res.data?.bookings || res.data || [];
        const computed: Commission[] = (Array.isArray(bookings) ? bookings : [])
          .filter((b: Booking) => b.status === 'confirmed' || b.status === 'completed')
          .map((b: Booking) => ({
            _id: b._id,
            agent: typeof b.agent === 'string' ? b.agent : (b.agent as { _id: string })?._id || '',
            booking: b,
            bookingAmount: b.pricing?.totalAmount || 0,
            commissionRate: 10,
            commissionAmount: (b.pricing?.totalAmount || 0) * 0.1,
            totalEarning: (b.pricing?.totalAmount || 0) * 0.1,
            status: b.status === 'completed' ? 'paid' as const : 'pending' as const,
            createdAt: b.createdAt,
          }));
        setCommissions(computed);
      } catch {
        setCommissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await commissionAPI.markPaid(id);
      toast.success('Commission marked as paid');
      loadCommissions();
    } catch {
      toast.error('Failed to update commission');
    }
  };

  const getBookingDest = (bookingRef: string | Booking) => {
    if (typeof bookingRef === 'object' && bookingRef !== null) return (bookingRef as Booking).tripDetails?.destination || 'Unknown';
    return 'Booking';
  };

  const totalEarned = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.totalEarning || 0), 0);
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.totalEarning || 0), 0);
  const totalAll = commissions.reduce((s, c) => s + (c.totalEarning || 0), 0);

  const filtered = commissions.filter(c => {
    const matchSearch = getBookingDest(c.booking).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusStyles: Record<string, { icon: React.ReactNode; color: string }> = {
    pending: { icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700' },
    approved: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700' },
    paid: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700' },
    rejected: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-700' },
    on_hold: { icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-700' },
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Commissions</h1>
        <p className="text-sm text-gray-500">Track your earnings from bookings</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-emerald-200" />
            <span className="text-sm text-emerald-100">Total Earned</span>
          </div>
          <p className="text-3xl font-bold">₹{totalEarned.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-200" />
            <span className="text-sm text-amber-100">Pending</span>
          </div>
          <p className="text-3xl font-bold">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-sky-200" />
            <span className="text-sm text-sky-100">Total Commission</span>
          </div>
          <p className="text-3xl font-bold">₹{totalAll.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none bg-white">
            <option value="All">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((commission) => {
                  const cfg = statusStyles[commission.status] || statusStyles.pending;
                  return (
                    <tr key={commission._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{getBookingDest(commission.booking)}</td>
                      <td className="px-5 py-3 text-gray-600">{commission.commissionRate || 10}%</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">₹{(commission.totalEarning || 0).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {commission.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{commission.createdAt ? new Date(commission.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-5 py-3">
                        {commission.status === 'pending' && (
                          <button onClick={() => handleMarkPaid(commission._id)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No commissions yet</h3>
          <p className="text-sm text-gray-400 mt-1">Commissions are generated from confirmed bookings</p>
        </div>
      )}
    </div>
  );
}
