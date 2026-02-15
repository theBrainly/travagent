import { useState, useEffect } from 'react';
import { leadAPI } from '../services/api';
import type { Lead } from '../types';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { Plus, Search, Edit2, Trash2, UserPlus, ArrowRight, Filter, MessageSquare, MapPin, Calendar, DollarSign, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { color: string; bg: string }> = {
  new: { color: 'text-blue-700', bg: 'bg-blue-100' },
  contacted: { color: 'text-amber-700', bg: 'bg-amber-100' },
  qualified: { color: 'text-purple-700', bg: 'bg-purple-100' },
  converted: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  lost: { color: 'text-red-700', bg: 'bg-red-100' },
  // Fallback for capitalized values if any exist in DB
  New: { color: 'text-blue-700', bg: 'bg-blue-100' },
  Contacted: { color: 'text-amber-700', bg: 'bg-amber-100' },
  Qualified: { color: 'text-purple-700', bg: 'bg-purple-100' },
  Converted: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  Lost: { color: 'text-red-700', bg: 'bg-red-100' },
};

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const showSlowSkeleton = useDelayedLoading(loading, 400);
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', destination: '', travel_date: '',
    budget: '', num_travelers: '1', message: '', source: '', status: 'new',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    source: '', priority: '', createdFrom: '', createdTo: '',
    sortBy: 'createdAt', sortOrder: 'desc',
  });

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sortBy' && k !== 'sortOrder' && v !== 'createdAt' && v !== 'desc'
  ).length;

  const clearFilters = () => setFilters({
    source: '', priority: '', createdFrom: '', createdTo: '',
    sortBy: 'createdAt', sortOrder: 'desc',
  });

  useEffect(() => {
    loadLeads();
  }, [debouncedSearch, statusFilter, filters]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        source: filters.source || undefined,
        priority: filters.priority || undefined,
        createdFrom: filters.createdFrom || undefined,
        createdTo: filters.createdTo || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1,
        limit: 50
      };

      // Clean undefined params
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const res = await leadAPI.getAll(params);
      const data = res.data.data;
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', destination: '', travel_date: '', budget: '', num_travelers: '1', message: '', source: '', status: 'new' });
    setModalOpen(true);
  };

  const openEdit = (l: Lead) => {
    setEditing(l);
    setForm({
      name: l.fullName || (l.contactInfo?.firstName ? `${l.contactInfo.firstName} ${l.contactInfo.lastName}` : '') || l.name || '',
      email: l.contactInfo?.email || l.email || '',
      phone: l.contactInfo?.phone || l.phone || '',
      destination: l.enquiryDetails?.destination?.[0] || l.destination || '',
      travel_date: l.enquiryDetails?.startDate ? new Date(l.enquiryDetails.startDate).toISOString().split('T')[0] : (l.travel_date ? l.travel_date.split('T')[0] : ''),
      budget: String(l.enquiryDetails?.budgetRange?.max || l.budget || ''),
      num_travelers: String(l.enquiryDetails?.numberOfTravelers?.adults || l.num_travelers || 1),
      message: l.enquiryDetails?.specialRequirements || l.message || '',
      source: l.source || '',
      status: l.status || 'new',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }

    // Split name into first and last name
    const nameParts = form.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

    const payload = {
      contactInfo: {
        firstName,
        lastName,
        email: form.email,
        phone: form.phone,
      },
      enquiryDetails: {
        destination: form.destination ? [form.destination] : [],
        startDate: form.travel_date || undefined,
        budgetRange: {
          max: parseFloat(form.budget) || 0,
          currency: 'INR'
        },
        numberOfTravelers: {
          adults: parseInt(form.num_travelers) || 1
        },
        specialRequirements: form.message
      },
      source: form.source || 'website',
      status: form.status
    };

    try {
      if (editing) {
        // For update, we might need to adjust the payload structure or use a specific update endpoint that handles partial updates better
        // But assuming the update endpoint expects a similar structure or Mongoose handles it:
        await leadAPI.update(editing._id, payload);
        toast.success('Lead updated');
      } else {
        await leadAPI.create(payload);
        toast.success('Lead captured');
      }
      setModalOpen(false);
      loadLeads();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await leadAPI.convertToBooking(id);
      toast.success('Lead converted to booking!');
      loadLeads();
    } catch {
      // Fallback: update status to Converted
      try {
        await leadAPI.update(id, { status: 'converted' });
        toast.success('Lead marked as converted');
        loadLeads();
      } catch {
        toast.error('Conversion failed');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await leadAPI.delete(id);
      toast.success('Lead deleted');
      loadLeads();
    } catch {
      toast.error('Delete failed');
    }
  };

  // Removed client-side filtering variable 'filtered'
  // using 'leads' state directly which is now filtered from server

  if (loading && leads.length === 0) {
    if (!showSlowSkeleton) {
      return <div className="h-24" />;
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-24 mt-2" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-full sm:w-44 rounded-xl" />
          <Skeleton className="h-10 w-full sm:w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{leads.length} enquiries</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium text-sm hover:bg-sky-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Capture Lead
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none bg-white">
            <option value="All">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Advanced Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
              <select value={filters.source}
                onChange={(e) => setFilters(f => ({ ...f, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="">All Sources</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="walk_in">Walk-in</option>
                <option value="partner">Partner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select value={filters.priority}
                onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created From</label>
              <input type="date" value={filters.createdFrom}
                onChange={(e) => setFilters(f => ({ ...f, createdFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created To</label>
              <input type="date" value={filters.createdTo}
                onChange={(e) => setFilters(f => ({ ...f, createdTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
              <select value={filters.sortBy}
                onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="createdAt">Created Date</option>
                <option value="score">Lead Score</option>
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

      {/* Lead Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['new', 'contacted', 'qualified', 'converted', 'lost'].map(status => {
          const count = leads.filter(l => l.status === status).length;
          const cfg = statusConfig[status] || statusConfig.new;
          return (
            <div key={status} className={`${cfg.bg} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
              <p className={`text-xs font-medium ${cfg.color} capitalize`}>{status}</p>
            </div>
          );
        })}
      </div>

      {leads.length > 0 ? (
        <div className="space-y-3">
          {leads.map((lead) => {
            const cfg = statusConfig[lead.status] || statusConfig.new;
            const name = lead.fullName || lead.contactInfo?.firstName + ' ' + (lead.contactInfo?.lastName || '') || lead.name || 'Unknown';
            const email = lead.contactInfo?.email || lead.email || '';
            const phone = lead.contactInfo?.phone || lead.phone || '';
            const destination = lead.enquiryDetails?.destination?.[0] || lead.destination || '';
            const travelDate = lead.enquiryDetails?.startDate ? new Date(lead.enquiryDetails.startDate) : (lead.travel_date ? new Date(lead.travel_date) : null);
            const budget = lead.enquiryDetails?.budgetRange?.max || lead.budget;
            const message = lead.enquiryDetails?.specialRequirements || lead.message;

            return (
              <div key={lead._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white font-bold text-sm">
                        {name.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{name}</h3>
                        <p className="text-xs text-gray-500">{email} {phone && `• ${phone}`}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 ml-[52px]">
                      {destination && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{destination}</span>}
                      {travelDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{travelDate.toLocaleDateString()}</span>}
                      {budget ? <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />₹{budget.toLocaleString()}</span> : null}
                      {lead.source && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize">{lead.source.replace('_', ' ')}</span>}
                    </div>
                    {message && (
                      <p className="text-xs text-gray-400 mt-2 ml-[52px] flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{message}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${cfg.bg} ${cfg.color}`}>
                      {lead.status}
                    </span>
                    {lead.status !== 'converted' && lead.status !== 'lost' && (
                      <button onClick={() => handleConvert(lead._id)}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Convert to Booking">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(lead)} className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(lead._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No leads found</h3>
          <p className="text-sm text-gray-400 mt-1">Start capturing travel enquiries</p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Lead' : 'Capture Lead'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <input type="text" value={form.destination} onChange={(e) => setForm(f => ({ ...f, destination: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Bali, Thailand..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travel Date</label>
              <input type="date" value={form.travel_date} onChange={(e) => setForm(f => ({ ...f, travel_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
              <input type="number" value={form.budget} onChange={(e) => setForm(f => ({ ...f, budget: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="">Select source</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="walk_in">Walk-in</option>
                <option value="partner">Partner</option>
                <option value="other">Other</option>
              </select>
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" placeholder="Enquiry details..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-sky-500 rounded-xl hover:bg-sky-600">{editing ? 'Update' : 'Capture'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
