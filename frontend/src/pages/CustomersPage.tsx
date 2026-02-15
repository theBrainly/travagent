import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { customerAPI, uploadAPI } from '../services/api';
import type { Customer, Document } from '../types';
import { Modal } from '../components/Modal';
import { FileUpload } from '../components/FileUpload';
import { Skeleton } from '../components/Skeleton';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { Plus, Search, Edit2, Trash2, Users, Mail, Phone, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export function CustomersPage() {
  const { checkPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const showSlowSkeleton = useDelayedLoading(loading, 400);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '', passport_number: '', nationality: '', date_of_birth: '', notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, [debouncedSearch]);

  const loadDocuments = async (customerId: string) => {
    try {
      const res = await uploadAPI.getByResource('Customer', customerId);
      const docs = res.data.data.documents || [];
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch {
      console.error('Failed to load documents');
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = debouncedSearch ? { search: debouncedSearch } : undefined;
      const res = await customerAPI.getAll(params);
      const data = res.data.data;
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDocuments([]);
    setPendingFiles([]);
    setForm({ firstName: '', lastName: '', email: '', phone: '', address: '', passport_number: '', nationality: '', date_of_birth: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setPendingFiles([]);
    loadDocuments(c._id);
    setForm({
      firstName: c.firstName || c.name?.split(' ')[0] || '',
      lastName: c.lastName || c.name?.split(' ').slice(1).join(' ') || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address?.street || (typeof c.address === 'string' ? c.address : '') || '',
      passport_number: c.passportDetails?.passportNumber || c.passport_number || '',
      nationality: c.passportDetails?.issuedCountry || c.nationality || '',
      date_of_birth: c.dateOfBirth ? c.dateOfBirth.split('T')[0] : (c.date_of_birth ? c.date_of_birth.split('T')[0] : ''),
      notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('First Name, Last Name and Email are required');
      return;
    }

    // Construct payload matching backend expectations
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address: {
        street: form.address,
        country: form.nationality || 'India' // Default or mapped from nationality
      },
      passportDetails: {
        passportNumber: form.passport_number,
        issuedCountry: form.nationality
      },
      dateOfBirth: form.date_of_birth,
      notes: form.notes
    };

    try {
      if (editing) {
        await customerAPI.update(editing._id, payload);
        toast.success('Customer updated');
      } else {
        const created = await customerAPI.create(payload);
        const customerId = created?.data?.data?.customer?._id;

        if (pendingFiles.length > 0 && customerId) {
          try {
            if (pendingFiles.length === 1) {
              await uploadAPI.uploadSingle(pendingFiles[0], 'passport', { model: 'Customer', documentId: customerId });
            } else {
              await uploadAPI.uploadMultiple(pendingFiles, 'passport', { model: 'Customer', documentId: customerId });
            }
            toast.success(`Customer created and ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''} uploaded`);
          } catch {
            toast.error('Customer created, but file upload failed. You can upload files after opening edit.');
          }
        } else {
          toast.success('Customer created');
        }
      }
      setModalOpen(false);
      setPendingFiles([]);
      loadCustomers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      await customerAPI.delete(id);
      toast.success('Customer deleted');
      loadCustomers();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading && customers.length === 0) {
    if (!showSlowSkeleton) {
      return <div className="h-24" />;
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28 mt-2" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-40" />
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
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} total customers</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium text-sm hover:bg-sky-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      {customers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => {
            const displayName = customer.fullName || customer.name || `${customer.firstName} ${customer.lastName}`;
            const displayNationality = customer.passportDetails?.issuedCountry || customer.nationality;

            return (
              <div key={customer._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {displayName.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{displayName}</h3>
                      {displayNationality && (
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" />{displayNationality}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(customer)} className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {checkPermission('canDeleteAnyCustomer') && (
                      <button onClick={() => handleDelete(customer._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{customer.email}</div>
                  {customer.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{customer.phone}</div>}
                </div>
                {customer.notes && <p className="text-xs text-gray-400 mt-3 line-clamp-2">{customer.notes}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No customers found</h3>
          <p className="text-sm text-gray-400 mt-1">Add your first customer to get started</p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="First Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Last Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="+91..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input type="text" value={form.nationality} onChange={(e) => setForm(f => ({ ...f, nationality: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Indian" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
              <input type="text" value={form.passport_number} onChange={(e) => setForm(f => ({ ...f, passport_number: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="AB1234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Full address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" placeholder="Any notes..." />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
            {editing ? (
              <FileUpload
                category="passport"
                linkedTo={{ model: 'Customer', documentId: editing._id }}
                existingFiles={documents}
                allowMultiple={true}
                onUploadComplete={(newDocs) => setDocuments(prev => [...prev, ...newDocs])}
                onDelete={(id) => setDocuments(prev => prev.filter(d => d._id !== id))}
              />
            ) : (
              <>
                <FileUpload
                  category="passport"
                  allowMultiple={true}
                  deferUpload={true}
                  queuedFiles={pendingFiles}
                  onFilesSelected={(files) => setPendingFiles(prev => [...prev, ...files])}
                  onRemoveQueuedFile={(index) => setPendingFiles(prev => prev.filter((_, i) => i !== index))}
                />
                <p className="mt-2 text-xs text-gray-500">Selected files will be uploaded automatically after customer creation.</p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-sky-500 rounded-xl hover:bg-sky-600 transition-colors">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
