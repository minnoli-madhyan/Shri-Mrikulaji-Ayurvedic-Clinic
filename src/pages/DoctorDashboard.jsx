// src/pages/DoctorDashboard.jsx

import React, { useState, useEffect } from 'react';
import { Leaf, Calendar, Clock, CheckCircle, XCircle, Bell, LogOut, Search, Eye, Activity, ChevronLeft, ChevronRight, Lock, X as XIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { sendAppointmentConfirmation } from '../lib/whatsapp';

const statusConfig = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
};

// ── Slot Card ─────────────────────────────────────────────────
// A slot is "blocked" (grey, unclickable) if:
//   - manually blocked via blocked_slots table, OR
//   - has a pending/confirmed appointment (counts as occupied)
// A slot shows the appointment card only if the doctor wants to click through.
const SlotCard = ({ slot, appt, blocked, onClickAppt, onClickEmpty, onUnblock, isManualBlock }) => {
  // Manually blocked slot
  if (isManualBlock) {
    return (
      <div className="p-3 rounded-xl border-2 border-red-200 bg-red-50 text-center">
        <p className="text-xs font-bold text-slate-600 font-mono">{slot}</p>
        <p className="text-[10px] text-red-400 mt-0.5 flex items-center justify-center gap-1"><Lock size={9} /> Blocked</p>
        <button onClick={onUnblock} className="mt-1.5 text-[10px] text-red-500 underline hover:text-red-700 transition-colors">Unblock</button>
      </div>
    );
  }

  // Booked/confirmed appointment — greyed out (same visual weight as blocked)
  if (appt && (appt.status === 'pending' || appt.status === 'confirmed')) {
    const borderColor = appt.status === 'confirmed' ? 'border-blue-300 bg-blue-50' : 'border-amber-300 bg-amber-50';
    const textColor   = appt.status === 'confirmed' ? 'text-blue-600' : 'text-amber-600';
    return (
      <button
        onClick={onClickAppt}
        className={`w-full p-3 rounded-xl border-2 text-left hover:shadow-md transition-all ${borderColor}`}
      >
        <p className="text-xs font-bold text-slate-500 font-mono">{slot}</p>
        <p className="text-[11px] font-semibold text-slate-800 mt-0.5 truncate">{appt.patient_name}</p>
        <span className={`text-[10px] font-bold mt-1 inline-block ${textColor}`}>
          {appt.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
        </span>
      </button>
    );
  }

  // Completed / cancelled appointment — show lightly
  if (appt) {
    const sc = statusConfig[appt.status] || statusConfig.pending;
    return (
      <button onClick={onClickAppt} className="w-full p-3 rounded-xl border-2 border-slate-200 bg-white text-left hover:shadow-md transition-all opacity-60">
        <p className="text-xs font-bold text-slate-500 font-mono">{slot}</p>
        <p className="text-[11px] font-semibold text-slate-800 mt-0.5 truncate">{appt.patient_name}</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${sc.color}`}>{sc.label}</span>
      </button>
    );
  }

  // Free slot
  return (
    <button onClick={onClickEmpty} className="w-full p-3 rounded-xl border-2 border-dashed border-slate-200 bg-white text-center hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
      <p className="text-xs font-bold text-slate-400 font-mono">{slot}</p>
      <p className="text-[10px] text-slate-300 mt-0.5 group-hover:text-emerald-500 transition-colors">Free · block</p>
    </button>
  );
};

const DoctorDashboard = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [doctorRecord, setDoctorRecord] = useState(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const init = async () => {
      setLoading(true);

      let docRow = null;
      const { data: byUserId } = await supabase
        .from('doctors').select('*').eq('user_id', user.id).maybeSingle();

      if (byUserId) {
        docRow = byUserId;
      } else {
        const { data: byEmail } = await supabase
          .from('doctors').select('*').eq('email', user.email).maybeSingle();
        if (byEmail) {
          docRow = byEmail;
          await supabase.from('doctors').update({ user_id: user.id }).eq('id', byEmail.id);
        }
      }

      setDoctorRecord(docRow);

      const nameToSearch = docRow?.name || profile?.full_name || null;
      if (!nameToSearch) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_name', nameToSearch)
        .order('date', { ascending: true });

      if (!error && data) setAppointments(data);
      setLoading(false);
    };

    init();
  }, [user?.id, authLoading]);

  // ── updateStatus: DB update + WA confirmation ─────────────
  const updateStatus = async (id, status) => {
    // Capture appointment from local state BEFORE the DB call
    const appt = appointments.find(a => a.id === id);

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      console.error('[DoctorDashboard] updateStatus DB error:', error.message);
      alert(`Could not update appointment: ${error.message}`);
      return { error };
    }

    if (!data || data.length === 0) {
      const msg = 'Update was blocked. Your account may not have the "doctor" role in Supabase profiles. Please ask your admin to fix it.';
      console.error('[DoctorDashboard] updateStatus RLS block — 0 rows updated');
      alert(msg);
      return { error: new Error(msg) };
    }

    // Update local state
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

    // Send WhatsApp confirmation when status → "confirmed"
    if (status === 'confirmed' && appt?.patient_phone) {
      const { error: waErr } = await sendAppointmentConfirmation(appt.patient_phone, {
        patientName: appt.patient_name,
        doctorName:  appt.doctor_name,
        date:        appt.date,
        time:        appt.time_slot,
        consultType: appt.consult_type,
      });
      if (waErr) console.error('[DoctorDashboard] WA send failed:', waErr);
    }

    return { error: null };
  };

  const doctorName = doctorRecord?.name || profile?.full_name || '';

  const today = (() => {
    const d  = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  })();

  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterDate, setFilterDate]         = useState('');
  const [search, setSearch]                 = useState('');
  const [selectedAppt, setSelectedAppt]     = useState(null);
  const [activeTab, setActiveTab]           = useState('appointments');
  const [notifOpen, setNotifOpen]           = useState(false);
  const [scheduleDate, setScheduleDate]     = useState(today);
  const [blockedSlots, setBlockedSlots]     = useState([]);   // manual blocks only
  const [blockModal, setBlockModal]         = useState(null);
  const [slotDetailAppt, setSlotDetailAppt] = useState(null);

  // Build 15-min slots
  const buildSlots = (startH, startM, endH, endM) => {
    const slots = []; let h = startH, m = startM;
    while (h < endH || (h === endH && m < endM)) {
      const period = h < 12 ? 'AM' : 'PM';
      const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
      slots.push(`${dh}:${m.toString().padStart(2, '0')} ${period}`);
      m += 15; if (m >= 60) { m -= 60; h++; }
    }
    return slots;
  };
  const PHYSICAL_MORNING_SLOTS = buildSlots(8, 0, 14, 0);
  const PHYSICAL_EVENING_SLOTS = buildSlots(16, 0, 18, 0);
  const PHYSICAL_SLOTS         = [...PHYSICAL_MORNING_SLOTS, ...PHYSICAL_EVENING_SLOTS];
  const ONLINE_SLOTS           = buildSlots(18, 0, 20, 0);

  // Fetch MANUAL blocked slots when scheduleDate or doctorName changes
  useEffect(() => {
    const fetchBlocked = async () => {
      if (!doctorName || !scheduleDate) return;
      const { data } = await supabase
        .from('blocked_slots').select('time_slot')
        .eq('doctor_name', doctorName).eq('date', scheduleDate);
      setBlockedSlots(data ? data.map(r => r.time_slot) : []);
    };
    fetchBlocked();
  }, [doctorName, scheduleDate]);

  const handleBlockSlot = async (slot) => {
    const { error } = await supabase.from('blocked_slots').insert([{
      doctor_name: doctorName, date: scheduleDate, time_slot: slot,
    }]);
    if (!error) setBlockedSlots(prev => [...prev, slot]);
    setBlockModal(null);
  };

  const handleUnblockSlot = async (slot) => {
    await supabase.from('blocked_slots').delete()
      .eq('doctor_name', doctorName).eq('date', scheduleDate).eq('time_slot', slot);
    setBlockedSlots(prev => prev.filter(s => s !== slot));
  };

  const shiftScheduleDate = (days) => {
    const [y, m, day] = scheduleDate.split('-').map(Number);
    const d  = new Date(y, m - 1, day + days);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setScheduleDate(`${yy}-${mm}-${dd}`);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const { error } = await updateStatus(id, newStatus);
    if (!error && selectedAppt?.id === id) setSelectedAppt(prev => ({ ...prev, status: newStatus }));
  };

  const filtered = appointments.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchDate   = !filterDate || a.date === filterDate;
    const matchSearch = !search ||
      (a.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.service      || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

  const stats = {
    total:     appointments.length,
    today:     appointments.filter(a => a.date === today).length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  const initials = doctorName
    ? doctorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Nav */}
      <nav className="bg-emerald-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-700 p-1.5 rounded-lg"><Leaf size={20} /></div>
          <div>
            <p className="text-xs text-emerald-300 leading-none">Doctor Portal</p>
            <p className="font-bold text-sm leading-tight">Shree Mrikula Ji Clinic</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-emerald-800 rounded-lg transition-colors">
              <Bell size={20} />
              {stats.pending > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                  {stats.pending}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 z-50">
                <div className="p-4 border-b border-slate-100">
                  <p className="font-bold text-slate-800">Pending Appointments</p>
                </div>
                {appointments.filter(a => a.status === 'pending').slice(0, 5).map(a => (
                  <div key={a.id} className="p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                    <p className="text-sm font-semibold text-slate-800">New: {a.patient_name}</p>
                    <p className="text-xs text-slate-500">{a.service} • {a.date} {a.time_slot}</p>
                  </div>
                ))}
                {stats.pending === 0 && (
                  <div className="p-4 text-sm text-slate-400 text-center">No pending appointments</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-emerald-800 px-3 py-1.5 rounded-lg">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">{initials}</div>
            <div className="hidden md:block">
              <p className="text-xs text-emerald-300 leading-none">Welcome,</p>
              <p className="text-sm font-semibold leading-tight">{doctorName || 'Doctor'}</p>
            </div>
          </div>

          <button onClick={signOut} className="p-2 hover:bg-red-700 rounded-lg transition-colors" title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {loading && (
          <div className="text-center py-20 text-slate-400">
            <p className="animate-pulse text-lg font-medium">Loading your appointments...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Appointments', value: stats.total,     icon: Calendar,    color: 'bg-emerald-600', lightColor: 'bg-emerald-50' },
                { label: "Today's Slots",       value: stats.today,     icon: Clock,       color: 'bg-blue-600',    lightColor: 'bg-blue-50' },
                { label: 'Pending Review',      value: stats.pending,   icon: Activity,    color: 'bg-amber-500',   lightColor: 'bg-amber-50' },
                { label: 'Completed',           value: stats.completed, icon: CheckCircle, color: 'bg-slate-600',   lightColor: 'bg-slate-50' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`${stat.lightColor} rounded-2xl p-5 border border-white shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                      <div className={`${stat.color} text-white p-2 rounded-lg`}><Icon size={16} /></div>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
              {[{ key: 'appointments', label: 'My Appointments' }, { key: 'schedule', label: 'Schedule' }].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${activeTab === tab.key ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-emerald-700'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'appointments' && (
              <div className="flex gap-6">
                {/* Left: List */}
                <div className={`${selectedAppt ? 'hidden md:block md:w-1/2' : 'w-full'} space-y-4`}>
                  {/* Filters */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or service..."
                        className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400" />
                    {(filterStatus !== 'all' || filterDate || search) && (
                      <button onClick={() => { setFilterStatus('all'); setFilterDate(''); setSearch(''); }}
                        className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
                    )}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-slate-500">
                        {appointments.length === 0
                          ? 'No appointments assigned to you yet.'
                          : 'No appointments match your filters.'}
                      </p>
                      {appointments.length === 0 && doctorRecord && (
                        <p className="text-xs text-slate-400 mt-2">
                          Appointments booked with <span className="font-semibold text-emerald-700">{doctorRecord.name}</span> will appear here.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map(appt => {
                        const sc = statusConfig[appt.status] || statusConfig.pending;
                        const patientInitials = (appt.patient_name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <div key={appt.id}
                            onClick={() => setSelectedAppt(appt)}
                            className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer hover:shadow-md transition-all ${selectedAppt?.id === appt.id ? 'border-emerald-500' : 'border-slate-100'}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                  {patientInitials}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{appt.patient_name}</p>
                                  <p className="text-xs text-slate-500">{appt.patient_age}y, {appt.patient_gender} • {appt.service}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                              <span className="flex items-center gap-1"><Calendar size={11} /> {appt.date}</span>
                              <span className="flex items-center gap-1"><Clock size={11} /> {appt.time_slot}</span>
                              {appt.consult_type && <span className="capitalize text-slate-400">{appt.consult_type}</span>}
                            </div>
                            <div className="flex gap-2 mt-3">
                              {appt.status === 'pending' && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'confirmed'); }}
                                    className="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors font-semibold">Confirm</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'cancelled'); }}
                                    className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors font-semibold">Cancel</button>
                                </>
                              )}
                              {appt.status === 'confirmed' && appt.date === today && (
                                <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'completed'); }}
                                  className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors font-semibold">Mark Complete</button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setSelectedAppt(appt); }}
                                className="text-xs text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors font-semibold flex items-center gap-1 ml-auto">
                                <Eye size={11} /> View
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Detail Panel */}
                {selectedAppt && (
                  <div className="w-full md:w-1/2">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm sticky top-24">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Appointment Details</h3>
                        <button onClick={() => setSelectedAppt(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle size={20} /></button>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg">
                            {(selectedAppt.patient_name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{selectedAppt.patient_name}</p>
                            <p className="text-slate-500 text-sm">{selectedAppt.patient_age} years • {selectedAppt.patient_gender}</p>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusConfig[selectedAppt.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                              {statusConfig[selectedAppt.status]?.label || selectedAppt.status}
                            </span>
                          </div>
                        </div>
                        {[
                          { label: 'Service',      value: selectedAppt.service },
                          { label: 'Date',         value: selectedAppt.date },
                          { label: 'Time',         value: selectedAppt.time_slot },
                          { label: 'Phone',        value: selectedAppt.patient_phone },
                          { label: 'Email',        value: selectedAppt.patient_email },
                          { label: 'Consult Type', value: selectedAppt.consult_type },
                        ].filter(r => r.value).map(r => (
                          <div key={r.label} className="flex justify-between py-2.5 border-b border-slate-50">
                            <span className="text-slate-500 text-sm">{r.label}</span>
                            <span className="font-semibold text-slate-800 text-sm capitalize">{r.value}</span>
                          </div>
                        ))}
                        {selectedAppt.notes && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-xs font-bold text-amber-700 mb-1">Patient Notes</p>
                            <p className="text-sm text-amber-900">{selectedAppt.notes}</p>
                          </div>
                        )}
                        <div className="flex gap-3 pt-2">
                          {selectedAppt.status === 'pending' && (
                            <>
                              <button onClick={() => handleUpdateStatus(selectedAppt.id, 'confirmed')}
                                className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-800 transition-all text-sm">Confirm</button>
                              <button onClick={() => handleUpdateStatus(selectedAppt.id, 'cancelled')}
                                className="flex-1 bg-red-100 text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-200 transition-all text-sm">Cancel</button>
                            </>
                          )}
                          {selectedAppt.status === 'confirmed' && selectedAppt.date === today && (
                            <button onClick={() => handleUpdateStatus(selectedAppt.id, 'completed')}
                              className="w-full bg-slate-700 text-white font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-all text-sm">Mark as Completed</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

                {/* Date navigator */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => shiftScheduleDate(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400" />
                    <button onClick={() => shiftScheduleDate(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <ChevronRight size={16} />
                    </button>
                    {scheduleDate !== today && (
                      <button onClick={() => setScheduleDate(today)}
                        className="text-xs text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors font-semibold">
                        Today
                      </button>
                    )}
                  </div>
                  <p className="font-bold text-slate-700 text-sm">
                    {new Date(scheduleDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-5 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300 inline-block" /> Confirmed (blocked)</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-300 inline-block" /> Pending (blocked)</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> Manually blocked</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-dashed border-slate-300 inline-block" /> Free</span>
                </div>

                {/* Physical slots */}
                <div className="mb-8">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Physical · 8:00 AM – 2:00 PM & 4:00 PM – 6:00 PM
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {PHYSICAL_SLOTS.map(slot => {
                      const appt        = appointments.find(a => a.date === scheduleDate && a.time_slot === slot && a.status !== 'cancelled');
                      const isManualBlock = blockedSlots.includes(slot);
                      // A slot is "occupied" (not clickable to block) if manually blocked OR has active appt
                      const isOccupied  = isManualBlock || (appt && (appt.status === 'pending' || appt.status === 'confirmed'));
                      return (
                        <SlotCard key={slot} slot={slot} appt={appt}
                          blocked={isOccupied}
                          isManualBlock={isManualBlock}
                          onClickAppt={() => setSlotDetailAppt(appt)}
                          onClickEmpty={() => !isOccupied && setBlockModal(slot)}
                          onUnblock={() => handleUnblockSlot(slot)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Online slots */}
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Online · 6:00 PM – 8:00 PM
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {ONLINE_SLOTS.map(slot => {
                      const appt          = appointments.find(a => a.date === scheduleDate && a.time_slot === slot && a.status !== 'cancelled');
                      const isManualBlock = blockedSlots.includes(slot);
                      const isOccupied    = isManualBlock || (appt && (appt.status === 'pending' || appt.status === 'confirmed'));
                      return (
                        <SlotCard key={slot} slot={slot} appt={appt}
                          blocked={isOccupied}
                          isManualBlock={isManualBlock}
                          onClickAppt={() => setSlotDetailAppt(appt)}
                          onClickEmpty={() => !isOccupied && setBlockModal(slot)}
                          onUnblock={() => handleUnblockSlot(slot)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Block slot modal */}
            {blockModal && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                  <h3 className="font-bold text-slate-800 text-lg mb-2">Block this slot?</h3>
                  <p className="text-slate-500 text-sm mb-1">
                    <span className="font-semibold text-slate-700">{blockModal}</span> on {new Date(scheduleDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-slate-400 text-xs mb-5">Patients won't be able to book this slot.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setBlockModal(null)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 text-sm">Cancel</button>
                    <button onClick={() => handleBlockSlot(blockModal)} className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 text-sm flex items-center justify-center gap-2">
                      <Lock size={14} /> Block Slot
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Slot detail modal */}
            {slotDetailAppt && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 text-lg">Appointment Details</h3>
                    <button onClick={() => setSlotDetailAppt(null)} className="text-slate-400 hover:text-slate-600"><XIcon size={20} /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                      {(slotDetailAppt.patient_name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{slotDetailAppt.patient_name}</p>
                      <p className="text-sm text-slate-500">{slotDetailAppt.patient_age}y · {slotDetailAppt.patient_gender}</p>
                    </div>
                  </div>
                  {[
                    { label: 'Service', value: slotDetailAppt.service },
                    { label: 'Time',    value: slotDetailAppt.time_slot },
                    { label: 'Type',    value: slotDetailAppt.consult_type },
                    { label: 'Phone',   value: slotDetailAppt.patient_phone },
                    { label: 'Email',   value: slotDetailAppt.patient_email },
                    { label: 'Status',  value: slotDetailAppt.status },
                  ].filter(r => r.value).map(r => (
                    <div key={r.label} className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-400 text-sm">{r.label}</span>
                      <span className="font-semibold text-slate-800 text-sm capitalize">{r.value}</span>
                    </div>
                  ))}
                  {slotDetailAppt.notes && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
                      <p className="text-sm text-amber-900">{slotDetailAppt.notes}</p>
                    </div>
                  )}
                  {/* Allow status change directly from slot detail modal */}
                  {slotDetailAppt.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={async () => {
                        await handleUpdateStatus(slotDetailAppt.id, 'confirmed');
                        setSlotDetailAppt(prev => ({ ...prev, status: 'confirmed' }));
                      }} className="flex-1 bg-emerald-700 text-white font-bold py-2 rounded-xl hover:bg-emerald-800 text-sm">Confirm</button>
                      <button onClick={async () => {
                        await handleUpdateStatus(slotDetailAppt.id, 'cancelled');
                        setSlotDetailAppt(null);
                      }} className="flex-1 bg-red-100 text-red-600 font-bold py-2 rounded-xl hover:bg-red-200 text-sm">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
