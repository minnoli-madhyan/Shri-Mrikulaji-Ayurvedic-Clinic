// src/pages/PatientDashboard.jsx

import React, { useState } from 'react';
import { Leaf, Calendar, Clock, User, Phone, Mail, LogOut, ChevronRight, Plus, Package, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyAppointments } from '../hooks/useAppointments';

const statusConfig = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700',   icon: AlertCircle },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700',     icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700',       icon: XCircle },
};

const PatientDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { appointments, loading }  = useMyAppointments();
  const [activeTab, setActiveTab]  = useState('appointments');

  const upcoming  = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const past      = appointments.filter(a => ['completed', 'cancelled'].includes(a.status));

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Top Nav */}
      <nav className="bg-emerald-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-700 p-1.5 rounded-lg"><Leaf size={18} /></div>
          <div>
            <p className="font-bold text-sm leading-tight">My Dashboard</p>
            <p className="text-emerald-300 text-[10px]">Shree Mrikula Ji Clinic</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-emerald-300 hover:text-white text-xs transition-colors">← Back to site</Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-700 text-white flex items-center justify-center text-2xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800">{profile?.full_name || 'Patient'}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {user?.email  && <p className="text-slate-500 text-xs flex items-center gap-1"><Mail size={11} />{user.email}</p>}
              {profile?.phone && <p className="text-slate-500 text-xs flex items-center gap-1"><Phone size={11} />{profile.phone}</p>}
            </div>
            <span className="inline-block mt-2 text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full capitalize">
              {profile?.role ?? 'patient'}
            </span>
          </div>
          <Link
            to="/appointment"
            className="flex items-center gap-2 bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-800 transition-colors shrink-0"
          >
            <Plus size={15} /> Book Appointment
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Bookings', value: appointments.length, color: 'text-slate-700' },
            { label: 'Upcoming',       value: upcoming.length,     color: 'text-blue-600' },
            { label: 'Completed',      value: past.filter(a => a.status === 'completed').length, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
          {[
            { key: 'appointments', label: 'My Appointments' },
            { key: 'profile',      label: 'My Profile' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === t.key ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Appointments tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Leaf className="text-emerald-300 animate-pulse mx-auto mb-3" size={32} />
                <p className="text-slate-400 text-sm">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Calendar className="text-slate-200 mx-auto mb-4" size={48} />
                <p className="text-slate-600 font-semibold mb-1">No appointments yet</p>
                <p className="text-slate-400 text-sm mb-5">Book your first consultation with our Ayurvedic doctors.</p>
                <Link
                  to="/appointment"
                  className="inline-flex items-center gap-2 bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={15} /> Book Now
                </Link>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Upcoming</h2>
                    <div className="space-y-3">
                      {upcoming.map(appt => <AppointmentCard key={appt.id} appt={appt} />)}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Past</h2>
                    <div className="space-y-3">
                      {past.map(appt => <AppointmentCard key={appt.id} appt={appt} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800 mb-2">Account Details</h2>
            {[
              { label: 'Full Name', value: profile?.full_name, icon: User },
              { label: 'Email',     value: user?.email,        icon: Mail },
              { label: 'Phone',     value: profile?.phone || '—', icon: Phone },
              { label: 'Role',      value: profile?.role,      icon: FileText },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <row.icon size={14} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{row.label}</p>
                  <p className="text-sm font-semibold text-slate-700 capitalize">{row.value || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

const AppointmentCard = ({ appt }) => {
  const cfg = statusConfig[appt.status] ?? statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <Calendar size={18} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-bold text-slate-800 text-sm">{appt.doctor_name}</p>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
            <Icon size={10} /> {cfg.label}
          </span>
        </div>
        <p className="text-slate-500 text-xs mt-0.5">{appt.service || 'General Consultation'}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Calendar size={11} /> {appt.date}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {appt.time_slot}</span>
          <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-full">{appt.consult_type}</span>
        </div>
        {appt.notes && <p className="text-xs text-slate-400 mt-1.5 italic">"{appt.notes}"</p>}
      </div>
    </div>
  );
};

export default PatientDashboard;
