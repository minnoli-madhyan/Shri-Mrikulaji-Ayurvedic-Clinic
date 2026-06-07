// src/pages/History.jsx
// IMPROVED VERSION:
//  - Real data from Supabase via useMyAppointments() and useOrders()
//  - Beautiful redesigned UI matching the site's emerald/ayurvedic theme
//  - Proper cancel appointment (if >12h before) saved to DB
//  - Cancel order (if Processing) saved to DB
//  - Search across both tabs
//  - Stats row at top
//  - Login gate for unauthenticated users
//  - Framer Motion animations preserved

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Calendar, Clock, Package, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Loader2, Plus, Leaf,
  ShoppingBag, ArrowRight, Ban
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyAppointments } from '../hooks/useAppointments';
import { useMyOrders } from '../hooks/useProducts';
import { supabase } from '../lib/supabase';

// ── Status configs ────────────────────────────────────────────
const apptStatus = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-700',   icon: AlertCircle },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100',    text: 'text-blue-700',    icon: CheckCircle },
  completed: { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',     text: 'text-red-700',     icon: XCircle },
};

const orderStatus = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-700' },
  processing: { label: 'Processing', bg: 'bg-blue-100',  text: 'text-blue-700' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',     text: 'text-red-700' },
};

// ── Can cancel appointment? (>12h before slot) ────────────────
const canCancelAppt = (appt) => {
  if (!['pending', 'confirmed'].includes(appt.status)) return false;
  if (!appt.date || !appt.time_slot) return false;
  try {
    const dt = new Date(`${appt.date}T${convertTo24h(appt.time_slot)}`);
    return (dt - new Date()) / 36e5 >= 12;
  } catch { return true; }
};

