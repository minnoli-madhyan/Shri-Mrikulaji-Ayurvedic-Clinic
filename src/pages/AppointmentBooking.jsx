// src/pages/AppointmentBooking.jsx
// Bilingual (English + Hindi) implementation using react-i18next
// All static strings replaced with t("key") — booking logic unchanged

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Calendar, Clock, User, Phone, Mail,
  ChevronRight, CheckCircle, ArrowLeft, AlertCircle,
  MapPin, Video, Lock,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '../hooks/useGSAP';
import { useAuth } from '../context/AuthContext';
import { useBookAppointment } from '../hooks/useAppointments';
import { useDoctors } from '../hooks/useDoctors';
import AuthModal from '../components/AuthModal';
import { supabase } from '../lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Language-aware doctor name helper
   The doctor name stored in form.doctor and the DB is always
   the English name (used for URL params and DB queries).
   For display-only purposes we derive the Hindi name from the
   doctors list when the language is 'hi'.
────────────────────────────────────────────────────────────── */
const useDisplayDoctorName = (englishName, doctors) => {
  const { i18n } = useTranslation();
  if (!englishName || !doctors?.length) return englishName;
  if (i18n.language !== 'hi') return englishName;
  const doc = doctors.find(d => d.name === englishName);
  return (doc?.name_hi) || englishName;
};

/* ─────────────────────────────────────────────────────────────
   Slot helpers — unchanged from original
────────────────────────────────────────────────────────────── */
const buildSlots = (startH, startM, endH, endM) => {
  const slots = [];
  let h = startH, m = startM;
  while (h < endH || (h === endH && m < endM)) {
    const period  = h < 12 ? 'AM' : 'PM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const displayM = m.toString().padStart(2, '0');
    slots.push(`${displayH}:${displayM} ${period}`);
    m += 15;
    if (m >= 60) { m -= 60; h += 1; }
  }
  return slots;
};

const PHYSICAL_MORNING_SLOTS = buildSlots(8, 0, 14, 0);
const PHYSICAL_EVENING_SLOTS = buildSlots(16, 0, 18, 0);
const PHYSICAL_SLOTS         = [...PHYSICAL_MORNING_SLOTS, ...PHYSICAL_EVENING_SLOTS];
const ONLINE_SLOTS           = buildSlots(18, 0, 20, 0);

const generateDates = () => {
  const dates = []; const today = new Date();
  for (let i = 1; i <= 20; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    dates.push({
      value:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      day:     d.getDate(),
      month:   d.toLocaleDateString('en-IN', { month: 'short' }),
    });
  }
  return dates.slice(0, 9);
};

/* ─────────────────────────────────────────────────────────────
   Validation — returns translated error messages
────────────────────────────────────────────────────────────── */
const makeValidateField = (t) => (key, value) => {
  switch (key) {
    case 'name':
      return !value.trim()                          ? t('appointmentPage.validation.nameRequired')
           : value.trim().length < 3               ? t('appointmentPage.validation.nameMinLength')
           : !/^[a-zA-Z\s.]+$/.test(value)         ? t('appointmentPage.validation.nameLettersOnly')
           : '';
    case 'phone':
      return !value.trim()                          ? t('appointmentPage.validation.phoneRequired')
           : !/^[6-9]\d{9}$/.test(value.replace(/[\s\-+]/g, ''))
                                                    ? t('appointmentPage.validation.phoneInvalid')
           : '';
    case 'email':
      return !value.trim()                          ? t('appointmentPage.validation.emailRequired')
           : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                                                    ? t('appointmentPage.validation.emailInvalid')
           : '';
    case 'age': {
      const a = parseInt(value, 10);
      return !value          ? t('appointmentPage.validation.ageRequired')
           : isNaN(a) || a < 1 ? t('appointmentPage.validation.ageMin')
           : a > 120          ? t('appointmentPage.validation.ageMax')
           : '';
    }
    case 'notes':
      return !value.trim()             ? t('appointmentPage.validation.notesRequired')
           : value.trim().length < 5  ? t('appointmentPage.validation.notesTooShort')
           : '';
    default: return '';
  }
};

