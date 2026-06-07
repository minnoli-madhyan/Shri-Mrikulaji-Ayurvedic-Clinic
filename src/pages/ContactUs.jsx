import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Phone, Mail, Clock, Send,
  ExternalLink, ShieldCheck, CheckCircle, User, MessageSquare, Loader, AlertCircle,
  Video, Building2, Leaf, Instagram, Facebook, Linkedin
} from 'lucide-react';
import { useGSAP } from '../hooks/useGSAP';
import { useSendMessage } from '../hooks/useContact';

/* ─── Validation (uses translated error messages from caller) ─── */
const validateField = (key, value, t) => {
  switch (key) {
    case 'name':
      if (!value.trim()) return t('contactPage.validation.nameRequired');
      if (value.trim().length < 3) return t('contactPage.validation.nameMinLength');
      return '';
    case 'phone':
      if (!value.trim()) return t('contactPage.validation.phoneRequired');
      if (!/^[6-9]\d{9}$/.test(value.replace(/[\s\-+]/g, ''))) return t('contactPage.validation.phoneInvalid');
      return '';
    case 'email':
      if (!value.trim()) return t('contactPage.validation.emailRequired');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('contactPage.validation.emailInvalid');
      return '';
    case 'message':
      if (!value.trim()) return t('contactPage.validation.messageRequired');
      if (value.trim().length < 10) return t('contactPage.validation.messageTooShort');
      return '';
    default:
      return '';
  }
};

const mapEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7502599.970988133!2d70.41648399142899!3d23.338283789104402!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3974edce11457ca1%3A0xa0274c10a3c57f7a!2sShree%20Mrikula%20Ji%20Ayurvedic%20clinic!5e0!3m2!1sen!2sin!4v1779197134244!5m2!1sen!2sin";