const convertTo24h = (slot) => {
  if (!slot) return '00:00';
  const m = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return '00:00';
  let h = parseInt(m[1]);
  const min = m[2];
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2,'0')}:${min}`;
};

// ── Card variants ─────────────────────────────────────────────
const cardVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' } }),
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// ── Appointment Card ──────────────────────────────────────────
const AppointmentCard = ({ appt, index, onCancel }) => {
  const cfg = apptStatus[appt.status] ?? apptStatus.pending;
  const Icon = cfg.icon;
  const cancellable = canCancelAppt(appt);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(appt.id);
    setCancelling(false);
  };

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${appt.consult_type === 'online' ? 'bg-blue-400' : 'bg-emerald-500'}`} />

      <div className="p-5 flex items-start gap-4">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${appt.consult_type === 'online' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
          <Calendar size={20} className={appt.consult_type === 'online' ? 'text-blue-500' : 'text-emerald-600'} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">{appt.doctor_name || 'Doctor'}</p>
              <p className="text-slate-500 text-xs mt-0.5">{appt.service || 'General Consultation'}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
              <Icon size={11} strokeWidth={2.5} />
              {cfg.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar size={11} className="text-slate-300" /> {appt.date}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock size={11} className="text-slate-300" /> {appt.time_slot}
            </span>
            {appt.consult_type && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${appt.consult_type === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {appt.consult_type}
              </span>
            )}
          </div>

          {appt.notes && (
            <p className="text-xs text-slate-400 mt-2 italic leading-relaxed line-clamp-2">"{appt.notes}"</p>
          )}

          {cancellable && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
              {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Order Card ────────────────────────────────────────────────
const OrderCard = ({ order, index, onCancel }) => {
  const cfg = orderStatus[order.status] ?? orderStatus.pending;
  const cancellable = order.status === 'processing' || order.status === 'pending';
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(order.id);
    setCancelling(false);
  };

  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const itemNames = Array.isArray(order.items)
    ? order.items.map(i => i.name).join(', ')
    : 'Products';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full bg-olive/40" />

      <div className="p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <Package size={20} className="text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">
                {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''}` : 'Order'}
              </p>
              <p className="text-slate-400 text-[10px] font-mono mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{itemNames}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar size={11} className="text-slate-300" />
              {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—'}
            </span>
            {order.total && (
              <span className="text-xs font-bold text-slate-700">
                ₹{order.total}
              </span>
            )}
          </div>

          {/* Item list */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {order.items.map((item, i) => (
                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                  {item.name} ×{item.qty}
                </span>
              ))}
            </div>
          )}

          {cancellable && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Empty state ───────────────────────────────────────────────
const Empty = ({ tab }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200"
  >
    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      {tab === 'appointments'
        ? <Calendar size={28} className="text-slate-300" />
        : <ShoppingBag size={28} className="text-slate-300" />
      }
    </div>
    <p className="text-slate-600 font-semibold mb-1">
      {tab === 'appointments' ? 'No appointments yet' : 'No orders yet'}
    </p>
    <p className="text-slate-400 text-sm mb-5">
      {tab === 'appointments'
        ? 'Book a consultation with our Ayurvedic doctors.'
        : 'Browse our Ayurvedic product catalog.'}
    </p>
    <Link
      to={tab === 'appointments' ? '/appointment' : '/products'}
      className="inline-flex items-center gap-2 bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-800 transition-colors"
    >
      {tab === 'appointments' ? <><Plus size={15} /> Book Now</> : <><ShoppingBag size={15} /> Shop Now</>}
    </Link>
  </motion.div>
);

// ── Main ──────────────────────────────────────────────────────
export default function HistoryPage() {
  const { user, profile } = useAuth();
  const { appointments, loading: apptLoading, cancelAppointment } = useMyAppointments();
  const { orders, loading: orderLoading, cancelOrder } = useMyOrders();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('appointments');

  // Cancel appointment → update in Supabase
  const handleCancelAppt = async (id) => {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select();

    if (!error && data && data.length > 0) {
      if (cancelAppointment) cancelAppointment(id);
    } else {
      console.error('Cancel appointment failed:', error?.message ?? 'No rows updated — check RLS policy');
      alert('Could not cancel appointment. Please try again or contact support.');
    }
  };

  // Cancel order → update in Supabase
  const handleCancelOrder = async (id) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select();

    if (!error && data && data.length > 0) {
      if (cancelOrder) cancelOrder(id);
    } else {
      console.error('Cancel order failed:', error?.message ?? 'No rows updated — check RLS policy');
      alert('Could not cancel order. Please try again or contact support.');
    }
  };

  // Filter
  const filteredAppts = useMemo(() =>
    appointments.filter(a =>
      [a.doctor_name, a.service, a.date, a.status]
        .join(' ').toLowerCase().includes(search.toLowerCase())
    ),
  [appointments, search]);

  const filteredOrders = useMemo(() =>
    orders.filter(o => {
      const names = Array.isArray(o.items) ? o.items.map(i => i.name).join(' ') : '';
      return [names, o.status, o.created_at].join(' ').toLowerCase().includes(search.toLowerCase());
    }),
  [orders, search]);

  const stats = {
    upcomingAppts: appointments.filter(a => ['pending','confirmed'].includes(a.status)).length,
    completedAppts: appointments.filter(a => a.status === 'completed').length,
    totalOrders: orders.length,
  };

  const loading = apptLoading || orderLoading;

  // ── Not logged in ──────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Leaf size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Sign In to View History</h2>
          <p className="text-slate-500 mb-6">Your appointment history and orders are tied to your account.</p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-800 transition-colors"
          >
            Login / Register <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8f5]">

      {/* ── Hero Header ── */}
      <div className="bg-emerald-900 pt-28 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-emerald-400 text-sm font-semibold tracking-wider uppercase mb-1">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Patient'}
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
              Your History
            </h1>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Upcoming',  value: stats.upcomingAppts,  icon: Calendar },
                { label: 'Completed', value: stats.completedAppts, icon: CheckCircle },
                { label: 'Orders',    value: stats.totalOrders,    icon: Package },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
                    <Icon size={18} className="text-emerald-300 mx-auto mb-1.5" />
                    <p className="text-2xl font-black text-white">{s.value}</p>
                    <p className="text-emerald-400 text-[11px] font-semibold mt-0.5">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Search ── */}
        <div className="relative max-w-xl mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by doctor, product, date, status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'appointments', label: 'Appointments', count: filteredAppts.length },
            { key: 'orders',       label: 'Purchases',    count: filteredOrders.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.key
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              {t.label}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}

          {/* Book new appointment CTA */}
          <Link
            to="/appointment"
            className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <Plus size={15} /> Book
          </Link>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <p className="text-sm">Loading your history...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'appointments' && (
              <motion.div key="appointments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filteredAppts.length === 0 ? (
                  search
                    ? <p className="text-center text-slate-400 py-16">No appointments matching "{search}"</p>
                    : <Empty tab="appointments" />
                ) : (
                  <>
                    {/* Upcoming group */}
                    {filteredAppts.filter(a => ['pending','confirmed'].includes(a.status)).length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                          Upcoming
                        </h2>
                        <div className="space-y-3">
                          <AnimatePresence>
                            {filteredAppts.filter(a => ['pending','confirmed'].includes(a.status)).map((appt, i) => (
                              <AppointmentCard
                                key={appt.id} appt={appt} index={i}
                                onCancel={handleCancelAppt}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    {/* Past group */}
                    {filteredAppts.filter(a => ['completed','cancelled'].includes(a.status)).length > 0 && (
                      <div>
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                          Past
                        </h2>
                        <div className="space-y-3">
                          <AnimatePresence>
                            {filteredAppts.filter(a => ['completed','cancelled'].includes(a.status)).map((appt, i) => (
                              <AppointmentCard
                                key={appt.id} appt={appt} index={i}
                                onCancel={handleCancelAppt}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {tab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filteredOrders.length === 0 ? (
                  search
                    ? <p className="text-center text-slate-400 py-16">No orders matching "{search}"</p>
                    : <Empty tab="orders" />
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredOrders.map((order, i) => (
                        <OrderCard
                          key={order.id} order={order} index={i}
                          onCancel={handleCancelOrder}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
