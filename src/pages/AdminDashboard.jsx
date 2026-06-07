// src/pages/AdminDashboard.jsx
// ADDED: Manage Products tab — full CRUD (add, edit, toggle active, delete)
// ADDED: Orders tab — view all customer orders with user details and address
// ADDED: Manage Services tab — full CRUD with bilingual (EN/HI) support

import React, { useState } from 'react';
import { Leaf, Calendar, Clock, Users, CheckCircle, XCircle, Bell, LogOut, Search, TrendingUp, Activity, Star, Stethoscope, PieChart, Trash2, Eye, Package, Plus, Edit2, ToggleLeft, ToggleRight, X, ShoppingBag, MapPin, Phone, User, MessageSquare, Mail, MailOpen, Wrench, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAllAppointments } from '../hooks/useAppointments';
import { useAdminDoctors } from '../hooks/useDoctors';
import { useAdminProducts, useOrders } from '../hooks/useProducts';
import { useAdminServices } from '../hooks/useServices';
import ServiceModal from '../components/admin/ServiceModal';
import { useContactMessages } from '../hooks/useContact';
import { useAdminBlogs } from '../hooks/useBlogs';
import BlogModal from '../components/admin/BlogModal';
import { getImageUrl } from '../lib/blogStorage';
import { uploadProductImage, deleteProductImage, getProductImageUrl } from '../lib/productStorage';

// Small inline component to render blog thumbnail in table
const BlogThumb = ({ path }) => {
  const url = getImageUrl(path);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className="w-full h-full object-cover"
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
};
import { sendOrderConfirmation, sendOrderTracking } from '../lib/whatsapp';

const statusConfig = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

const CATEGORIES = [
  'Featured',
  'Immunity, Brain & Strength (Rasayana)',
  'Respiratory Health (Lungs & Breathing)',
  'Fever & Infection Recovery',
  'Organ Health (Heart, Kidney, Liver)',
  'Hair & Beauty',
  'General',
];

const EMPTY_FORM = { name: '', headline: '', description: '', category: CATEGORIES[0], price: '', stock: '', is_active: true, image_url: '' };

