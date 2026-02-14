import { useState, useEffect } from 'react';
import { paymentAPI, bookingAPI } from '../services/api';
import type { Payment, Booking } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Search, Loader2, CreditCard, CheckCircle2, Clock, XCircle, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  processing: { icon: <Loader2 className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700', label: 'Processing' },
  completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-700', label: 'Failed' },
  refunded: { icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700', label: 'Refunded' },
  cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-700', label: 'Cancelled' },
};

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    booking: '', amount: '', paymentMethod: 'bank_transfer', notes: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      };

      const [pRes, bRes] = await Promise.allSettled([
        paymentAPI.getAll(params),
        bookingAPI.getAll() // Bookings for dropdown likely don't need filtering
      ]);

      if (pRes.status === 'fulfilled') {
        const data = pRes.value.data?.data || pRes.value.data?.payments || [];
        setPayments(Array.isArray(data) ? data : []);
      }
      if (bRes.status === 'fulfilled') {
        const data = bRes.value.data?.data || bRes.value.data?.bookings || [];
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ booking: '', amount: '', paymentMethod: 'bank_transfer', notes: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.booking || !form.amount) {
      toast.error('Booking and amount are required');
      return;
    }
    try {
      await paymentAPI.create({
        booking: form.booking,
        amount: parseFloat(form.amount) || 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      });
      toast.success('Payment recorded');
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Payment failed');
    }
  };

  const getBookingLabel = (bookingRef: string | Booking | undefined) => {
    if (!bookingRef) return '-';
    if (typeof bookingRef === 'object' && bookingRef !== null) {
      return `${bookingRef.tripDetails?.destination || bookingRef.bookingReference || 'Booking'} - ₹${(bookingRef.pricing?.totalAmount || 0).toLocaleString()}`;
    }
    const b = bookings.find(b => b._id === bookingRef);
    return b ? `${b.tripDetails?.destination} - ₹${(b.pricing?.totalAmount || 0).toLocaleString()}` : String(bookingRef);
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return '-';
    return method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Removed client-side filtered variable. Using payments directly.
  // Note: Total calculations below will now be based on the *fetched page* of payments, not all payments.
  // Ideally, backend should return totals. For now, this is an acceptable tradeoff or we can fetch stats separately.
  const totalCompleted = payments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + (p.amount || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">{payments.length} transactions</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium text-sm hover:bg-sky-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Received</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalCompleted.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Pending Amount</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none bg-white">
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => {
                  const cfg = statusConfig[payment.status] || statusConfig.pending;
                  return (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900 max-w-[200px] truncate">{getBookingLabel(payment.booking)}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">₹{(payment.amount || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-600">{formatPaymentMethod(payment.paymentMethod)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{payment.transactionId || '-'}</td>
                      <td className="px-5 py-3 text-gray-500">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No payments found</h3>
          <p className="text-sm text-gray-400 mt-1">Record your first payment</p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking *</label>
            <select value={form.booking} onChange={(e) => setForm(f => ({ ...f, booking: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
              <option value="">Select booking</option>
              {bookings.map(b => <option key={b._id} value={b._id}>{b.tripDetails?.destination} - ₹{(b.pricing?.totalAmount || 0).toLocaleString()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-sky-500 rounded-xl hover:bg-sky-600">Record Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