const ContactUs = () => {
  const { t } = useTranslation();
  const [formState, setFormState] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors]       = useState({});
  const { send, loading, error: submitError } = useSendMessage();

  const heroRef  = useRef(null);
  const cardsRef = useRef(null);
  const formRef  = useRef(null);
  const mapRef   = useRef(null);

  const subjects = t('contactPage.form.subjects', { returnObjects: true });
  const offlineSchedule = t('contactPage.hours.schedule', { returnObjects: true });

  useGSAP((gsap) => {
    if (!heroRef.current) return;
    gsap.fromTo(heroRef.current.querySelectorAll('.hero-el'),
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.18, duration: 0.7, ease: 'power3.out', delay: 0.1 }
    );
  }, []);

  useGSAP((gsap) => {
    if (!cardsRef.current) return;
    gsap.fromTo(cardsRef.current.querySelectorAll('.info-card'),
      { y: 50, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.12, duration: 0.65, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: cardsRef.current, start: 'top 85%' } }
    );
  }, []);

  useGSAP((gsap) => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: formRef.current, start: 'top 80%' } }
    );
  }, [submitted]);

  useGSAP((gsap) => {
    if (!mapRef.current) return;
    gsap.fromTo(mapRef.current, { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.15,
        scrollTrigger: { trigger: mapRef.current, start: 'top 80%' } }
    );
  }, []);

  const update = (k, v) => {
    setFormState(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const blur = (k, v) => {
    const err = validateField(k, v, t);
    if (err) setErrors(e => ({ ...e, [k]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    ['name', 'phone', 'email', 'message'].forEach(k => {
      const err = validateField(k, formState[k], t);
      if (err) errs[k] = err;
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const result = await send(formState);
    if (!result.error) setSubmitted(true);
  };

  const firstName = formState.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-[#F1F5F2] font-sans text-slate-900">

      {/* Hero */}
      <header
        ref={heroRef}
        className="relative pt-32 pb-24 bg-emerald-900 text-white overflow-hidden"
        aria-label={t('contactPage.aria.heroRegion')}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400 rounded-full blur-[140px] opacity-10 translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-300 rounded-full blur-[120px] opacity-10 -translate-x-1/3 translate-y-1/3" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <div className="hero-el inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-emerald-200 px-5 py-2 rounded-full text-sm font-semibold mb-6 tracking-wide" style={{ opacity: 0 }}>
            <Leaf size={13} className="text-emerald-400" /> {t('contactPage.hero.badge')}
          </div>
          <h1 className="hero-el text-5xl md:text-7xl font-serif font-bold mb-5 tracking-tight leading-tight" style={{ opacity: 0 }}>
            {t('contactPage.hero.title')} <span className="text-emerald-400">{t('contactPage.hero.titleHighlight')}</span>
          </h1>
          <p className="hero-el text-emerald-100/70 max-w-xl mx-auto text-lg leading-relaxed font-light" style={{ opacity: 0 }}>
            {t('contactPage.hero.subtitle')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48L60 42.7C120 37.3 240 26.7 360 21.3C480 16 600 16 720 21.3C840 26.7 960 37.3 1080 42.7C1200 48 1320 48 1380 48L1440 48V48H0V48Z" fill="#F1F5F2" />
          </svg>
        </div>
      </header>

      {/* Info Cards */}
      <section className="py-10 max-w-6xl mx-auto px-4" aria-label={t('contactPage.aria.infoCards')}>
        <div ref={cardsRef} className="grid md:grid-cols-3 gap-5">

          {/* Location */}
          <div className="info-card group bg-white rounded-2xl shadow-md border border-slate-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden" style={{ opacity: 0 }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-2xl" />
            <div className="w-11 h-11 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-700 group-hover:text-white transition-all duration-300">
              <MapPin size={20} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
              {t('contactPage.infoCards.location.label')}
            </p>
            <p className="font-bold text-slate-800 text-sm leading-snug">{t('contactPage.infoCards.location.address')}</p>
            <p className="text-slate-400 text-xs mt-0.5">{t('contactPage.infoCards.location.state')}</p>
            <a
              href="https://share.google/2OjB5Z1Jnb85ztMvy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('contactPage.aria.mapLink')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <ExternalLink size={11} /> {t('contactPage.infoCards.location.mapLink')}
            </a>
          </div>

          {/* Call */}
          <div className="info-card group bg-white rounded-2xl shadow-md border border-slate-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden" style={{ opacity: 0 }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-400 rounded-t-2xl" />
            <div className="w-11 h-11 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <Phone size={20} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">
              {t('contactPage.infoCards.call.label')}
            </p>
            <p className="font-bold text-slate-800 text-sm">{t('contactPage.infoCards.call.phone')}</p>
            <p className="text-slate-400 text-xs mt-0.5">{t('contactPage.infoCards.call.subtitle')}</p>
            <a
              href="tel:+919759991759"
              aria-label={t('contactPage.aria.callLink')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Phone size={11} /> {t('contactPage.infoCards.call.tapCall')}
            </a>
          </div>

          {/* Email */}
          <div className="info-card group bg-white rounded-2xl shadow-md border border-slate-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden" style={{ opacity: 0 }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400 rounded-t-2xl" />
            <div className="w-11 h-11 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
              <Mail size={20} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">
              {t('contactPage.infoCards.email.label')}
            </p>
            <p className="font-bold text-slate-800 text-xs break-all leading-snug">{t('contactPage.infoCards.email.address')}</p>
            <p className="text-slate-400 text-xs mt-0.5">{t('contactPage.infoCards.email.subtitle')}</p>
            <a
              href="mailto:shrimac.70@gmail.com"
              aria-label={t('contactPage.aria.emailLink')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-800 transition-colors"
            >
              <Mail size={11} /> {t('contactPage.infoCards.email.sendEmail')}
            </a>
          </div>
        </div>
      </section>

      {/* Form + Map */}
      <section className="pb-20 max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-5 gap-8 items-start">

          {/* Contact Form */}
          <div ref={formRef} className="lg:col-span-3" style={{ opacity: 0 }} aria-label={t('contactPage.aria.contactForm')}>
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="relative bg-emerald-900 px-8 py-7 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-700/40 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-700/30 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <MessageSquare size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{t('contactPage.form.heading')}</h2>
                    <p className="text-emerald-300 text-xs mt-0.5">{t('contactPage.form.subheading')}</p>
                  </div>
                </div>
              </div>

              {submitted ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-emerald-50">
                    <CheckCircle className="text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-900 mb-2">
                    {t('contactPage.success.heading')}
                  </h3>
                  <p
                    className="text-slate-500 mb-8 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: t('contactPage.success.message', { name: firstName })
                    }}
                  />
                  <button
                    onClick={() => { setSubmitted(false); setFormState({ name: '', phone: '', email: '', subject: '', message: '' }); }}
                    className="bg-emerald-700 text-white font-bold px-10 py-3 rounded-xl hover:bg-emerald-800 transition-all text-sm shadow-lg"
                  >
                    {t('contactPage.form.sendAnother')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-8 space-y-5" noValidate>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        {t('contactPage.form.fields.fullName')} {t('contactPage.form.required')}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />
                        <input
                          value={formState.name}
                          onChange={e => update('name', e.target.value)}
                          onBlur={e => blur('name', e.target.value)}
                          placeholder={t('contactPage.form.fields.fullNamePlaceholder')}
                          aria-label={t('contactPage.aria.formName')}
                          aria-invalid={!!errors.name}
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 transition-all bg-slate-50 focus:bg-white ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-300 focus:border-emerald-400'}`}
                        />
                      </div>
                      {errors.name && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1" role="alert">
                          <AlertCircle size={10} />{errors.name}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        {t('contactPage.form.fields.phone')} {t('contactPage.form.required')}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />
                        <input
                          value={formState.phone}
                          onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          onBlur={e => blur('phone', e.target.value)}
                          placeholder={t('contactPage.form.fields.phonePlaceholder')}
                          inputMode="numeric"
                          maxLength={10}
                          aria-label={t('contactPage.aria.formPhone')}
                          aria-invalid={!!errors.phone}
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 transition-all bg-slate-50 focus:bg-white ${errors.phone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-300 focus:border-emerald-400'}`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1" role="alert">
                          <AlertCircle size={10} />{errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      {t('contactPage.form.fields.email')} {t('contactPage.form.required')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />
                      <input
                        type="email"
                        value={formState.email}
                        onChange={e => update('email', e.target.value)}
                        onBlur={e => blur('email', e.target.value)}
                        placeholder={t('contactPage.form.fields.emailPlaceholder')}
                        aria-label={t('contactPage.aria.formEmail')}
                        aria-invalid={!!errors.email}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 transition-all bg-slate-50 focus:bg-white ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-300 focus:border-emerald-400'}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1" role="alert">
                        <AlertCircle size={10} />{errors.email}
                      </p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      {t('contactPage.form.fields.subject')}
                    </label>
                    <select
                      value={formState.subject}
                      onChange={e => update('subject', e.target.value)}
                      aria-label={t('contactPage.aria.formSubject')}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 bg-slate-50 focus:bg-white text-slate-700 transition-all"
                    >
                      <option value="">{t('contactPage.form.fields.subjectPlaceholder')}</option>
                      {Array.isArray(subjects) && subjects.map((s, i) => (
                        <option key={i} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      {t('contactPage.form.fields.message')} {t('contactPage.form.required')}
                    </label>
                    <textarea
                      value={formState.message}
                      onChange={e => update('message', e.target.value)}
                      onBlur={e => blur('message', e.target.value)}
                      rows={4}
                      placeholder={t('contactPage.form.fields.messagePlaceholder')}
                      aria-label={t('contactPage.aria.formMessage')}
                      aria-invalid={!!errors.message}
                      className={`w-full px-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 transition-all resize-none bg-slate-50 focus:bg-white ${errors.message ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-300 focus:border-emerald-400'}`}
                    />
                    {errors.message && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1" role="alert">
                        <AlertCircle size={10} />{errors.message}
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700" role="alert">
                      <AlertCircle size={14} className="shrink-0" />{submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    aria-label={t('contactPage.aria.submitForm')}
                    className="w-full bg-emerald-700 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-800 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
                  >
                    {loading
                      ? <><Loader size={16} className="animate-spin" /> {t('contactPage.form.sending')}</>
                      : <><Send size={15} /> {t('contactPage.form.submitButton')}</>
                    }
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div ref={mapRef} className="lg:col-span-2 space-y-5" style={{ opacity: 0 }} aria-label={t('contactPage.aria.mapSection')}>

            {/* Map */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <MapPin className="text-emerald-600" size={15} /> {t('contactPage.map.heading')}
                </h3>
                <a
                  href="https://share.google/2OjB5Z1Jnb85ztMvy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('contactPage.aria.mapLink')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  <ExternalLink size={10} /> {t('contactPage.map.openMaps')}
                </a>
              </div>
              <div className="h-[210px] w-full">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={t('contactPage.map.iframeTitle')}
                />
              </div>
            </div>

            {/* Consultation Hours */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
              <h3 className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-4">
                <Clock className="text-emerald-600" size={15} /> {t('contactPage.hours.heading')}
              </h3>

              {/* Offline */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={11} className="text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    {t('contactPage.hours.offlineLabel')}
                  </span>
                </div>
                <div className="space-y-2">
                  {Array.isArray(offlineSchedule) && offlineSchedule.map((r, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-slate-700 text-xs font-semibold">{r.day}</span>
                      <span className="text-emerald-700 text-xs font-bold">{r.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Online */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Video size={11} className="text-blue-600" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                    {t('contactPage.hours.onlineLabel')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-slate-700 text-xs font-semibold">
                    {t('contactPage.hours.onlineSchedule.day')}
                  </span>
                  <span className="text-blue-700 text-xs font-bold">
                    {t('contactPage.hours.onlineSchedule.time')}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="tel:+919759991759"
                aria-label={t('contactPage.aria.callLink')}
                className="flex items-center justify-center gap-2 bg-emerald-700 text-white font-bold py-3.5 rounded-2xl hover:bg-emerald-800 active:scale-[0.97] transition-all text-sm shadow-lg shadow-emerald-200"
              >
                <Phone size={15} /> {t('contactPage.cta.callNow')}
              </a>
              <a
                href="mailto:shrimac.70@gmail.com"
                aria-label={t('contactPage.aria.emailLink')}
                className="flex items-center justify-center gap-2 border-2 border-emerald-700 text-emerald-700 font-bold py-3.5 rounded-2xl hover:bg-emerald-50 active:scale-[0.97] transition-all text-sm"
              >
                <Mail size={15} /> {t('contactPage.cta.emailUs')}
              </a>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                {t('contactPage.social.heading', 'Follow Us')}
              </p>
              <div className="flex items-center gap-3">
                <a href="https://www.instagram.com/shrimac.70?igsh=N3p3MmIyaGdqdDBj" target="_blank" rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600 transition-all duration-200 text-xs font-semibold">
                  <Instagram size={15}/> Instagram
                </a>
                <a href="https://www.facebook.com/profile.php?id=61580725830547" target="_blank" rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200 text-xs font-semibold">
                  <Facebook size={15}/> Facebook
                </a>
                <a href="https://www.linkedin.com/company/shree-mrikulaji-ayurvedicclinic/" target="_blank" rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600 transition-all duration-200 text-xs font-semibold">
                  <Linkedin size={15}/> LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Banner */}
      <section className="relative bg-emerald-950 py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-emerald-800/40 rounded-full blur-[80px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center text-white relative z-10">
          <ShieldCheck className="mx-auto text-emerald-400 mb-4" size={40} />
          <h2 className="text-3xl font-serif font-bold mb-3">{t('contactPage.banner.heading')}</h2>
          <p className="text-emerald-200/70 italic text-base mb-2">{t('contactPage.banner.quote')}</p>
          <p className="text-emerald-400/50 text-xs tracking-widest uppercase">{t('contactPage.banner.attribution')}</p>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;
