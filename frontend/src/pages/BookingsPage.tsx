import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, customerAPI, uploadAPI } from '../services/api';
import type { Booking, Customer, Document } from '../types';
import { Modal } from '../components/Modal';
import { FileUpload } from '../components/FileUpload';
import { Plus, Search, Edit2, Trash2, Loader2, CalendarCheck, Clock, CheckCircle2, XCircle, Filter, MapPin, Users as UsersIcon, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  refunded: 'bg-purple-100 text-purple-700 border-purple-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-sky-100 text-sky-700 border-sky-200',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle2 className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  refunded: <CheckCircle2 className="w-3.5 h-3.5" />,
  draft: <Clock className="w-3.5 h-3.5" />,
  in_progress: <Clock className="w-3.5 h-3.5" />,
};

export function BookingsPage() {
  const { checkPermission } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    customer_id: '', booking_type: 'package', destination: '', travel_date: '', return_date: '',
    num_travelers: '1', total_amount: '', status: 'pending', notes: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    destination: '', tripType: '', startDateFrom: '', startDateTo: '',
    minAmount: '', maxAmount: '', sortBy: 'createdAt', sortOrder: 'desc',
  });

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sortBy' && k !== 'sortOrder' && v !== 'createdAt' && v !== 'desc'
  ).length;

  const clearFilters = () => setFilters({
    destination: '', tripType: '', startDateFrom: '', startDateTo: '',
    minAmount: '', maxAmount: '', sortBy: 'createdAt', sortOrder: 'desc',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, statusFilter, filters]);

  const loadDocuments = async (bookingId: string) => {
    try {
      const res = await uploadAPI.getByResource('Booking', bookingId);
      const docs = res.data.data || res.data.documents || (Array.isArray(res.data) ? res.data : []);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch {
      console.error('Failed to load documents');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        search: search || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        destination: filters.destination || undefined,
        bookingType: filters.tripType || undefined,
        startDate: filters.startDateFrom || undefined,
        endDate: filters.startDateTo || undefined,
        minAmount: filters.minAmount || undefined,
        maxAmount: filters.maxAmount || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1, // Reset to page 1 on filter change - though we don't have pagination UI yet, standard practice
        limit: 50
      };

      // Clean undefined params
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const [bRes, cRes] = await Promise.allSettled([
        bookingAPI.getAll(params),
        customerAPI.getAll() // Customers likely don't need filtering for the dropdown yet, or maybe they do? keeping as is for now
      ]);

      if (bRes.status === 'fulfilled') {
        const resData = bRes.value.data;
        const data = resData.data || resData.bookings || (Array.isArray(resData) ? resData : []);
        setBookings(Array.isArray(data) ? data : []);
      }

      if (cRes.status === 'fulfilled') {
        const resData = cRes.value.data;
        const data = resData.data || resData.customers || (Array.isArray(resData) ? resData : []);
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDocuments([]);
    setForm({ customer_id: '', booking_type: 'package', destination: '', travel_date: '', return_date: '', num_travelers: '1', total_amount: '', status: 'pending', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (b: Booking) => {
    setEditing(b);
    loadDocuments(b._id);
    const custId = typeof b.customer === 'object' ? (b.customer as Customer)._id : b.customer;
    setForm({
      customer_id: custId || '',
      booking_type: b.bookingType || 'package',
      destination: b.tripDetails?.destination || '',
      travel_date: b.tripDetails?.startDate ? b.tripDetails.startDate.split('T')[0] : '',
      return_date: b.tripDetails?.endDate ? b.tripDetails.endDate.split('T')[0] : '',
      num_travelers: String(b.travelers?.adults || 1),
      total_amount: String(b.pricing?.totalAmount || ''),
      status: b.status || 'pending',
      notes: b.internalNotes || b.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination || !form.travel_date) {
      toast.error('Destination and travel date are required');
      return;
    }

    const payload = {
      customer: form.customer_id,
      bookingType: form.booking_type,
      tripDetails: {
        title: `Trip to ${form.destination}`,
        destination: form.destination,
        startDate: form.travel_date,
        endDate: form.return_date || form.travel_date,
      },
      pricing: {
        basePrice: parseFloat(form.total_amount) || 0,
        totalAmount: parseFloat(form.total_amount) || 0,
        currency: 'INR'
      },
      travelers: {
        adults: parseInt(form.num_travelers) || 1
      },
      status: form.status,
      internalNotes: form.notes
    };

    try {
      if (editing) {
        await bookingAPI.update(editing._id, payload);
        toast.success('Booking updated');
      } else {
        await bookingAPI.create(payload);
        toast.success('Booking created');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await bookingAPI.updateStatus(id, status);
      toast.success(`Booking ${status.toLowerCase()}`);
      loadData();
    } catch {
      try {
        await bookingAPI.update(id, { status });
        toast.success(`Booking ${status.toLowerCase()}`);
        loadData();
      } catch {
        toast.error('Status update failed');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await bookingAPI.delete(id);
      toast.success('Booking deleted');
      loadData();
    } catch {
      toast.error('Delete failed');
    }
  };

  const getCustomerName = (custId: string | Customer) => {
    if (typeof custId === 'object' && custId !== null) return (custId as Customer).name || (custId as Customer).fullName || 'Unknown';
    const c = customers.find(c => c._id === custId);
    return c?.name || c?.fullName || 'Unknown';
  };

  // Removed client-side filtering variable 'filtered'
  // using 'bookings' state directly which is now filtered from server

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">{bookings.length} bookings found</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium text-sm hover:bg-sky-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none bg-white">
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${showFilters || activeFilterCount > 0
            ? 'bg-sky-50 text-sky-700 border-sky-200'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
          <Filter className="w-4 h-4" />
          Advanced{activeFilterCount > 0 && <span className="bg-sky-500 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Advanced Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Destination</label>
              <input type="text" value={filters.destination}
                onChange={(e) => setFilters(f => ({ ...f, destination: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="e.g., Paris" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Trip Type</label>
              <select value={filters.tripType}
                onChange={(e) => setFilters(f => ({ ...f, tripType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="">All Types</option>
                <option value="package">Package</option>
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="transfer">Transfer</option>
                <option value="activity">Activity</option>
                <option value="visa">Visa</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date From</label>
              <input type="date" value={filters.startDateFrom}
                onChange={(e) => setFilters(f => ({ ...f, startDateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date To</label>
              <input type="date" value={filters.startDateTo}
                onChange={(e) => setFilters(f => ({ ...f, startDateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Amount (₹)</label>
              <input type="number" value={filters.minAmount}
                onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Amount (₹)</label>
              <input type="number" value={filters.maxAmount}
                onChange={(e) => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="999999" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
              <select value={filters.sortBy}
                onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="createdAt">Created Date</option>
                <option value="pricing.totalAmount">Amount</option>
                <option value="tripDetails.startDate">Travel Date</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Order</label>
              <select value={filters.sortOrder}
                onChange={(e) => setFilters(f => ({ ...f, sortOrder: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{booking.tripDetails?.destination || 'No Destination'}</h3>
                      <p className="text-xs text-gray-500">{getCustomerName(booking.customer)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" />{booking.tripDetails?.startDate ? new Date(booking.tripDetails.startDate).toLocaleDateString() : 'N/A'}</span>
                    {booking.tripDetails?.endDate && <span>→ {new Date(booking.tripDetails.endDate).toLocaleDateString()}</span>}
                    <span className="flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" />{booking.travelers?.adults || 1} travelers</span>
                    <span className="font-semibold text-gray-900">₹{(booking.pricing?.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusIcons[booking.status]} {booking.status}
                  </span>
                  <div className="flex gap-1 ml-2">
                    {booking.status === 'pending' && (
                      <button onClick={() => handleStatusChange(booking._id, 'confirmed')}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Confirm">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {booking.status !== 'cancelled' && (
                      <button onClick={() => handleStatusChange(booking._id, 'cancelled')}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(booking)} className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {checkPermission('canDeleteAnyBooking') && (
                      <button onClick={() => handleDelete(booking._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No bookings found</h3>
          <p className="text-sm text-gray-400 mt-1">Create your first booking to get started</p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Booking' : 'New Booking'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select value={form.customer_id} onChange={(e) => setForm(f => ({ ...f, customer_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="">Select customer</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name || c.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Type</label>
              <select value={form.booking_type} onChange={(e) => setForm(f => ({ ...f, booking_type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="package">Package</option>
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="transfer">Transfer</option>
                <option value="activity">Activity</option>
                <option value="visa">Visa</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
              <input type="text" value={form.destination} onChange={(e) => setForm(f => ({ ...f, destination: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="e.g., Maldives" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travel Date *</label>
              <input type="date" value={form.travel_date} onChange={(e) => setForm(f => ({ ...f, travel_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
              <input type="date" value={form.return_date} onChange={(e) => setForm(f => ({ ...f, return_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travelers</label>
              <input type="number" min="1" value={form.num_travelers} onChange={(e) => setForm(f => ({ ...f, num_travelers: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
              <input type="number" value={form.total_amount} onChange={(e) => setForm(f => ({ ...f, total_amount: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="0" />
            </div>
          </div>
          {editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
          {editing && (
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
              <FileUpload
                category="booking"
                linkedTo={{ model: 'Booking', documentId: editing._id }}
                existingFiles={documents}
                allowMultiple={true}
                onUploadComplete={(newDocs) => setDocuments(prev => [...prev, ...newDocs])}
                onDelete={(id) => setDocuments(prev => prev.filter(d => d._id !== id))}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" placeholder="Any notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-sky-500 rounded-xl hover:bg-sky-600">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
