// src/pages/Doctors.jsx
// Bilingual (English + Hindi) implementation using react-i18next
// Dynamic DB fields rendered via language-aware helper

import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Star, Award, Clock, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '../hooks/useGSAP';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import { useDoctors } from '../hooks/useDoctors';

/* ─────────────────────────────────────────────────────────────
   Language-aware field helper
   Returns the Hindi field when i18n language is 'hi' and the
   Hindi field exists; otherwise falls back to the English field.

   Usage:  lf(doc, 'name')         → doc.name_hi  || doc.name
           lf(doc, 'specialty')    → doc.specialty_hi || doc.specialty
────────────────────────────────────────────────────────────── */
const useLangField = () => {
  const { i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const lf = (obj, field) => {
    if (!obj) return '';
    if (isHindi && obj[`${field}_hi`]) return obj[`${field}_hi`];
    return obj[field] ?? '';
  };

  return lf;
};

/* ─────────────────────────────────────────────────────────────
   DoctorCard
────────────────────────────────────────────────────────────── */
const DoctorCard = ({ doc, index, onBook }) => {
  const { t } = useTranslation();
  const lf = useLangField();

  // Specialties: prefer Hindi array if available, else parse English string
  const { i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const rawSpecialties = isHindi && doc.specialties_hi
    ? doc.specialties_hi
    : doc.specialties;

  const specialties = Array.isArray(rawSpecialties)
    ? rawSpecialties
    : typeof rawSpecialties === 'string'
      ? rawSpecialties.split(',').map(s => s.trim()).filter(Boolean)
      : [];

  const displayName       = lf(doc, 'name');
  const displaySpecialty  = lf(doc, 'specialty');
  const displayExperience = lf(doc, 'experience');
  const displayBio        = lf(doc, 'bio');
  const displayTag        = lf(doc, 'tag');
  const displayPatients   = lf(doc, 'patients_treated');
  const displayAvailability = lf(doc, 'availability');

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
    >
      {/* Card Header */}
      <div className={`bg-gradient-to-br ${doc.color || 'from-emerald-600 to-emerald-800'} p-8 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-end gap-5 relative z-10">
          <div className="w-24 h-24 rounded-2xl border-4 border-white/30 shadow-xl shrink-0 bg-white/20 flex items-center justify-center overflow-hidden">
            {doc.avatar_url
              ? <img src={doc.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-2xl">{doc.initials}</span>
            }
          </div>
          <div>
            <span className="inline-block bg-white/20 border border-white/30 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              {displayTag}
            </span>
            <h3 className="text-xl font-bold text-white leading-tight">{displayName}</h3>
            <p className="text-white/70 text-sm font-medium">{displaySpecialty}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 border-b border-emerald-50">
        {[
          { label: t('doctorsPage.card.experience'), value: displayExperience },
          { label: t('doctorsPage.card.patients'),   value: displayPatients },
          { label: t('doctorsPage.card.rating'),     value: `★ ${doc.rating ?? '5.0'}` },
        ].map(s => (
          <div key={s.label} className="text-center py-4 border-r last:border-r-0 border-emerald-50">
            <p className="text-emerald-800 font-black text-lg leading-none">{s.value || '—'}</p>
            <p className="text-slate-400 text-[11px] uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        <p className="text-slate-500 text-sm leading-relaxed">{displayBio}</p>

        {/* Specialties */}
        {specialties.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
              {t('doctorsPage.card.specialties')}
            </p>
            <div className="flex flex-wrap gap-2">
              {specialties.map((s, i) => (
                <span
                  key={i}
                  className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        {displayAvailability && (
          <div className="flex items-start gap-2 text-slate-500 text-sm bg-slate-50 rounded-xl px-4 py-3">
            <Clock size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-700">{t('doctorsPage.card.available')}:</strong>{' '}
              {displayAvailability}
            </span>
          </div>
        )}

        {/* Book Button */}
        <div className="flex items-center justify-center pt-2 border-t border-emerald-50">
          <button
            onClick={() => onBook(doc.name)} // always pass English name for URL/DB compatibility
            aria-label={`${t('doctorsPage.card.bookButton')} — ${displayName}`}
            className="flex items-center gap-2 bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-emerald-800 transition-colors shadow-md"
          >
            <Calendar size={15} /> {t('doctorsPage.card.bookButton')}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Skeleton loader
────────────────────────────────────────────────────────────── */
const DoctorSkeleton = () => (
  <div className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden animate-pulse">
    <div className="h-48 bg-emerald-100" />
    <div className="p-6 space-y-3">
      <div className="h-4 bg-slate-100 rounded-full w-3/4" />
      <div className="h-4 bg-slate-100 rounded-full w-1/2" />
      <div className="h-4 bg-slate-100 rounded-full w-2/3" />
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Doctors Page
────────────────────────────────────────────────────────────── */
const Doctors = () => {
  const heroRef  = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const { doctors, loading }    = useDoctors();
  const { t }                   = useTranslation();

  const handleBook = (doctorName) => {
    if (!user) {
      setAuthOpen(true);
    } else {
      navigate(`/appointment${doctorName ? `?doctor=${encodeURIComponent(doctorName)}` : ''}`);
    }
  };

  useGSAP((gsap) => {
    if (!heroRef.current) return;
    gsap.fromTo(
      heroRef.current.querySelectorAll('.doc-hero-el'),
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.2, duration: 0.8, ease: 'power3.out', delay: 0.2 }
    );
  }, []);

  return (
    <div className="page-container">

      {/* ── Hero ── */}
      <header ref={heroRef} className="relative pt-32 pb-20 bg-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full blur-[120px] opacity-20 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 rounded-full blur-[120px] opacity-10 translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <span
            className="doc-hero-el inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-800/60 border border-emerald-600 text-emerald-200 text-sm font-semibold mb-6"
            style={{ opacity: 0 }}
          >
            <Leaf size={14} /> {t('doctorsPage.hero.badge')}
          </span>
          <h1
            className="doc-hero-el text-5xl md:text-6xl font-serif font-bold mb-6 tracking-tight"
            style={{ opacity: 0 }}
          >
            {t('doctorsPage.hero.title')}
          </h1>
          <p
            className="doc-hero-el text-emerald-100/80 max-w-2xl mx-auto text-lg leading-relaxed"
            style={{ opacity: 0 }}
          >
            {t('doctorsPage.hero.subtitle')}
          </p>
        </div>
      </header>

      {/* ── Trust Bar ── */}
      <div className="bg-emerald-50 border-b border-emerald-100 py-5">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-8 text-sm text-emerald-800">
          {[
            { icon: Star,    key: 'patients'   },
            { icon: Award,   key: 'affiliated' },
            { icon: Clock,   key: 'service'    },
            { icon: Leaf,    key: 'natural'    },
          ].map(({ icon: Icon, key }) => (
            <div key={key} className="flex items-center gap-2 font-semibold">
              <Icon size={16} className="text-emerald-600" />
              {t(`doctorsPage.trustBar.${key}`)}
            </div>
          ))}
        </div>
      </div>

      {/* ── Doctor Cards ── */}
      <main className="max-w-7xl mx-auto px-4 py-20" aria-label={t('doctorsPage.section.heading')}>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-emerald-900 mb-4">
            {t('doctorsPage.section.heading')}
          </h2>
          <div className="h-1 w-20 bg-emerald-600 mx-auto rounded-full mb-4" />
          <p className="text-slate-500 max-w-xl mx-auto">
            {t('doctorsPage.section.subtext')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <DoctorSkeleton key={i} />)
            : doctors
                .filter(d => d.is_active !== false)
                .map((doc, i) => (
                  <DoctorCard key={doc.id} doc={doc} index={i} onBook={handleBook} />
                ))
          }
        </div>
      </main>

      {/* ── Bottom CTA ── */}
      <section className="bg-emerald-900 py-20 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-serif font-bold mb-4">
            {t('doctorsPage.cta.heading')}
          </h2>
          <p className="text-emerald-200/70 mb-8">
            {t('doctorsPage.cta.subtext')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleBook(null)}
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-900 font-bold px-8 py-4 rounded-full hover:bg-emerald-50 transition-colors shadow-lg"
            >
              <Calendar size={18} /> {t('doctorsPage.cta.bookButton')}
            </button>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
            >
              {t('doctorsPage.cta.contactButton')}
            </Link>
          </div>
        </div>
      </section>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

export default Doctors;