// ── Product Form Modal ────────────────────────────────────────
// Supports image upload to Supabase Storage exactly like BlogModal.
const ProductModal = ({ initial, onSave, onClose, saving }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);   // pending File to upload
  const [imagePreview, setImagePreview] = useState(  // live preview URL
    initial?.image_url ? getProductImageUrl(initial.image_url) : null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    set('image_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.category)    { setError('Please select a category.'); return; }
    setError('');

    let imageUrl = form.image_url || '';

    // If a new file was chosen, upload it first
    if (imageFile) {
      setUploading(true);
      // Delete old image from storage if it existed and was a storage path (not an http URL)
      if (initial?.image_url && !initial.image_url.startsWith('http')) {
        await deleteProductImage(initial.image_url);
      }
      const { path, error: uploadErr } = await uploadProductImage(imageFile);
      setUploading(false);
      if (uploadErr) { setError(`Image upload failed: ${uploadErr.message}`); return; }
      imageUrl = path;
    }

    onSave({
      name:        form.name.trim(),
      headline:    form.headline.trim(),
      description: form.description.trim(),
      category:    form.category,
      price:       parseFloat(form.price) || 0,
      stock:       parseInt(form.stock)   || 100,
      is_active:   form.is_active,
      image_url:   imageUrl,
    });
  };

  const isBusy = saving || uploading;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 text-lg">{initial ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Product Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Chyawanprash"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          {/* Headline */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tagline / Headline</label>
            <input value={form.headline} onChange={e => set('headline', e.target.value)}
              placeholder="e.g. Your Family's Daily Immunity Shield."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Describe the product benefits..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Price (₹)</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)}
                placeholder="100"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>

          {/* ── Image Upload ── mirrors BlogModal pattern exactly ── */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Product Image</label>
            {imagePreview ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-2">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-white border border-slate-200 rounded-full p-1.5 text-slate-500 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors"
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
              >
                <Package size={24} className="text-slate-300" />
                <p className="text-xs text-slate-400 font-medium">Click to upload image</p>
                <p className="text-[10px] text-slate-300">JPG, PNG, WebP up to 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
            {imagePreview && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Replace image
              </button>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Visible to users</p>
              <p className="text-xs text-slate-400">Show this product on the Products page</p>
            </div>
            <button onClick={() => set('is_active', !form.is_active)}
              className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${form.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
              {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={isBusy}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isBusy}
              className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
              {uploading ? 'Uploading image…' : saving ? 'Saving…' : (initial ? 'Update Product' : 'Add Product')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main AdminDashboard ───────────────────────────────────────
const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const { appointments, loading: apptLoading, updateStatus, deleteAppointment } = useAllAppointments();
  const { doctors, loading: docLoading, addDoctor, updateDoctor, deleteDoctor, toggleActive, linkDoctorToUser, fetchDoctorProfiles } = useAdminDoctors();
  const { products, loading: prodLoading, addProduct, updateProduct, deleteProduct } = useAdminProducts();
  const { orders, loading: ordersLoading, updateOrderStatus } = useOrders();
  const { messages, loading: msgLoading, markRead, deleteMessage } = useContactMessages();
  const { services: svcList, loading: svcLoading, addService, updateService, deleteService, toggleVisibility } = useAdminServices();

  const [activeTab, setActiveTab]       = useState('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');
  const [notifOpen, setNotifOpen]       = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [linkModal, setLinkModal]       = useState(null);
  const [doctorProfiles, setDoctorProfiles] = useState([]);
  const [linkLoading, setLinkLoading]   = useState(false);
  const [linkSuccess, setLinkSuccess]   = useState(null);

  // Products state
  const [productModal, setProductModal] = useState(null); // null | 'add' | { ...product }
  const [prodSaving, setProdSaving]     = useState(false);
  const [prodSearch, setProdSearch]     = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // product id

  // Services state
  const [serviceModal, setServiceModal]         = useState(null); // null | 'add' | { ...service }
  const [svcSaving, setSvcSaving]               = useState(false);
  const [svcSearch, setSvcSearch]               = useState('');
  const [svcDeleteConfirm, setSvcDeleteConfirm] = useState(null);

  // Blogs state
  const { blogs: blogList, loading: blogLoading, addBlog, updateBlog, deleteBlog, toggleVisibility: toggleBlogVisibility } = useAdminBlogs();
  const [blogModal, setBlogModal]                 = useState(null); // null | 'add' | { ...blog }
  const [blogSaving, setBlogSaving]               = useState(false);
  const [blogSearch, setBlogSearch]               = useState('');
  const [blogDeleteConfirm, setBlogDeleteConfirm] = useState(null);

  // Orders state
  const [orderSearch, setOrderSearch]   = useState('');
  const [orderFilter, setOrderFilter]   = useState('all');
  const [orderSort, setOrderSort]       = useState('newest');

  // Messages state
  const [selectedMsg, setSelectedMsg]         = useState(null);
  const [msgDeleteConfirm, setMsgDeleteConfirm] = useState(null);
  const [msgSearch, setMsgSearch]             = useState('');

  // Doctor modal state
  const [doctorModal, setDoctorModal]                 = useState(null); // { mode: 'add'|'edit', doc }
  const [doctorDeleteConfirm, setDoctorDeleteConfirm] = useState(null);
  const [doctorSaving, setDoctorSaving]               = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: '', specialty: '', tag: '', experience: '', patients_treated: '',
    rating: '', bio: '', specialties: '', availability: '', initials: '',
    color: 'from-emerald-600 to-emerald-800', avatar_url: '', is_active: true,
  });

  const openLinkModal = async (doc) => {
    setLinkModal({ doctorId: doc.id, doctorName: doc.name, currentUserId: doc.user_id });
    setLinkSuccess(null);
    const { data } = await fetchDoctorProfiles();
    setDoctorProfiles(data || []);
  };

  const handleLinkAccount = async (userId) => {
    if (!linkModal) return;
    setLinkLoading(true);
    const { error } = await linkDoctorToUser(linkModal.doctorId, userId);
    setLinkLoading(false);
    if (!error) { setLinkSuccess('Linked successfully!'); setTimeout(() => setLinkModal(null), 1500); }
  };

  const handleSaveProduct = async (data) => {
    setProdSaving(true);
    if (productModal === 'add') {
      await addProduct(data);
    } else {
      await updateProduct(productModal.id, data);
    }
    setProdSaving(false);
    setProductModal(null);
  };

  const handleToggleActive = async (product) => {
    await updateProduct(product.id, { is_active: !product.is_active });
  };

  const handleDeleteProduct = async (id) => {
    await deleteProduct(id);
    setDeleteConfirm(null);
  };

  const handleSaveService = async (data) => {
    setSvcSaving(true);
    if (serviceModal === 'add') {
      await addService(data);
    } else {
      await updateService(serviceModal.id, data);
    }
    setSvcSaving(false);
    setServiceModal(null);
  };

  const handleToggleServiceVisibility = async (service) => {
    await toggleVisibility(service.id, !service.is_visible);
  };

  const handleDeleteService = async (id) => {
    await deleteService(id);
    setSvcDeleteConfirm(null);
  };

  // ── Blog handlers ────────────────────────────────────────────
  const handleSaveBlog = async (data) => {
    setBlogSaving(true);
    if (blogModal === 'add') {
      await addBlog(data);
    } else {
      await updateBlog(blogModal.id, data);
    }
    setBlogSaving(false);
    setBlogModal(null);
  };

  const handleToggleBlogVisibility = async (blog) => {
    await toggleBlogVisibility(blog.id, !blog.is_visible);
  };

  const handleDeleteBlog = async (id) => {
    await deleteBlog(id);
    setBlogDeleteConfirm(null);
  };

  const filteredBlogs = blogList.filter(b =>
    !blogSearch ||
    (b.title || '').toLowerCase().includes(blogSearch.toLowerCase()) ||
    (b.title_hi || '').toLowerCase().includes(blogSearch.toLowerCase()) ||
    (b.slug || '').toLowerCase().includes(blogSearch.toLowerCase())
  );

    const filteredServices = svcList.filter(s =>
    !svcSearch ||
    s.title_en.toLowerCase().includes(svcSearch.toLowerCase()) ||
    (s.title_hi || '').toLowerCase().includes(svcSearch.toLowerCase())
  );

  const handleDeleteMsg = async (id) => {
    await deleteMessage(id);
    setMsgDeleteConfirm(null);
    if (selectedMsg?.id === id) setSelectedMsg(null);
  };

  const openDoctorModal = (mode, doc = null) => {
    setDoctorForm(doc ? {
      name:             doc.name             || '',
      specialty:        doc.specialty        || '',
      tag:              doc.tag              || '',
      experience:       doc.experience       || '',
      patients_treated: doc.patients_treated || '',
      rating:           doc.rating           || '',
      bio:              doc.bio              || '',
      specialties:      doc.specialties      || '',
      availability:     doc.availability     || '',
      initials:         doc.initials         || '',
      color:            doc.color            || 'from-emerald-600 to-emerald-800',
      avatar_url:       doc.avatar_url       || '',
      is_active:        doc.is_active !== false,
    } : {
      name: '', specialty: '', tag: '', experience: '', patients_treated: '',
      rating: '', bio: '', specialties: '', availability: '', initials: '',
      color: 'from-emerald-600 to-emerald-800', avatar_url: '', is_active: true,
    });
    setDoctorModal({ mode, doc });
  };

  const handleDoctorSave = async () => {
    if (!doctorForm.name.trim()) return;
    setDoctorSaving(true);
    const payload = { ...doctorForm, rating: doctorForm.rating ? parseFloat(doctorForm.rating) : null };
    if (doctorModal.mode === 'edit') {
      await updateDoctor(doctorModal.doc.id, payload);
    } else {
      await addDoctor(payload);
    }
    setDoctorSaving(false);
    setDoctorModal(null);
  };

  const handleDoctorDelete = async (id) => {
    await deleteDoctor(id);
    setDoctorDeleteConfirm(null);
  };

  const d0 = new Date();
  const today = `${d0.getFullYear()}-${String(d0.getMonth()+1).padStart(2,'0')}-${String(d0.getDate()).padStart(2,'0')}`;
  const stats = {
    total:     appointments.length,
    today:     appointments.filter(a => a.date === today).length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    doctors:   doctors.length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  const filtered = appointments.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchSearch = !search ||
      (a.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.doctor_name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.service      || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredProducts = products.filter(p =>
    !prodSearch ||
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(prodSearch.toLowerCase())
  );

  const serviceBreakdown = appointments.reduce((acc, a) => {
    const svc = a.service || 'General';
    acc[svc] = (acc[svc] || 0) + 1;
    return acc;
  }, {});

  const tabs = [
    { key: 'overview',     label: 'Overview',     icon: PieChart },
    { key: 'appointments', label: 'Appointments', icon: Calendar },
    { key: 'doctors',      label: 'Doctors',      icon: Stethoscope },
    { key: 'products',     label: 'Products',     icon: Package },
    { key: 'orders',       label: 'Orders',       icon: ShoppingBag },
    { key: 'messages',     label: 'Messages',     icon: MessageSquare, badge: messages.filter(m => !m.is_read).length },
    { key: 'services',     label: 'Services',     icon: Wrench },
    { key: 'blogs',        label: 'Blogs',        icon: BookOpen },
  ];

  const adminInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Nav */}
      <nav className="bg-emerald-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-700 p-1.5 rounded-lg"><Leaf size={20} /></div>
          <div>
            <p className="text-xs text-slate-400 leading-none">Admin Panel</p>
            <p className="font-bold text-sm leading-tight">Shree Mrikula Ji Clinic</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Bell size={20} />
              {stats.pending > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">{stats.pending}</span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 z-50">
                <div className="p-4 border-b border-slate-100"><p className="font-bold text-slate-800">Pending Approvals</p></div>
                {appointments.filter(a => a.status === 'pending').slice(0, 5).map(a => (
                  <div key={a.id} className="p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                    <p className="text-sm font-semibold text-slate-800">{a.patient_name} → {a.doctor_name}</p>
                    <p className="text-xs text-slate-500">{a.service} • {a.date} {a.time_slot}</p>
                  </div>
                ))}
                {stats.pending === 0 && <div className="p-4 text-sm text-slate-400 text-center">No pending appointments</div>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-emerald-800 px-3 py-1.5 rounded-lg">
            <div className="w-7 h-7 bg-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">{adminInitials}</div>
            <div className="hidden md:block">
              <p className="text-xs text-slate-400 leading-none">Logged in as</p>
              <p className="text-sm font-semibold leading-tight">{profile?.full_name || 'Admin'}</p>
            </div>
          </div>
          <button onClick={signOut} className="p-2 hover:bg-red-700 rounded-lg transition-colors" title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-16 md:w-56 bg-white border-r border-slate-100 min-h-screen sticky top-14 pt-6 shrink-0 shadow-sm">
          <nav className="space-y-1 px-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className="relative shrink-0">
                    <Icon size={18} />
                    {tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{tab.badge}</span>
                    )}
                  </div>
                  <span className="hidden md:block">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 max-w-6xl">

          {(apptLoading || docLoading) && (
            <div className="text-center py-20 text-slate-400">
              <p className="animate-pulse text-lg font-medium">Loading dashboard data...</p>
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {!apptLoading && activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
                <p className="text-slate-500 text-sm mt-1">Clinic performance summary</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Total Appointments',   value: stats.total,     icon: Calendar,    gradient: 'from-emerald-500 to-emerald-700' },
                  { label: "Today's Appointments", value: stats.today,     icon: Clock,       gradient: 'from-blue-500 to-blue-700' },
                  { label: 'Active Doctors',        value: stats.doctors,  icon: Stethoscope, gradient: 'from-violet-500 to-violet-700' },
                  { label: 'Pending',               value: stats.pending,  icon: Activity,    gradient: 'from-amber-400 to-amber-600' },
                  { label: 'Completed',             value: stats.completed,icon: CheckCircle, gradient: 'from-teal-500 to-teal-700' },
                  { label: 'Cancelled',             value: stats.cancelled,icon: XCircle,     gradient: 'from-red-400 to-red-600' },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} text-white rounded-2xl p-5 shadow-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/80 text-sm font-medium">{stat.label}</p>
                        <Icon size={18} className="text-white/80" />
                      </div>
                      <p className="text-4xl font-bold">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Service Breakdown</h3>
                  {appointments.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No appointments yet</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(serviceBreakdown).sort((a, b) => b[1] - a[1]).map(([service, count]) => (
                        <div key={service}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700 font-medium truncate pr-2">{service}</span>
                            <span className="text-slate-500 shrink-0">{count} appts</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / appointments.length) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Star size={16} className="text-emerald-600" /> Doctor Performance</h3>
                  {doctors.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No doctors yet</p>
                  ) : (() => {
                    const maxAppts = Math.max(...doctors.map(doc => appointments.filter(a => a.doctor_name === doc.name).length), 1);
                    return (
                    <div className="space-y-4">
                      {doctors.map(doc => {
                        const docAppts = appointments.filter(a => a.doctor_name === doc.name);
                        const completed = docAppts.filter(a => a.status === 'completed').length;
                        const pending   = docAppts.filter(a => a.status === 'pending').length;
                        const barPct    = Math.round((docAppts.length / maxAppts) * 100);
                        const initials = doc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <div key={doc.id} className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{initials}</div>
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-slate-800">{doc.name}</span>
                                <span className="text-slate-500 text-xs">{docAppts.length} total · {completed} done · {pending} pending</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                                  style={{ width: `${barPct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-4">Recent Appointments</h3>
                {appointments.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No appointments yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-slate-400">
                          <th className="pb-2 font-semibold">Patient</th>
                          <th className="pb-2 font-semibold hidden md:table-cell">Doctor</th>
                          <th className="pb-2 font-semibold hidden md:table-cell">Service</th>
                          <th className="pb-2 font-semibold">Date</th>
                          <th className="pb-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.slice(0, 6).map(a => (
                          <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 font-medium text-slate-800">{a.patient_name}</td>
                            <td className="py-2.5 text-slate-600 hidden md:table-cell">{a.doctor_name}</td>
                            <td className="py-2.5 text-slate-500 hidden md:table-cell">{a.service}</td>
                            <td className="py-2.5 text-slate-500">{a.date}</td>
                            <td className="py-2.5">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig[a.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                {statusConfig[a.status]?.label || a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── APPOINTMENTS ── */}
          {!apptLoading && activeTab === 'appointments' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">All Appointments</h1>
                <span className="text-sm text-slate-500">{filtered.length} records</span>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, doctor, or service..." className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {(filterStatus !== 'all' || search) && (
                  <button onClick={() => { setFilterStatus('all'); setSearch(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
                )}
              </div>

              <div className="flex gap-5">
                <div className={`${selectedAppt ? 'hidden md:block md:flex-1' : 'w-full'}`}>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500">
                            <th className="px-4 py-3 font-semibold">Patient</th>
                            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Doctor</th>
                            <th className="px-4 py-3 font-semibold hidden md:table-cell">Date & Time</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(a => (
                            <tr key={a.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedAppt?.id === a.id ? 'bg-emerald-50' : ''}`}>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-800">{a.patient_name}</p>
                                <p className="text-xs text-slate-400">{a.service}</p>
                              </td>
                              <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{a.doctor_name}</td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <p className="text-slate-700">{a.date}</p>
                                <p className="text-xs text-slate-400">{a.time_slot}</p>
                              </td>
                              <td className="px-4 py-3">
                                <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                                  className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${statusConfig[a.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                  {(() => {
                                    const APPT_RANK = { pending:0, confirmed:1, completed:2, cancelled:3 };
                                    return ['pending','confirmed','completed','cancelled'].map(s => {
                                      const cur = APPT_RANK[a.status];
                                      const isBackward = APPT_RANK[s] < cur;
                                      const isCancelLocked = s === 'cancelled' && cur >= APPT_RANK['confirmed'];
                                      return <option key={s} value={s} disabled={isBackward || isCancelLocked}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>;
                                    });
                                  })()}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setSelectedAppt(selectedAppt?.id === a.id ? null : a)} className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"><Eye size={14} /></button>
                                  <button onClick={() => deleteAppointment(a.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filtered.length === 0 && (
                      <div className="text-center py-16 text-slate-400">
                        <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No appointments found.</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAppt && (
                  <div className="w-full md:w-72 shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm sticky top-20">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm">Details</h3>
                        <button onClick={() => setSelectedAppt(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={18} /></button>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                            {(selectedAppt.patient_name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{selectedAppt.patient_name}</p>
                            <p className="text-xs text-slate-500">{selectedAppt.patient_age}y, {selectedAppt.patient_gender}</p>
                          </div>
                        </div>
                        {[
                          { label: 'Doctor',  value: selectedAppt.doctor_name },
                          { label: 'Service', value: selectedAppt.service },
                          { label: 'Date',    value: selectedAppt.date },
                          { label: 'Time',    value: selectedAppt.time_slot },
                          { label: 'Phone',   value: selectedAppt.patient_phone },
                          { label: 'Type',    value: selectedAppt.consult_type },
                        ].filter(r => r.value).map(r => (
                          <div key={r.label} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                            <span className="text-slate-400">{r.label}</span>
                            <span className="font-semibold text-slate-700 capitalize">{r.value}</span>
                          </div>
                        ))}
                        {selectedAppt.notes && (
                          <div className="pt-1">
                            <p className="text-xs text-slate-400 mb-1">Notes</p>
                            <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">{selectedAppt.notes}</p>
                          </div>
                        )}
                        <div className="pt-1">
                          <label className="text-xs text-slate-400 block mb-1">Update Status</label>
                          <select value={selectedAppt.status}
                            onChange={e => { updateStatus(selectedAppt.id, e.target.value); setSelectedAppt(prev => ({ ...prev, status: e.target.value })); }}
                            className={`text-sm font-semibold w-full px-3 py-2 rounded-xl border ${statusConfig[selectedAppt.status]?.color || 'bg-slate-100 text-slate-600'} outline-none cursor-pointer`}>
                            {(() => {
                              const APPT_RANK = { pending:0, confirmed:1, completed:2, cancelled:3 };
                              return ['pending','confirmed','completed','cancelled'].map(s => {
                                const cur = APPT_RANK[selectedAppt.status];
                                const isBackward = APPT_RANK[s] < cur;
                                const isCancelLocked = s === 'cancelled' && cur >= APPT_RANK['confirmed'];
                                return <option key={s} value={s} disabled={isBackward || isCancelLocked}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>;
                              });
                            })()}
                          </select>
                        </div>
                        <button onClick={() => { deleteAppointment(selectedAppt.id); setSelectedAppt(null); }}
                          className="w-full mt-2 bg-red-50 text-red-600 font-semibold py-2 rounded-xl hover:bg-red-100 transition-all text-sm flex items-center justify-center gap-2">
                          <Trash2 size={14} /> Delete Appointment
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DOCTORS ── */}
          {activeTab === 'doctors' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Manage Doctors</h1>
                  <p className="text-slate-500 text-sm mt-0.5">{doctors.length} doctors in the system</p>
                </div>
                <button onClick={() => openDoctorModal('add')}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                  <Plus size={16} /> Add Doctor
                </button>
              </div>

              {docLoading ? (
                <div className="text-center py-20 text-slate-400 animate-pulse">Loading doctors...</div>
              ) : doctors.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <Stethoscope size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="text-slate-400 font-medium">No doctors found in the database.</p>
                  <button onClick={() => openDoctorModal('add')}
                    className="mt-4 text-sm bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl hover:bg-emerald-800">
                    Add First Doctor
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {doctors.map(doc => {
                    const docAppts     = appointments.filter(a => a.doctor_name === doc.name);
                    const completedCount = docAppts.filter(a => a.status === 'completed').length;
                    const initials     = (doc.initials || doc.name.split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase();
                    return (
                      <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center gap-5">
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden bg-emerald-100 text-emerald-700">
                          {doc.avatar_url
                            ? <img src={doc.avatar_url} alt={doc.name} className="w-full h-full object-cover" />
                            : initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-[180px]">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-bold text-slate-800 text-lg">{doc.name}</p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${doc.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {doc.is_active !== false ? 'active' : 'inactive'}
                            </span>
                            {doc.tag && <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">{doc.tag}</span>}
                          </div>
                          <p className="text-slate-500 text-sm">{doc.specialty}</p>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {doc.experience      && <span className="text-emerald-700 text-xs font-semibold">{doc.experience} exp</span>}
                            {doc.patients_treated && <span className="text-slate-400 text-xs">{doc.patients_treated} patients</span>}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-6 text-center">
                          <div>
                            <p className="text-2xl font-bold text-slate-800">{docAppts.length}</p>
                            <p className="text-xs text-slate-400">Appointments</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
                            <p className="text-xs text-slate-400">Completed</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-auto">
                          <button onClick={() => openDoctorModal('edit', doc)}
                            className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => toggleActive(doc.id, !doc.is_active)}
                            className={`p-2 rounded-lg transition-all ${doc.is_active !== false ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}
                            title={doc.is_active !== false ? 'Deactivate' : 'Activate'}>
                            {doc.is_active !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button onClick={() => setDoctorDeleteConfirm(doc.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Manage Products</h1>
                  <p className="text-slate-500 text-sm mt-0.5">{products.length} products in catalog</p>
                </div>
                <button onClick={() => setProductModal('add')}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                  <Plus size={16} /> Add Product
                </button>
              </div>

              {/* Search */}
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                    placeholder="Search products or categories..."
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                {prodSearch && <button onClick={() => setProdSearch('')} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Products', value: products.length,                                  color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { label: 'Active',         value: products.filter(p => p.is_active).length,         color: 'bg-blue-50 text-blue-700 border-blue-100' },
                  { label: 'Hidden',         value: products.filter(p => !p.is_active).length,        color: 'bg-slate-50 text-slate-500 border-slate-100' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
                    <p className="text-3xl font-bold">{s.value}</p>
                    <p className="text-xs font-semibold mt-0.5 opacity-70">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Products table */}
              {prodLoading ? (
                <div className="text-center py-16 text-slate-400 animate-pulse">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <Package size={40} className="mx-auto mb-3 opacity-20 text-slate-400" />
                  <p className="text-slate-400 font-medium">{prodSearch ? `No products matching "${prodSearch}"` : 'No products yet. Click "Add Product" to get started.'}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500">
                          <th className="px-4 py-3 font-semibold">Product</th>
                          <th className="px-4 py-3 font-semibold hidden md:table-cell">Category</th>
                          <th className="px-4 py-3 font-semibold hidden lg:table-cell">Price</th>
                          <th className="px-4 py-3 font-semibold hidden lg:table-cell">Stock</th>
                          <th className="px-4 py-3 font-semibold text-center">Visible</th>
                          <th className="px-4 py-3 font-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map(p => (
                          <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {/* Thumbnail */}
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                                  {p.image_url ? (
                                    <img
                                      src={getProductImageUrl(p.image_url)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      onError={e => { e.target.style.display='none'; }}
                                    />
                                  ) : (
                                    <Package size={16} className="text-slate-300" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{p.name}</p>
                                  {p.headline && <p className="text-xs text-slate-400 truncate max-w-[180px]">{p.headline}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-full">{p.category || 'General'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-semibold hidden lg:table-cell">
                              {p.price ? `₹${p.price}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{p.stock ?? '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleToggleActive(p)}
                                className={`transition-colors ${p.is_active ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-300 hover:text-slate-500'}`}
                                title={p.is_active ? 'Click to hide' : 'Click to show'}>
                                {p.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setProductModal(p)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => setDeleteConfirm(p.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (() => {
            const ORDER_STATUS_CFG = {
              pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700' },
              processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
              shipped:    { label: 'Shipped',    color: 'bg-purple-100 text-purple-700' },
              delivered:  { label: 'Delivered',  color: 'bg-emerald-100 text-emerald-700' },
              cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700' },
            };

            const parseAddr = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

            // filter + search (exclude delivered here; they go to bottom section)
            const matchesFilter = (o) => {
              if (orderFilter !== 'all' && o.status !== orderFilter) return false;
              if (!orderSearch.trim()) return true;
              const q = orderSearch.toLowerCase();
              const addr = parseAddr(o.delivery_address);
              return (
                o.id.toLowerCase().includes(q) ||
                (addr?.full_name || '').toLowerCase().includes(q) ||
                (addr?.mobile || '').includes(q) ||
                (addr?.city || '').toLowerCase().includes(q) ||
                (o.items || []).some(i => i.name.toLowerCase().includes(q))
              );
            };

            const sortFn = (a, b) => {
              if (orderSort === 'newest')  return new Date(b.created_at) - new Date(a.created_at);
              if (orderSort === 'oldest')  return new Date(a.created_at) - new Date(b.created_at);
              if (orderSort === 'highest') return Number(b.total) - Number(a.total);
              if (orderSort === 'lowest')  return Number(a.total) - Number(b.total);
              return 0;
            };

            const activeOrders    = orders.filter(o => o.status !== 'delivered' && matchesFilter(o)).sort(sortFn);
            const deliveredOrders = orders.filter(o => o.status === 'delivered'  && matchesFilter(o)).sort(sortFn);
            const totalShown      = activeOrders.length + deliveredOrders.length;

            const OrderCard = ({ order }) => {
              const addr = parseAddr(order.delivery_address);
              const sc   = ORDER_STATUS_CFG[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-600' };
              return (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <p className="text-xs text-slate-400 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
                      <select
                        value={order.status}
                        onChange={async (e) => {
                          const prevStatus = order.status;
                          const newStatus  = e.target.value;
                          const { error: updateErr } = await updateOrderStatus(order.id, newStatus);
                          if (updateErr) {
                            console.error('[Orders] Status update failed:', updateErr.message);
                            return;
                          }

                          const addrData = parseAddr(order.delivery_address);
                          const phone    = addrData?.mobile;
                          const orderId  = '#' + order.id.slice(0, 8).toUpperCase();

                          if (!phone) {
                            console.warn(`[WhatsApp] No phone found for order ${order.id} — delivery_address may be missing or unparseable. Raw: ${order.delivery_address}`);
                            return;
                          }

                          // smac_order_confirm — fires ONLY on pending → processing
                          if (prevStatus === 'pending' && newStatus === 'processing') {
                            const { error: waErr } = await sendOrderConfirmation(phone, {
                              patientName: addrData?.full_name || 'Customer',
                              orderId,
                              total: '₹' + (order.total || 0).toLocaleString('en-IN'),
                            });
                            if (waErr) console.error('[WhatsApp] order_confirmation failed:', waErr);
                          }

                          // smac_order_tracking — fires for shipped / delivered
                          if (['shipped', 'delivered'].includes(newStatus)) {
                            const { error: waErr } = await sendOrderTracking(phone, {
                              orderId,
                              status:       newStatus,
                              trackingInfo: newStatus === 'shipped'
                                ? 'Your order is on the way!'
                                : 'Order delivered. Thank you!',
                            });
                            if (waErr) console.error('[WhatsApp] order_tracking failed:', waErr);
                          }
                        }}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        {['pending','processing','shipped','delivered','cancelled'].map(s => {
                          const ORDER_RANK = { pending:0, processing:1, shipped:2, delivered:3, cancelled:4 };
                          const cur = ORDER_RANK[order.status];
                          const isBackward = ORDER_RANK[s] < cur;
                          const isCancelLocked = s === 'cancelled' && cur >= ORDER_RANK['processing'];
                          return <option key={s} value={s} disabled={isBackward || isCancelLocked}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1"><User size={10} /> Customer</p>
                      {addr ? (
                        <>
                          <p className="text-sm font-bold text-slate-800">{addr.full_name || '—'}</p>
                          {addr.mobile && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone size={10} /> {addr.mobile}</p>}
                        </>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No customer details</p>
                      )}
                      {order.payment_method && (
                        <p className="text-xs text-slate-500 mt-1">
                          Payment: <span className="font-semibold capitalize">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method.toUpperCase()}</span>
                        </p>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1"><MapPin size={10} /> Delivery Address</p>
                      {addr ? (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {[addr.flat, addr.area, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'No address provided'}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No address provided</p>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1"><Package size={10} /> Items</p>
                      <div className="space-y-1">
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-slate-700 truncate max-w-[130px]">{item.name} <span className="text-slate-400">×{item.qty}</span></span>
                            {item.price > 0 && <span className="font-semibold text-slate-700 shrink-0 ml-2">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>}
                          </div>
                        ))}
                      </div>
                      {order.total > 0 && (
                        <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-xs font-black text-slate-800">
                          <span>Total</span>
                          <span>₹{Number(order.total).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Customer Orders</h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {totalShown} result{totalShown !== 1 ? 's' : ''}
                      {orderSearch || orderFilter !== 'all' ? ` · filtered` : ` of ${orders.length} total`}
                    </p>
                  </div>
                </div>

                {/* Search + Filter + Sort bar */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      placeholder="Search by name, phone, city, product…"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    {orderSearch && (
                      <button onClick={() => setOrderSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Filter by status */}
                  <select
                    value={orderFilter}
                    onChange={e => setOrderFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="all">All Statuses</option>
                    {['pending','processing','shipped','delivered','cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>

                  {/* Sort */}
                  <select
                    value={orderSort}
                    onChange={e => setOrderSort(e.target.value)}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Amount</option>
                    <option value="lowest">Lowest Amount</option>
                  </select>

                  {/* Clear filters */}
                  {(orderSearch || orderFilter !== 'all' || orderSort !== 'newest') && (
                    <button
                      onClick={() => { setOrderSearch(''); setOrderFilter('all'); setOrderSort('newest'); }}
                      className="text-xs text-red-500 font-semibold hover:underline px-2"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {ordersLoading ? (
                  <div className="text-center py-20 text-slate-400 animate-pulse">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No orders yet</p>
                  </div>
                ) : totalShown === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Search size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No orders match your search</p>
                    <button onClick={() => { setOrderSearch(''); setOrderFilter('all'); }} className="text-sm text-emerald-700 font-semibold mt-2 hover:underline">
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Active orders */}
                    {activeOrders.length > 0 && (
                      <div className="space-y-4 mb-8">
                        {activeOrders.map(order => <OrderCard key={order.id} order={order} />)}
                      </div>
                    )}

                    {/* Delivered section */}
                    {deliveredOrders.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 my-6">
                          <div className="flex-1 border-t border-slate-200" />
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                            <CheckCircle size={13} className="text-emerald-600" />
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                              Delivered · {deliveredOrders.length}
                            </span>
                          </div>
                          <div className="flex-1 border-t border-slate-200" />
                        </div>
                        <div className="space-y-4 opacity-75">
                          {deliveredOrders.map(order => <OrderCard key={order.id} order={order} />)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ── MESSAGES ── */}
          {activeTab === 'messages' && (() => {
            const unread = messages.filter(m => !m.is_read).length;
            const filteredMsgs = messages.filter(m => {
              if (!msgSearch.trim()) return true;
              const q = msgSearch.toLowerCase();
              return (
                (m.name    || '').toLowerCase().includes(q) ||
                (m.email   || '').toLowerCase().includes(q) ||
                (m.subject || '').toLowerCase().includes(q) ||
                (m.message || '').toLowerCase().includes(q)
              );
            });

            const handleViewMsg = async (msg) => {
              setSelectedMsg(msg);
              if (!msg.is_read) await markRead(msg.id);
            };

            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Contact Messages</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {messages.length} total · <span className="text-red-500 font-semibold">{unread} unread</span>
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      value={msgSearch}
                      onChange={e => setMsgSearch(e.target.value)}
                      placeholder="Search by name, email, subject or message..."
                      className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    {msgSearch && (
                      <button onClick={() => setMsgSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"><X size={13} /></button>
                    )}
                  </div>
                </div>

                {msgLoading ? (
                  <div className="text-center py-20 text-slate-400 animate-pulse">Loading messages...</div>
                ) : filteredMsgs.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <MessageSquare size={40} className="mx-auto mb-3 opacity-20 text-slate-400" />
                    <p className="text-slate-400 font-medium">{msgSearch ? `No messages matching "${msgSearch}"` : 'No contact messages yet.'}</p>
                  </div>
                ) : (
                  <div className="flex gap-5">
                    {/* Messages list */}
                    <div className={`${selectedMsg ? 'hidden md:block md:flex-1' : 'w-full'}`}>
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500">
                                <th className="px-4 py-3 font-semibold">Sender</th>
                                <th className="px-4 py-3 font-semibold hidden md:table-cell">Subject</th>
                                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Date</th>
                                <th className="px-4 py-3 font-semibold text-center">Status</th>
                                <th className="px-4 py-3 font-semibold text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredMsgs.map(msg => (
                                <tr key={msg.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedMsg?.id === msg.id ? 'bg-emerald-50' : ''} ${!msg.is_read ? 'font-semibold' : ''}`}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      {!msg.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                                      <div>
                                        <p className="text-slate-800">{msg.name}</p>
                                        <p className="text-xs text-slate-400 font-normal">{msg.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal">{msg.subject || 'No subject'}</span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell font-normal">
                                    {new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {msg.is_read
                                      ? <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">Read</span>
                                      : <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Unread</span>
                                    }
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => handleViewMsg(msg)}
                                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all" title="View">
                                        <Eye size={14} />
                                      </button>
                                      <button onClick={() => setMsgDeleteConfirm(msg.id)}
                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Message detail panel */}
                    {selectedMsg && (
                      <div className="w-full md:w-80 shrink-0">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm sticky top-20">
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              <MailOpen size={15} className="text-emerald-600" /> Message Detail
                            </h3>
                            <button onClick={() => setSelectedMsg(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={18} /></button>
                          </div>
                          <div className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                {(selectedMsg.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{selectedMsg.name}</p>
                                <p className="text-xs text-slate-400">{selectedMsg.email}</p>
                                {selectedMsg.phone && <p className="text-xs text-slate-400">{selectedMsg.phone}</p>}
                              </div>
                            </div>
                            {selectedMsg.subject && (
                              <div className="bg-slate-50 rounded-xl px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Subject</p>
                                <p className="text-sm font-semibold text-slate-700">{selectedMsg.subject}</p>
                              </div>
                            )}
                            <div className="bg-emerald-50 rounded-xl px-3 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Message</p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMsg.message}</p>
                            </div>
                            <p className="text-xs text-slate-400">
                              {new Date(selectedMsg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="flex gap-2 pt-1">
                              <a href={`mailto:${selectedMsg.email}`}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 text-white font-semibold py-2 rounded-xl hover:bg-emerald-800 transition-all text-xs">
                                <Mail size={13} /> Reply
                              </a>
                              <button onClick={() => setMsgDeleteConfirm(selectedMsg.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 font-semibold py-2 rounded-xl hover:bg-red-100 transition-all text-xs">
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}


          {/* ── SERVICES ── */}
          {activeTab === 'services' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Manage Services</h1>
                  <p className="text-slate-500 text-sm mt-0.5">{svcList.length} services in catalog</p>
                </div>
                <button onClick={() => setServiceModal('add')}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                  <Plus size={16} /> Add Service
                </button>
              </div>

              {/* Search */}
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input value={svcSearch} onChange={e => setSvcSearch(e.target.value)}
                    placeholder="Search services..."
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                {svcSearch && <button onClick={() => setSvcSearch('')} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Services', value: svcList.length,                                     color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { label: 'Visible',        value: svcList.filter(s => s.is_visible).length,           color: 'bg-blue-50 text-blue-700 border-blue-100' },
                  { label: 'Hidden',         value: svcList.filter(s => !s.is_visible).length,          color: 'bg-slate-50 text-slate-500 border-slate-100' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
                    <p className="text-3xl font-bold">{s.value}</p>
                    <p className="text-xs font-semibold mt-0.5 opacity-70">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Services table */}
              {svcLoading ? (
                <div className="text-center py-16 text-slate-400 animate-pulse">Loading services...</div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <Wrench size={40} className="mx-auto mb-3 opacity-20 text-slate-400" />
                  <p className="text-slate-400 font-medium">{svcSearch ? `No services matching "${svcSearch}"` : 'No services yet. Click "Add Service" to get started.'}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500">
                          <th className="px-4 py-3 font-semibold">Service</th>
                          <th className="px-4 py-3 font-semibold hidden md:table-cell">Hindi Title</th>
                          <th className="px-4 py-3 font-semibold hidden lg:table-cell">Slug</th>
                          <th className="px-4 py-3 font-semibold hidden lg:table-cell text-center">Order</th>
                          <th className="px-4 py-3 font-semibold text-center">Visible</th>
                          <th className="px-4 py-3 font-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredServices.map(s => (
                          <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${!s.is_visible ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{s.title_en}</p>
                              {s.short_description && <p className="text-xs text-slate-400 truncate max-w-[220px]">{s.short_description}</p>}
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                              <span className="text-sm" lang="hi">{s.title_hi || '—'}</span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-xs bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-full">{s.slug || '—'}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{s.display_order ?? '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleToggleServiceVisibility(s)}
                                className={`transition-colors ${s.is_visible ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-300 hover:text-slate-500'}`}
                                title={s.is_visible ? 'Click to hide' : 'Click to show'}>
                                {s.is_visible ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setServiceModal(s)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => setSvcDeleteConfirm(s.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BLOGS ── */}
          {activeTab === 'blogs' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Manage Blogs</h1>
                  <p className="text-slate-500 text-sm mt-0.5">{blogList.length} blogs in system</p>
                </div>
                <button onClick={() => setBlogModal('add')}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                  <Plus size={16} /> Add Blog
                </button>
              </div>

              {/* Search */}
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input value={blogSearch} onChange={e => setBlogSearch(e.target.value)}
                    placeholder="Search blogs by title or slug..."
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                {blogSearch && <button onClick={() => setBlogSearch('')} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Blogs', value: blogList.length,                                   color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { label: 'Visible',     value: blogList.filter(b => b.is_visible).length,         color: 'bg-blue-50 text-blue-700 border-blue-100' },
                  { label: 'Hidden',      value: blogList.filter(b => !b.is_visible).length,        color: 'bg-slate-50 text-slate-500 border-slate-100' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
                    <p className="text-3xl font-bold">{s.value}</p>
                    <p className="text-xs font-semibold mt-0.5 opacity-70">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Blogs table */}
              {blogLoading ? (
                <div className="text-center py-16 text-slate-400 animate-pulse">Loading blogs...</div>
              ) : filteredBlogs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-20 text-slate-400" />
                  <p className="text-slate-400 font-medium">{blogSearch ? `No blogs matching "${blogSearch}"` : 'No blogs yet. Click "Add Blog" to get started.'}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500">
                          <th className="px-4 py-3 font-semibold">Blog</th>
                          <th className="px-4 py-3 font-semibold hidden md:table-cell">Hindi Title</th>
                          <th className="px-4 py-3 font-semibold hidden lg:table-cell">Slug</th>
                          <th className="px-4 py-3 font-semibold hidden lg:table-cell">Date</th>
                          <th className="px-4 py-3 font-semibold text-center">Visible</th>
                          <th className="px-4 py-3 font-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBlogs.map(b => (
                          <tr key={b.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${!b.is_visible ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {b.image_path && (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                    <BlogThumb path={b.image_path} />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-slate-800 truncate max-w-[200px]">{b.title || '—'}</p>
                                  {b.subheading && <p className="text-xs text-slate-400 truncate max-w-[200px]">{b.subheading}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                              <span className="text-sm" lang="hi">{b.title_hi || '—'}</span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-xs bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-full">{b.slug || '—'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                              {b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleToggleBlogVisibility(b)}
                                className={`transition-colors ${b.is_visible ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-300 hover:text-slate-500'}`}
                                title={b.is_visible ? 'Click to hide' : 'Click to show'}>
                                {b.is_visible ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setBlogModal(b)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => setBlogDeleteConfirm(b.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}


        </main>
      </div>

      {/* Product Add/Edit Modal */}
      {productModal && (
        <ProductModal
          initial={productModal === 'add' ? null : productModal}
          onSave={handleSaveProduct}
          onClose={() => setProductModal(null)}
          saving={prodSaving}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Product?</h3>
            <p className="text-slate-500 text-sm mb-6">This will permanently remove the product from the catalog and users won't be able to see it.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDeleteProduct(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Account Modal */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Link Doctor Account</h3>
              <button onClick={() => setLinkModal(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={22} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-1">Linking: <span className="font-bold text-emerald-700">{linkModal.doctorName}</span></p>
            <p className="text-xs text-slate-400 mb-4">Select the login account that belongs to this doctor.</p>
            {linkSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-emerald-700 font-bold">✓ {linkSuccess}</p>
              </div>
            ) : doctorProfiles.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">No doctor-role accounts found.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {doctorProfiles.map(p => (
                  <button key={p.id} onClick={() => handleLinkAccount(p.id)} disabled={linkLoading}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${linkModal.currentUserId === p.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                    <p className="font-semibold text-slate-800 text-sm">{p.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                    {linkModal.currentUserId === p.id && <span className="text-xs text-emerald-600 font-semibold">Currently linked</span>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setLinkModal(null)} className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700 font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {/* Message Delete Confirm Modal */}
      {msgDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Message?</h3>
            <p className="text-slate-500 text-sm mb-6">This will permanently remove the contact message. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setMsgDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDeleteMsg(msgDeleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Doctor Add/Edit Modal */}
      {doctorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Stethoscope size={18} className="text-emerald-600" />
                {doctorModal.mode === 'edit' ? 'Edit Doctor' : 'Add New Doctor'}
              </h3>
              <button onClick={() => setDoctorModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              {[
                { key: 'name',             label: 'Full Name *',          placeholder: 'e.g. Dr. Mridul Sengar' },
                { key: 'specialty',        label: 'Role / Specialty',     placeholder: 'e.g. BAMS & Diagnostic Specialist' },
                { key: 'tag',              label: 'Badge Tag',            placeholder: 'e.g. Founder, BAMS, Herbalist' },
                { key: 'experience',       label: 'Experience',           placeholder: 'e.g. 8+ Years' },
                { key: 'patients_treated', label: 'Patients Treated',     placeholder: 'e.g. 2,000+' },
                { key: 'rating',           label: 'Rating (0–5)',         placeholder: 'e.g. 4.8' },
                { key: 'initials',         label: 'Initials',             placeholder: 'e.g. MS' },
                { key: 'avatar_url',       label: 'Photo URL (optional)', placeholder: 'https://...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input
                    value={doctorForm[key]}
                    onChange={e => setDoctorForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Specialties (comma-separated)</label>
                <input
                  value={doctorForm.specialties}
                  onChange={e => setDoctorForm(f => ({ ...f, specialties: e.target.value }))}
                  placeholder="e.g. Panchakarma Therapy, Skin & Hair Care, Digestive Disorders"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Availability</label>
                <input
                  value={doctorForm.availability}
                  onChange={e => setDoctorForm(f => ({ ...f, availability: e.target.value }))}
                  placeholder="e.g. Mon – Sun, 8:00 AM – 2:00 PM (Physical) | 6:00 PM – 8:00 PM (Online)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bio</label>
                <textarea
                  value={doctorForm.bio}
                  onChange={e => setDoctorForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  placeholder="Short description about the doctor..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Card Gradient Color</label>
                <select
                  value={doctorForm.color}
                  onChange={e => setDoctorForm(f => ({ ...f, color: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="from-emerald-600 to-emerald-800">Emerald (Default)</option>
                  <option value="from-teal-600 to-teal-800">Teal</option>
                  <option value="from-cyan-600 to-cyan-800">Cyan</option>
                  <option value="from-green-600 to-green-800">Green</option>
                  <option value="from-blue-600 to-blue-800">Blue</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <label className="text-xs font-semibold text-slate-600">Active / Visible</label>
                <button type="button" onClick={() => setDoctorForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`transition-colors ${doctorForm.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {doctorForm.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <span className="text-xs text-slate-400">{doctorForm.is_active ? 'Visible on Doctors page' : 'Hidden from Doctors page'}</span>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setDoctorModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDoctorSave} disabled={doctorSaving || !doctorForm.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 disabled:opacity-60">
                {doctorSaving ? 'Saving...' : doctorModal.mode === 'edit' ? 'Save Changes' : 'Add Doctor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Delete Confirm Modal */}
      {doctorDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Doctor?</h3>
            <p className="text-slate-500 text-sm mb-6">This will permanently remove the doctor from the system. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDoctorDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDoctorDelete(doctorDeleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Add/Edit Modal */}
      {serviceModal && (
        <ServiceModal
          initial={serviceModal === 'add' ? null : serviceModal}
          onSave={handleSaveService}
          onClose={() => setServiceModal(null)}
          saving={svcSaving}
        />
      )}

      {/* Service Delete Confirm Modal */}
      {svcDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Service?</h3>
            <p className="text-slate-500 text-sm mb-6">This will permanently remove the service. Visitors will no longer see it. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setSvcDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDeleteService(svcDeleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blog Add/Edit Modal */}
      {blogModal && (
        <BlogModal
          initial={blogModal === 'add' ? null : blogModal}
          onSave={handleSaveBlog}
          onClose={() => setBlogModal(null)}
          saving={blogSaving}
        />
      )}

      {/* Blog Delete Confirm Modal */}
      {blogDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Blog?</h3>
            <p className="text-slate-500 text-sm mb-6">This will permanently remove the blog post and its image. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setBlogDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDeleteBlog(blogDeleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