/* ─────────────────────────────────────────────────────────────
   SlotGrid — unchanged layout, translated tooltip
────────────────────────────────────────────────────────────── */
const SlotGrid = ({ slots, selected, onSelect, bookedSlots = [], bookedLabel }) => (
  <div
    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
    aria-label="time-slot-grid"
  >
    {slots.map(slot => {
      const sel    = selected === slot;
      const booked = bookedSlots.includes(slot);
      return (
        <button
          key={slot}
          type="button"
          disabled={booked}
          onClick={() => !booked && onSelect(slot)}
          title={booked ? bookedLabel : slot}
          aria-pressed={sel}
          aria-disabled={booked}
          className={`py-2 px-1 rounded-xl border-2 text-xs font-semibold transition-all text-center relative ${
            booked
              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
              : sel
              ? 'border-emerald-600 bg-emerald-700 text-white shadow-md'
              : 'border-emerald-100 bg-white text-emerald-900 hover:border-emerald-400'
          }`}
        >
          {slot}
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   AppointmentBooking
────────────────────────────────────────────────────────────── */
const AppointmentBooking = () => {
  const { t }                  = useTranslation();
  const validateField          = makeValidateField(t);

  const [searchParams]         = useSearchParams();
  const prefillDoctor          = searchParams.get('doctor') || '';

  const { user, profile }      = useAuth();
  const { book, loading: bookingLoading, error: bookingError } = useBookAppointment();
  const { doctors }            = useDoctors();

  const [step, setStep]        = useState(1);
  const [consultType, setConsultType] = useState('');
  const [form, setForm]        = useState({
    date: '', slot: '', name: '', phone: '', email: '',
    age: '', gender: '', doctor: prefillDoctor, notes: '',
  });
  const [errors, setErrors]        = useState({});
  const [submitted, setSubmitted]  = useState(false);
  const [authOpen, setAuthOpen]    = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [prefillDismissed, setPrefillDismissed] = useState(false);

  // Step labels derived from translations
  const STEPS = [
    t('appointmentPage.steps.step1'),
    t('appointmentPage.steps.step2'),
    t('appointmentPage.steps.step3'),
  ];

  // Display name for prefilled doctor (Hindi-aware)
  const displayPrefillName = useDisplayDoctorName(
    prefillDoctor ? decodeURIComponent(prefillDoctor) : '',
    doctors,
  );

  // Prefill form from logged-in user
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        email: f.email || user.email      || '',
        phone: f.phone || profile?.phone  || '',
      }));
    }
  }, [user, profile]);

  // Fetch booked slots
  useEffect(() => {
    const fetchBooked = async () => {
      if (!form.date || !form.doctor) { setBookedSlots([]); return; }
      const [
        { data: apptData,    error: apptError    },
        { data: blockedData, error: blockedError },
      ] = await Promise.all([
        supabase.from('appointments').select('time_slot')
          .eq('date', form.date).eq('doctor_name', form.doctor)
          .in('status', ['pending', 'confirmed']),
        supabase.from('blocked_slots').select('time_slot')
          .eq('date', form.date).eq('doctor_name', form.doctor),
      ]);
      if (apptError || blockedError) {
        console.error('Fetch error:', apptError || blockedError);
      }
      const booked  = apptData    ? apptData.map(r => r.time_slot)    : [];
      const blocked = blockedData ? blockedData.map(r => r.time_slot) : [];
      const allSlots = [...booked, ...blocked];
      const filteredSlots = allSlots.filter(slot => {
        if (consultType === 'physical') return PHYSICAL_SLOTS.includes(slot);
        if (consultType === 'online')   return ONLINE_SLOTS.includes(slot);
        return false;
      });
      setBookedSlots(filteredSlots);
    };
    fetchBooked();
  }, [form.date, form.doctor, consultType]);

  const initialDates  = useMemo(() => generateDates(), []);
  const displayDates  = useMemo(() => {
    if (!form.date) return initialDates;
    const isAlreadyInList = initialDates.some(d => d.value === form.date);
    if (isAlreadyInList) return initialDates;
    const d = new Date(form.date);
    const customDate = {
      value:   form.date,
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      day:     d.getDate(),
      month:   d.toLocaleDateString('en-IN', { month: 'short' }),
    };
    const newDates = [...initialDates];
    newDates[newDates.length - 1] = customDate;
    return newDates;
  }, [form.date, initialDates]);

  const heroRef      = useRef(null);
  const stepsRef     = useRef(null);
  const contentRef   = useRef(null);
  const btnRef       = useRef(null);
  const dateInputRef = useRef(null);

  useGSAP((gsap) => {
    if (!heroRef.current) return;
    gsap.fromTo(heroRef.current.querySelectorAll('.appt-hero-el'),
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.18, duration: 0.7, ease: 'power3.out', delay: 0.2 }
    );
  }, []);
  useGSAP((gsap) => {
    if (!stepsRef.current) return;
    gsap.fromTo(stepsRef.current.querySelectorAll('.step-pill'),
      { y: -8, opacity: 0.4 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.35, ease: 'power2.out' }
    );
  }, [step]);
  useGSAP((gsap) => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
  }, [step]);
  useGSAP((gsap) => {
    if (!btnRef.current) return;
    gsap.fromTo(btnRef.current, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' });
  }, [step]);

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const handleConsultType = (type) => {
    setConsultType(type);
    update('slot', '');
  };

  const canStep1 = form.date && form.slot && consultType && form.doctor;

  const validateStep2 = () => {
    const e = {};
    ['name', 'phone', 'email', 'age', 'notes'].forEach(k => {
      const err = validateField(k, form[k]); if (err) e[k] = err;
    });
    if (!form.gender) e.gender = t('appointmentPage.validation.genderRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !canStep1) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleConfirm = async () => {
    if (!user) { setAuthOpen(true); return; }
    const result = await book({ ...form, consultType });
    if (!result.error) setSubmitted(true);
  };

  const resetForm = () => {
    setSubmitted(false);
    setStep(1);
    setConsultType('');
    setForm({ date: '', slot: '', name: '', phone: '', email: '', age: '', gender: '', doctor: prefillDoctor, notes: '' });
    setErrors({});
  };

  // ── Gender options (translated) ──
  const genderOptions = [
    { key: 'male',   label: t('appointmentPage.step2.genderOptions.male')   },
    { key: 'female', label: t('appointmentPage.step2.genderOptions.female') },
    { key: 'other',  label: t('appointmentPage.step2.genderOptions.other')  },
  ];
  // We store the English key in form.gender for DB consistency
  // but display translated label in UI
  const genderDisplayLabel = (storedVal) => {
    const match = genderOptions.find(g => g.key === storedVal?.toLowerCase());
    return match ? match.label : storedVal;
  };

  /* ── Success Screen ── */
  if (submitted) {
    return (
      <div className="page-container">
        <div
          className="min-h-[80vh] flex items-center justify-center px-4 py-24"
          aria-label={t('appointmentPage.aria.successRegion')}
        >
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center border border-emerald-100">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-600" size={44} />
            </div>
            <h2 className="text-3xl font-bold text-emerald-900 mb-2">
              {t('appointmentPage.success.heading')}
            </h2>
            <p className="text-slate-500 mb-8">
              {t('appointmentPage.success.subtext')}
            </p>
            <div className="bg-emerald-50 rounded-2xl p-5 text-left space-y-3 mb-8 border border-emerald-100">
              {[
                { label: t('appointmentPage.success.summary.patient'), value: form.name },
                {
                  label: t('appointmentPage.success.summary.type'),
                  value: consultType === 'physical'
                    ? t('appointmentPage.success.summary.physical')
                    : t('appointmentPage.success.summary.online'),
                },
                { label: t('appointmentPage.success.summary.date'),  value: form.date  },
                { label: t('appointmentPage.success.summary.time'),  value: form.slot  },
                { label: t('appointmentPage.success.summary.phone'), value: form.phone },
                { label: t('appointmentPage.success.summary.email'), value: form.email },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-semibold text-emerald-900">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 border-2 border-emerald-700 text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-all"
              >
                {t('appointmentPage.success.bookAnother')}
              </button>
              <Link
                to={
                  profile?.role === 'admin'  ? '/admin-dashboard'  :
                  profile?.role === 'doctor' ? '/doctor-dashboard' :
                  '/history'
                }
                className="flex-1 bg-emerald-700 text-white font-bold py-3 rounded-xl hover:bg-emerald-800 transition-all text-center flex items-center justify-center"
              >
                {profile?.role === 'patient' || !profile?.role
                  ? t('appointmentPage.success.viewBookings')
                  : t('appointmentPage.success.dashboard')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Booking Flow ── */
  return (
    <div className="page-container">

      {/* Hero */}
      <header
        ref={heroRef}
        className="relative pt-28 pb-12 bg-emerald-900 text-white overflow-hidden"
        aria-label={t('appointmentPage.aria.heroRegion')}
      >
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-300 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="appt-hero-el inline-flex items-center gap-2 bg-emerald-800/60 text-emerald-200 px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ opacity: 0 }}>
            <Calendar size={14} /> {t('appointmentPage.hero.badge')}
          </div>
          <h1 className="appt-hero-el text-4xl md:text-5xl font-serif font-bold mb-3" style={{ opacity: 0 }}>
            {t('appointmentPage.hero.title')}
          </h1>
          <p className="appt-hero-el text-emerald-200 text-lg" style={{ opacity: 0 }}>
            {t('appointmentPage.hero.subtitle')}
          </p>
          {/* Guest login prompt */}
          {!user && (
            <div className="appt-hero-el mt-4 inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 text-amber-200 px-4 py-2 rounded-full text-sm" style={{ opacity: 0 }}>
              <Lock size={14} />
              <span>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="font-bold underline underline-offset-2 hover:text-white transition-colors"
                  aria-label={t('appointmentPage.hero.loginLink')}
                >
                  {t('appointmentPage.hero.loginLink')}
                </button>
                {' '}{t('appointmentPage.hero.loginRequired')}
              </span>
            </div>
          )}
          {prefillDoctor && !prefillDismissed && (
            <div className="appt-hero-el mt-4 inline-block bg-emerald-800/60 border border-emerald-600 px-4 py-2 rounded-full text-emerald-200 text-sm" style={{ opacity: 0 }}>
              👨‍⚕️ {t('appointmentPage.hero.prefillLabel')} <strong>{displayPrefillName}</strong>
            </div>
          )}
        </div>
      </header>

      {/* Steps Bar */}
      <div
        className="bg-white border-b border-emerald-100 sticky top-16 z-40"
        aria-label={t('appointmentPage.aria.stepsBar')}
      >
        <div ref={stepsRef} className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2 overflow-x-auto">
          {STEPS.map((label, i) => {
            const s = i + 1; const active = s === step; const done = s < step;
            return (
              <React.Fragment key={s}>
                <div className={`step-pill flex items-center gap-2 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  active ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-200'
                  : done  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-400'
                }`}>
                  {done
                    ? <CheckCircle size={14} />
                    : <span className="w-4 h-4 rounded-full border-2 inline-flex items-center justify-center text-xs">{s}</span>
                  }
                  {label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div ref={contentRef} style={{ opacity: 0 }}>

          {/* ═══════════════ STEP 1 ═══════════════ */}
          {step === 1 && (
            <div
              className="space-y-10"
              aria-label={t('appointmentPage.aria.step1Region')}
            >
              <div>
                <h2 className="text-2xl font-bold text-emerald-900 mb-1">
                  {t('appointmentPage.step1.heading')}
                </h2>
                <p className="text-slate-500">{t('appointmentPage.step1.subtext')}</p>
              </div>

              {/* Doctor Selection */}
              <div aria-label={t('appointmentPage.aria.doctorGrid')}>
                <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <User size={16} /> {t('appointmentPage.step1.doctorLabel')}{' '}
                  <span className="text-red-400 text-xs font-normal ml-1">
                    {t('appointmentPage.step1.required')}
                  </span>
                </h3>
                {(!prefillDoctor || prefillDismissed) ? (
                  doctors.length === 0 ? (
                    <div className="text-slate-400 text-sm bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                      {t('appointmentPage.step1.loadingDoctors')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {doctors.map(doc => {
                        const selected = form.doctor === doc.name;
                        // Display name in current language
                        const { i18n } = { i18n: { language: 'en' } }; // placeholder — real one below
                        return (
                          <DoctorOption
                            key={doc.id}
                            doc={doc}
                            selected={selected}
                            onSelect={() => { update('doctor', doc.name); update('slot', ''); }}
                          />
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                      {form.doctor.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900 text-sm">{displayPrefillName}</p>
                      <p className="text-xs text-emerald-600">
                        {t('appointmentPage.step1.preselectedFrom')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { update('doctor', ''); update('slot', ''); setPrefillDismissed(true); }}
                      className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      {t('appointmentPage.step1.changeDoctor')}
                    </button>
                  </div>
                )}
                {!form.doctor && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle size={11} /> {t('appointmentPage.step1.selectDoctorPrompt')}
                  </p>
                )}
              </div>

              {/* Date Selection */}
              {form.doctor && (
                <div aria-label={t('appointmentPage.aria.dateGrid')}>
                  <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                    <Calendar size={16} /> {t('appointmentPage.step1.dateLabel')}
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {displayDates.map(d => {
                      const sel = form.date === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => { update('date', d.value); update('slot', ''); }}
                          aria-pressed={sel}
                          className={`flex flex-col items-center px-4 py-3 rounded-xl border-2 min-w-[72px] transition-all ${
                            sel
                              ? 'border-emerald-600 bg-emerald-700 text-white shadow-lg'
                              : 'border-emerald-100 bg-white text-emerald-900 hover:border-emerald-400'
                          }`}
                        >
                          <span className="text-xs font-semibold opacity-70">{d.dayName}</span>
                          <span className="text-xl font-bold">{d.day}</span>
                          <span className="text-xs opacity-70">{d.month}</span>
                        </button>
                      );
                    })}
                    {/* "More dates" picker */}
                    <div className="relative min-w-[72px]">
                      <button
                        type="button"
                        onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center px-4 py-3 rounded-xl border-2 border-dashed border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500 transition-all"
                      >
                        <Calendar size={18} />
                        <span className="text-xs mt-1 font-semibold">{t('appointmentPage.step1.more')}</span>
                      </button>
                      <input
                        type="date"
                        ref={dateInputRef}
                        min={(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; })()}
                        onChange={(e) => { update('date', e.target.value); update('slot', ''); }}
                        className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Consultation Type */}
              {form.doctor && form.date && (
                <div aria-label={t('appointmentPage.aria.consultTypeGrid')}>
                  <h3 className="font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                    <Clock size={16} /> {t('appointmentPage.step1.consultTypeLabel')}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Physical */}
                    <button
                      type="button"
                      onClick={() => handleConsultType('physical')}
                      aria-pressed={consultType === 'physical'}
                      className={`rounded-2xl border-2 p-5 text-left transition-all ${
                        consultType === 'physical'
                          ? 'border-emerald-600 bg-emerald-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          consultType === 'physical' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-900">
                            {t('appointmentPage.step1.physical.title')}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t('appointmentPage.step1.physical.subtitle')}
                          </p>
                        </div>
                        {consultType === 'physical' && <CheckCircle size={18} className="text-emerald-600 ml-auto" />}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                          {t('appointmentPage.step1.physical.days')}
                        </span>
                        <span className="text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                          {t('appointmentPage.step1.physical.hours')}
                        </span>
                        <span className="text-[11px] bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-full">
                          {t('appointmentPage.step1.physical.slots')}
                        </span>
                      </div>
                    </button>

                    {/* Online */}
                    <button
                      type="button"
                      onClick={() => handleConsultType('online')}
                      aria-pressed={consultType === 'online'}
                      className={`rounded-2xl border-2 p-5 text-left transition-all ${
                        consultType === 'online'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          consultType === 'online' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Video size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {t('appointmentPage.step1.online.title')}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t('appointmentPage.step1.online.subtitle')}
                          </p>
                        </div>
                        {consultType === 'online' && <CheckCircle size={18} className="text-blue-500 ml-auto" />}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[11px] bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
                          {t('appointmentPage.step1.online.days')}
                        </span>
                        <span className="text-[11px] bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
                          {t('appointmentPage.step1.online.hours')}
                        </span>
                        <span className="text-[11px] bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-full">
                          {t('appointmentPage.step1.online.slots')}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Physical Slots */}
              {form.doctor && form.date && consultType === 'physical' && (
                <div aria-label={t('appointmentPage.aria.slotGrid')}>
                  <h3 className="font-semibold text-emerald-800 mb-1 flex items-center gap-2">
                    <MapPin size={15} className="text-emerald-600" />
                    {t('appointmentPage.step1.physicalSlots.heading')}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    {t('appointmentPage.step1.physicalSlots.subtext')}
                  </p>
                  <SlotGrid
                    slots={PHYSICAL_SLOTS}
                    selected={form.slot}
                    onSelect={v => update('slot', v)}
                    bookedSlots={bookedSlots}
                    bookedLabel={t('appointmentPage.step1.slotBooked')}
                  />
                </div>
              )}

              {/* Online Slots */}
              {form.doctor && form.date && consultType === 'online' && (
                <div aria-label={t('appointmentPage.aria.slotGrid')}>
                  <h3 className="font-semibold text-blue-700 mb-1 flex items-center gap-2">
                    <Video size={15} className="text-blue-600" />
                    {t('appointmentPage.step1.onlineSlots.heading')}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    {t('appointmentPage.step1.onlineSlots.subtext')}
                  </p>
                  <SlotGrid
                    slots={ONLINE_SLOTS}
                    selected={form.slot}
                    onSelect={v => update('slot', v)}
                    bookedSlots={bookedSlots}
                    bookedLabel={t('appointmentPage.step1.slotBooked')}
                  />
                </div>
              )}

              {!form.doctor && (
                <div className="flex items-center gap-3 text-slate-400 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                  <User size={18} /> {t('appointmentPage.step1.selectDoctorFirst')}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ STEP 2 ═══════════════ */}
          {step === 2 && (
            <div aria-label={t('appointmentPage.aria.step2Region')}>
              <h2 className="text-2xl font-bold text-emerald-900 mb-1">
                {t('appointmentPage.step2.heading')}
              </h2>
              <p className="text-slate-500 mb-8">
                {t('appointmentPage.step2.subtext')}
              </p>
              <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-emerald-900 mb-1.5">
                      {t('appointmentPage.step2.fullName')} *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-emerald-500" size={15} />
                      <input
                        value={form.name}
                        onChange={e => update('name', e.target.value)}
                        onBlur={e => { const err = validateField('name', e.target.value); if (err) setErrors(p => ({ ...p, name: err })); }}
                        placeholder={t('appointmentPage.step2.fullNamePlaceholder')}
                        aria-label={t('appointmentPage.step2.fullName')}
                        className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${
                          errors.name ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-emerald-200 focus:ring-emerald-400'
                        }`}
                      />
                    </div>
                    {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.name}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-emerald-900 mb-1.5">
                      {t('appointmentPage.step2.phone')} *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-emerald-500" size={15} />
                      <input
                        value={form.phone}
                        onChange={e => update('phone', e.target.value)}
                        onBlur={e => { const err = validateField('phone', e.target.value); if (err) setErrors(p => ({ ...p, phone: err })); }}
                        placeholder={t('appointmentPage.step2.phonePlaceholder')}
                        maxLength={10}
                        aria-label={t('appointmentPage.step2.phone')}
                        className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${
                          errors.phone ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-emerald-200 focus:ring-emerald-400'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.phone}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-emerald-900 mb-1.5">
                      {t('appointmentPage.step2.email')} *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-emerald-500" size={15} />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => update('email', e.target.value)}
                        onBlur={e => { const err = validateField('email', e.target.value); if (err) setErrors(p => ({ ...p, email: err })); }}
                        placeholder={t('appointmentPage.step2.emailPlaceholder')}
                        readOnly={!!(user?.email)}
                        aria-label={t('appointmentPage.step2.email')}
                        className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${
                          user?.email ? 'bg-emerald-50 text-emerald-900 cursor-default' : ''
                        } ${errors.email ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-emerald-200 focus:ring-emerald-400'}`}
                      />
                    </div>
                    {user?.email && <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">{t('appointmentPage.step2.emailAutofilled')}</p>}
                    {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.email}</p>}
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-semibold text-emerald-900 mb-1.5">
                      {t('appointmentPage.step2.age')} *
                    </label>
                    <input
                      value={form.age}
                      onChange={e => update('age', e.target.value)}
                      onBlur={e => { const err = validateField('age', e.target.value); if (err) setErrors(p => ({ ...p, age: err })); }}
                      placeholder={t('appointmentPage.step2.agePlaceholder')}
                      type="number" min="1" max="120"
                      aria-label={t('appointmentPage.step2.age')}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${
                        errors.age ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-emerald-200 focus:ring-emerald-400'
                      }`}
                    />
                    {errors.age && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.age}</p>}
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-emerald-900 mb-2">
                    {t('appointmentPage.step2.gender')} *
                  </label>
                  <div className="flex gap-3 flex-wrap" role="group" aria-label={t('appointmentPage.step2.gender')}>
                    {genderOptions.map(g => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => update('gender', g.key)}
                        aria-pressed={form.gender === g.key}
                        className={`px-6 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.gender === g.key
                            ? 'border-emerald-600 bg-emerald-700 text-white'
                            : 'border-emerald-200 text-emerald-900 hover:border-emerald-400'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  {errors.gender && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.gender}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-emerald-900 mb-1.5">
                    {t('appointmentPage.step2.notes')} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => update('notes', e.target.value)}
                    rows={3}
                    placeholder={t('appointmentPage.step2.notesPlaceholder')}
                    aria-label={t('appointmentPage.step2.notes')}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none text-sm resize-none ${
                      errors.notes ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-emerald-200'
                    }`}
                  />
                  {errors.notes && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.notes}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3 ═══════════════ */}
          {step === 3 && (
            <div aria-label={t('appointmentPage.aria.step3Region')}>
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">
                {t('appointmentPage.step3.heading')}
              </h2>
              <p className="text-slate-500 mb-8">
                {t('appointmentPage.step3.subtext')}
              </p>

              {/* Login required banner */}
              {!user && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-amber-800 text-sm">
                  <Lock size={16} className="shrink-0" />
                  <span>
                    {t('appointmentPage.step3.loginBanner')}{' '}
                    <button
                      onClick={() => setAuthOpen(true)}
                      className="font-bold underline underline-offset-2"
                    >
                      {t('appointmentPage.step3.loginLink')}
                    </button>{' '}
                    {t('appointmentPage.step3.loginBannerSuffix')}
                  </span>
                </div>
              )}

              {/* Consult type badge */}
              <div className={`flex items-center gap-4 p-4 rounded-2xl mb-5 border-2 ${
                consultType === 'physical' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  consultType === 'physical' ? 'bg-emerald-600' : 'bg-blue-600'
                } text-white`}>
                  {consultType === 'physical' ? <MapPin size={20} /> : <Video size={20} />}
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {consultType === 'physical'
                      ? t('appointmentPage.step3.physicalLabel')
                      : t('appointmentPage.step3.onlineLabel')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {consultType === 'physical'
                      ? t('appointmentPage.step3.physicalSub')
                      : t('appointmentPage.step3.onlineSub')}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm divide-y divide-emerald-50 mb-6">
                {[
                  { label: t('appointmentPage.step3.summary.date'),        value: form.date },
                  { label: t('appointmentPage.step3.summary.time'),        value: `${form.slot} ${t('appointmentPage.step3.summary.slotSuffix')}` },
                  { label: t('appointmentPage.step3.summary.patientName'), value: form.name },
                  { label: t('appointmentPage.step3.summary.phone'),       value: form.phone },
                  { label: t('appointmentPage.step3.summary.email'),       value: form.email },
                  {
                    label: t('appointmentPage.step3.summary.ageGender'),
                    value: t('appointmentPage.step3.summary.ageGenderValue', {
                      age:    form.age,
                      gender: genderDisplayLabel(form.gender),
                    }),
                  },
                  ...(form.doctor
                    ? [{
                        label: t('appointmentPage.step3.summary.doctor'),
                        // Show doctor name in current language
                        value: (() => {
                          const doc = doctors.find(d => d.name === form.doctor);
                          return doc?.name_hi || form.doctor;
                        })(),
                      }]
                    : []),
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-start py-3">
                    <span className="text-slate-400 text-sm">{r.label}</span>
                    <span className="font-semibold text-emerald-900 text-sm text-right max-w-[60%]">{r.value}</span>
                  </div>
                ))}
                {form.notes && (
                  <div className="pt-3">
                    <span className="text-slate-400 text-sm block mb-1">
                      {t('appointmentPage.step3.summary.notes')}
                    </span>
                    <p className="text-emerald-900 text-sm bg-emerald-50 p-3 rounded-lg">{form.notes}</p>
                  </div>
                )}
              </div>

              {/* Confirmation note */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                <strong>{t('appointmentPage.step3.note')}</strong>{' '}
                {t('appointmentPage.step3.confirmNote')}
                {consultType === 'physical' && ` ${t('appointmentPage.step3.physicalArrival')}`}
                {consultType === 'online'   && ` ${t('appointmentPage.step3.onlineLink')}`}
              </div>

              {/* Booking error */}
              {bookingError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mt-4">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-emerald-100">
          {step > 1
            ? (
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-emerald-700 font-semibold hover:text-emerald-900 transition-colors"
              >
                <ArrowLeft size={18} /> {t('appointmentPage.nav.back')}
              </button>
            ) : (
              <Link
                to="/doctors"
                className="flex items-center gap-2 text-emerald-700 font-semibold hover:text-emerald-900 transition-colors"
              >
                <ArrowLeft size={18} /> {t('appointmentPage.nav.backToDoctors')}
              </Link>
            )
          }
          {step < 3
            ? (
              <button
                ref={btnRef}
                onClick={goNext}
                disabled={step === 1 && !canStep1}
                style={{ opacity: 0 }}
                className="flex items-center gap-2 bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {t('appointmentPage.nav.continue')} <ChevronRight size={18} />
              </button>
            ) : (
              <button
                ref={btnRef}
                onClick={handleConfirm}
                disabled={bookingLoading}
                style={{ opacity: 0 }}
                aria-label={user ? t('appointmentPage.nav.confirmButton') : t('appointmentPage.nav.loginToConfirm')}
                className="flex items-center gap-2 bg-emerald-700 text-white font-bold px-10 py-3 rounded-xl hover:bg-emerald-800 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {user ? <CheckCircle size={18} /> : <Lock size={18} />}
                {bookingLoading
                  ? t('appointmentPage.nav.booking')
                  : user
                  ? t('appointmentPage.nav.confirmButton')
                  : t('appointmentPage.nav.loginToConfirm')}
              </button>
            )
          }
        </div>
      </main>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   DoctorOption — extracted sub-component to safely use hooks
────────────────────────────────────────────────────────────── */
const DoctorOption = ({ doc, selected, onSelect }) => {
  const { i18n } = useTranslation();
  const isHindi  = i18n.language === 'hi';
  const displayName     = (isHindi && doc.name_hi)     ? doc.name_hi     : doc.name;
  const displaySpecialty = (isHindi && doc.specialty_hi) ? doc.specialty_hi : doc.specialty;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
        selected
          ? 'border-emerald-600 bg-emerald-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-emerald-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        selected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
      }`}>
        {doc.initials || doc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm truncate">{displayName}</p>
        {displaySpecialty && <p className="text-xs text-slate-500 truncate">{displaySpecialty}</p>}
      </div>
      {selected && <CheckCircle size={18} className="text-emerald-600 shrink-0" />}
    </button>
  );
};

export default AppointmentBooking;
