import { useState, useEffect } from 'react';
import { itineraryAPI } from '../services/api';
import type { Itinerary, ItineraryDay } from '../types';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { Plus, Search, Edit2, Trash2, Map, Clock, DollarSign, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function ItinerariesPage() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const showSlowSkeleton = useDelayedLoading(loading, 400);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<Itinerary | null>(null);
  const [editing, setEditing] = useState<Itinerary | null>(null);
  const [form, setForm] = useState({
    title: '',
    destinations: [{ city: '', country: '' }],
    startDate: '',
    endDate: '',
    tripType: 'domestic',
    description: '',
    price: '',
    status: 'draft',
    inclusions: '',
    exclusions: '',
  });
  const [days, setDays] = useState<ItineraryDay[]>([]);

  useEffect(() => { loadItineraries(); }, []);

  const loadItineraries = async () => {
    setLoading(true);
    try {
      const res = await itineraryAPI.getAll();
      const data = res.data.data;
      setItineraries(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '',
      destinations: [{ city: '', country: '' }],
      startDate: '',
      endDate: '',
      tripType: 'domestic',
      description: '',
      price: '',
      status: 'draft',
      inclusions: '',
      exclusions: ''
    });
    setDays([{ dayNumber: 1, title: '', description: '', activities: [], accommodation: {}, meals: {} }]);
    setModalOpen(true);
  };

  const openEdit = (it: Itinerary) => {
    setEditing(it);
    setForm({
      title: it.title || '',
      destinations: it.destinations?.length ? it.destinations : [{ city: '', country: '' }],
      startDate: it.startDate ? new Date(it.startDate).toISOString().split('T')[0] : '',
      endDate: it.endDate ? new Date(it.endDate).toISOString().split('T')[0] : '',
      tripType: it.tripType || 'domestic',
      description: it.description || '',
      price: String(it.pricing?.totalCost || ''),
      status: it.status || 'draft',
      inclusions: (it.inclusions || []).join(', '),
      exclusions: (it.exclusions || []).join(', '),
    });
    setDays(it.dayPlans?.length ? it.dayPlans : [{ dayNumber: 1, title: '', description: '', activities: [], accommodation: {}, meals: {} }]);
    setModalOpen(true);
  };

  const addDay = () => {
    setDays(d => [...d, { dayNumber: d.length + 1, title: '', description: '', activities: [], accommodation: {}, meals: {} }]);
  };

  const removeDay = (index: number) => {
    setDays(d => d.filter((_, i) => i !== index).map((day, i) => ({ ...day, dayNumber: i + 1 })));
  };

  const updateDay = (index: number, field: keyof ItineraryDay, value: any) => {
    setDays(d => d.map((day, i) => i === index ? { ...day, [field]: value } : day));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDate || !form.endDate) {
      toast.error('Title and dates are required');
      return;
    }

    // Calculate duration
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const duration = { nights: diffDays, days: diffDays + 1 };

    const payload = {
      ...form,
      duration,
      pricing: {
        totalCost: parseFloat(form.price) || 0,
        totalBaseCost: parseFloat(form.price) || 0 // engaging simple pricing for now
      },
      destinations: form.destinations,
      dayPlans: days,
      inclusions: form.inclusions.split(',').map(s => s.trim()).filter(Boolean),
      exclusions: form.exclusions.split(',').map(s => s.trim()).filter(Boolean),
    };

    // Clean up payload
    delete (payload as any).price;
    delete (payload as any).destination;

    try {
      if (editing) {
        await itineraryAPI.update(editing._id, payload);
        toast.success('Itinerary updated');
      } else {
        await itineraryAPI.create(payload);
        toast.success('Itinerary created');
      }
      setModalOpen(false);
      loadItineraries();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this itinerary?')) return;
    try {
      await itineraryAPI.delete(id);
      toast.success('Itinerary deleted');
      loadItineraries();
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = itineraries.filter(it =>
    it.title?.toLowerCase().includes(search.toLowerCase()) ||
    it.destinations?.some(d => d.city.toLowerCase().includes(search.toLowerCase()))
  );

  const statusStyle: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    proposed: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    modified: 'bg-amber-100 text-amber-700',
  };

  if (loading && itineraries.length === 0) {
    if (!showSlowSkeleton) {
      return <div className="h-24" />;
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-24 mt-2" />
          </div>
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <Skeleton className="h-32 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
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
          <h1 className="text-xl font-bold text-gray-900">Itineraries</h1>
          <p className="text-sm text-gray-500">{itineraries.length} trip plans</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium text-sm hover:bg-sky-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Create Itinerary
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search itineraries..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => (
            <div key={it._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 relative">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-bold text-white text-lg leading-tight">{it.title}</h3>
                  <p className="text-white/80 text-sm">{it.destinations?.[0]?.city}, {it.destinations?.[0]?.country}</p>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${statusStyle[it.status || 'draft']}`}>
                    {it.status || 'draft'}
                  </span>
                  <span className="ml-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-sm">
                    {it.tripType}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{it.duration?.days} days ({it.duration?.nights} nights)</span>
                  {it.pricing?.totalCost ? <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />₹{it.pricing.totalCost.toLocaleString()}</span> : null}
                </div>
                {it.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{it.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{it.dayPlans?.length || 0} day plan</span>
                  <div className="flex gap-1">
                    <button onClick={() => setViewModal(it)} className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(it)} className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(it._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Map className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No itineraries found</h3>
          <p className="text-sm text-gray-400 mt-1">Create your first trip plan</p>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-10 px-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="h-40 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 relative rounded-t-2xl">
              <button onClick={() => setViewModal(null)} className="absolute top-3 right-3 p-1.5 bg-white/20 rounded-lg text-white hover:bg-white/30">
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-6">
                <h2 className="text-2xl font-bold text-white">{viewModal.title}</h2>
                <p className="text-white/80">
                  {viewModal.destinations?.map(d => d.city).join(', ')} • {viewModal.duration?.days} Days / {viewModal.duration?.nights} Nights
                </p>
                <p className="text-white/60 text-sm mt-1">{viewModal.tripType} Trip • {new Date(viewModal.startDate).toLocaleDateString()} - {new Date(viewModal.endDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {viewModal.description && <p className="text-gray-600">{viewModal.description}</p>}
              {viewModal.inclusions?.length ? (
                <div>
                  <h4 className="font-semibold text-sm text-gray-800 mb-2">Inclusions</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewModal.inclusions.map((item, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs">✓ {item}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {viewModal.dayPlans?.map((day) => (
                <div key={day.dayNumber} className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800">Day {day.dayNumber}: {day.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{day.description}</p>
                  {day.accommodation?.hotelName && <p className="text-xs text-gray-500 mt-2">🏨 {day.accommodation.hotelName}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Itinerary' : 'Create Itinerary'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Golden Triangle Tour" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
              <select value={form.tripType} onChange={(e) => setForm(f => ({ ...f, tripType: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                {['domestic', 'international', 'honeymoon', 'family', 'adventure', 'business', 'group', 'solo', 'pilgrimage'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination City</label>
              <input type="text" value={form.destinations[0]?.city} onChange={(e) => {
                const val = e.target.value;
                setForm(f => ({ ...f, destinations: [{ ...f.destinations[0], city: val }] }));
              }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Paris" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Country</label>
              <input type="text" value={form.destinations[0]?.country} onChange={(e) => {
                const val = e.target.value;
                setForm(f => ({ ...f, destinations: [{ ...f.destinations[0], country: val }] }));
              }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="France" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Price (₹)</label>
              <input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inclusions (comma separated)</label>
              <input type="text" value={form.inclusions} onChange={(e) => setForm(f => ({ ...f, inclusions: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Hotel, Flights, Meals" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exclusions (comma separated)</label>
              <input type="text" value={form.exclusions} onChange={(e) => setForm(f => ({ ...f, exclusions: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Visa, Tips" />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-800">Day-wise Plan</h4>
              <button type="button" onClick={addDay} className="text-xs text-sky-500 hover:text-sky-600 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Day
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {days.map((day, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-sky-600">Day {day.dayNumber}</span>
                    {days.length > 1 && (
                      <button type="button" onClick={() => removeDay(idx)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={day.title} onChange={(e) => updateDay(idx, 'title', e.target.value)}
                      className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Day title" />
                    <input type="text" value={day.accommodation?.hotelName || ''} onChange={(e) => updateDay(idx, 'accommodation', { ...day.accommodation, hotelName: e.target.value })}
                      className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Hotel Name" />
                  </div>
                  <textarea value={day.description} onChange={(e) => updateDay(idx, 'description', e.target.value)} rows={2}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none mt-2" placeholder="Description" />
                </div>
              ))}
            </div>
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
