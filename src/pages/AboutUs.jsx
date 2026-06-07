import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  History, Users, Award, Heart, ShieldCheck,
  Leaf, Quote, Star, CheckCircle2, Target,
  Twitter, Facebook, Linkedin, Calendar, Stethoscope, FlaskConical, ClipboardList, Settings2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGSAP } from '../hooks/useGSAP';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';

/* ─── Icon map keyed to member index ────────────────────────────── */
const memberIcons = [Leaf, FlaskConical, Stethoscope, Settings2];
const memberGradients = [
  'from-emerald-600 to-emerald-800',
  'from-teal-600 to-teal-800',
  'from-cyan-600 to-cyan-800',
  'from-violet-600 to-violet-800',
];
const memberAccents = [
  'bg-emerald-50 text-emerald-700 border-emerald-100',
  'bg-teal-50 text-teal-700 border-teal-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
  'bg-violet-50 text-violet-700 border-violet-100',
];
const memberInitials = ['RS', 'LS', 'MS', 'TS'];
const memberPhotos = [
  '/images/doctors/Rajendra_singh.png',
  '/images/doctors/Lalitendra_Singh.png',
  '/images/doctors/Mridul_Sengar.png',
  '/images/doctors/clinic_manager.png',
];

/* ─── Team Card ──────────────────────────────────────────────────── */
const TeamCard = ({ member, index }) => {
  const { t } = useTranslation();
  const IconComp = memberIcons[index];
  const gradient = memberGradients[index];
  const accent = memberAccents[index];
  const initials = memberInitials[index];
  const photo = memberPhotos[index];

  return (
    <div
      className="team-card-anim bg-white rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
      style={{ opacity: 0 }}
    >
      {/* Header strip */}
      <div className={`bg-gradient-to-br ${gradient} p-7 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="flex items-center gap-5 relative z-10">
          {/* Photo or Initials */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl shrink-0 bg-white/20 flex items-center justify-center">
            {index === 0 ? (
              <img
                src={photo}
                alt={member.name}
                className="w-full h-full object-cover"
                onError={e => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white font-bold text-xl">${initials}</div>`;
                }}
              />
            ) : (
              <span className="text-white font-bold text-xl">{initials}</span>
            )}
          </div>

          {/* Name & role */}
          <div className="min-w-0">
            <span className="inline-block bg-white/20 border border-white/30 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full mb-1.5">
              {member.tag}
            </span>
            <h3 className="text-white font-bold text-lg leading-tight">{member.name}</h3>
            <p className="text-white/70 text-sm">{member.role}</p>
          </div>

          {/* Exp badge */}
          <div className="ml-auto shrink-0 bg-white/20 border border-white/30 rounded-xl px-3 py-2 text-center hidden sm:block">
            <p className="text-white font-black text-base leading-none">{member.exp}</p>
            <p className="text-white/60 text-[10px] uppercase tracking-wider mt-0.5">
              {t('aboutPage.team.expLabel')}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-7 grid md:grid-cols-5 gap-6">
        {/* Bio — wider column */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <p className="text-slate-500 text-sm leading-relaxed">{member.bio}</p>

          {/* Quote */}
          <div className="bg-slate-50 border-l-4 border-emerald-400 rounded-r-xl p-4 mt-auto">
            <Quote size={18} className="text-emerald-400 mb-1" />
            <p className="text-slate-600 text-sm italic leading-snug">"{member.quote}"</p>
          </div>
        </div>

        {/* Specialties + Social — narrower column */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              {t('aboutPage.team.specialtiesLabel')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {member.specialties.map((s, si) => (
                <span key={si} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${accent}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2">
            {[Twitter, Facebook, Linkedin].map((Icon, i) => (
              <button
                key={i}
                className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white hover:border-transparent transition-all"
                aria-label={`Social link ${i + 1}`}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Page ───────────────────────────────────────────────────────── */
const AboutUs = () => {
  const { t, i18n } = useTranslation();
  const heroRef      = useRef(null);
  const heroTextRef  = useRef(null);
  const storyRef     = useRef(null);
  const missionRef   = useRef(null);
  const teamRef      = useRef(null);
  const timelineRef  = useRef(null);
  const standoutRef  = useRef(null);
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const [authOpen, setAuthOpen] = React.useState(false);

  const handleBookClick = () => {
    if (!user) {
      setAuthOpen(true);
    } else {
      navigate('/appointment');
    }
  };

  // Pull translated arrays
  const teamMembers   = t('aboutPage.team.members',   { returnObjects: true });
  const timelineItems = t('aboutPage.timeline.items', { returnObjects: true });
  const missionItems  = t('aboutPage.mission.items',  { returnObjects: true });
  const standoutItems = t('aboutPage.standout.items', { returnObjects: true });

  /* Hero orbs + text */
  useGSAP((gsap) => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.about-orb-1', { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.2, duration: 1.4, ease: 'elastic.out(1,0.5)' })
      .fromTo('.about-orb-2', { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.15, duration: 1.4, ease: 'elastic.out(1,0.5)' }, '-=1.1')
      .fromTo(heroTextRef.current?.children || [], { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.2, duration: 0.8 }, '-=0.8');
  }, []);

  /* Story slide-in */
  useGSAP((gsap) => {
    if (!storyRef.current) return;
    gsap.fromTo(storyRef.current, { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: storyRef.current, start: 'top 78%' } });
  }, []);

  /* Mission zoom */
  useGSAP((gsap) => {
    if (!missionRef.current) return;
    gsap.fromTo(missionRef.current, { scale: 0.8, opacity: 0, rotateX: 15 }, { scale: 1, opacity: 1, rotateX: 0, duration: 1, ease: 'back.out(1.5)', scrollTrigger: { trigger: missionRef.current, start: 'top 78%' } });
    const items = missionRef.current.querySelectorAll('.mission-item');
    gsap.fromTo(items, { x: 30, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.12, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: missionRef.current, start: 'top 72%' }, delay: 0.3 });
  }, []);

  /* Team cards stagger */
  useGSAP((gsap) => {
    if (!teamRef.current) return;
    const cards = teamRef.current.querySelectorAll('.team-card-anim');
    cards.forEach((card, i) => {
      gsap.fromTo(card,
        { y: 60, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 92%' }, delay: i * 0.1 }
      );
    });
  }, []);

  /* Timeline milestones */
  useGSAP((gsap) => {
    if (!timelineRef.current) return;
    const milestones = timelineRef.current.querySelectorAll('.milestone-card');
    milestones.forEach((m, i) => {
      gsap.fromTo(m, { y: 60, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: m, start: 'top 82%' }, delay: i * 0.1 });
    });
  }, []);

  /* Stand-out features */
  useGSAP((gsap) => {
    if (!standoutRef.current) return;
    const features = standoutRef.current.querySelectorAll('.feature-item');
    gsap.fromTo(features, { scale: 0.7, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, stagger: 0.08, duration: 0.5, ease: 'back.out(1.6)', scrollTrigger: { trigger: standoutRef.current, start: 'top 78%' } });
  }, []);

  const standoutIcons = [Heart, Star, Users, ShieldCheck, Award, Leaf];

  return (
    <div className="min-h-screen bg-[#F1F5F2] font-sans text-slate-900 overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────── */}
      <header ref={heroRef} className="relative pt-32 pb-24 bg-emerald-900 text-white overflow-hidden" aria-label={t('aboutPage.hero.title')}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="about-orb-1 absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
          <div className="about-orb-2 absolute bottom-0 right-0 w-96 h-96 bg-emerald-300 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
        </div>
        <div ref={heroTextRef} className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-800/60 border border-emerald-600 text-emerald-200 text-sm font-semibold mb-6 opacity-0">
            {t('aboutPage.hero.badge')}
          </span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 tracking-tight opacity-0">
            {t('aboutPage.hero.title')}
          </h1>
          <p className="text-emerald-100/80 max-w-3xl mx-auto text-xl leading-relaxed font-light opacity-0">
            {t('aboutPage.hero.subtitle')}
          </p>
        </div>
      </header>

      {/* ── Origin Story ─────────────────────────────────── */}
      <section className="py-24 max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div ref={storyRef} style={{ opacity: 0 }}>
            <div className="flex items-center gap-3 text-emerald-700 font-bold mb-4">
              <History size={24} />
              <span className="uppercase tracking-widest text-sm">{t('aboutPage.story.label')}</span>
            </div>
            <h2 className="text-4xl font-serif font-bold text-emerald-900 mb-6">
              {t('aboutPage.story.heading')}
            </h2>
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
              <p dangerouslySetInnerHTML={{ __html: t('aboutPage.story.para1') }} />
              <p>{t('aboutPage.story.para2')}</p>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-2xl italic">
                <Quote className="text-emerald-400 mb-2" size={32} />
                "{t('aboutPage.story.founderQuote')}"
              </div>
            </div>
          </div>

          <div ref={missionRef} className="bg-white p-8 rounded-[3rem] shadow-2xl border border-emerald-100" style={{ opacity: 0, perspective: '800px' }}>
            <h3 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
              <Target className="text-emerald-600" /> {t('aboutPage.mission.heading')}
            </h3>
            <p className="text-slate-600 mb-6">{t('aboutPage.mission.subtext')}</p>
            <div className="space-y-3">
              {Array.isArray(missionItems) && missionItems.map((item, i) => (
                <div key={i} className="mission-item flex items-center gap-3 bg-[#ECFAE5] p-4 rounded-2xl border border-emerald-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default" style={{ opacity: 0 }}>
                  <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                  <span className="font-semibold text-emerald-900">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Team ─────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">

          {/* Section heading */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-emerald-900 mb-4">
              {t('aboutPage.team.heading')}
            </h2>
            <div className="h-1.5 w-24 bg-emerald-600 mx-auto rounded-full mb-5" />
            <p className="text-slate-500 max-w-2xl mx-auto text-base">
              {t('aboutPage.team.subtext')}
            </p>
          </div>

          {/* Cards */}
          <div ref={teamRef} className="flex flex-col gap-8">
            {Array.isArray(teamMembers) && teamMembers.map((member, i) => (
              <TeamCard key={i} member={member} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────── */}
      <section
        className="py-24 relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1600&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-[#e8f5e1]/90" />
        <div ref={timelineRef} className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-emerald-900 mb-4">
              {t('aboutPage.timeline.heading')}
            </h2>
            <p className="text-emerald-700 font-medium">{t('aboutPage.timeline.subtext')}</p>
          </div>
          <div className="space-y-12 relative before:content-[''] before:absolute before:left-0 md:before:left-1/2 before:w-1 before:h-full before:bg-emerald-200 before:-translate-x-1/2">
            {Array.isArray(timelineItems) && timelineItems.map((m, i) => (
              <div
                key={i}
                className={`milestone-card relative flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                style={{ opacity: 0 }}
              >
                <div className="absolute left-0 md:left-1/2 w-8 h-8 bg-emerald-600 rounded-full border-4 border-white shadow-lg -translate-x-1/2 z-10" />
                <div className="w-full md:w-1/2">
                  <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-50">
                    <span className="text-emerald-600 font-black text-3xl mb-2 block opacity-30">{m.year}</span>
                    <h4 className="text-2xl font-bold text-emerald-900 mb-2">{m.title}</h4>
                    <p className="text-slate-600">{m.desc}</p>
                  </div>
                </div>
                <div className="hidden md:block w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stand Out ─────────────────────────────────────── */}
      <section className="py-24 bg-emerald-900 text-white text-center">
        <div ref={standoutRef} className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold mb-12">
            {t('aboutPage.standout.heading')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.isArray(standoutItems) && standoutItems.map((text, i) => {
              const Icon = standoutIcons[i];
              return (
                <div key={i} className="feature-item flex items-center gap-4 bg-emerald-800/50 p-6 rounded-2xl border border-emerald-700 hover:bg-emerald-800 transition-colors" style={{ opacity: 0 }}>
                  <Icon className="text-emerald-400 shrink-0" size={28} />
                  <span className="font-bold text-left">{text}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-14">
            <button
              onClick={handleBookClick}
              className="inline-flex items-center gap-2 bg-white text-emerald-900 font-bold px-8 py-4 rounded-full hover:bg-emerald-50 transition-colors shadow-lg"
              aria-label={t('aboutPage.standout.bookButton')}
            >
              <Calendar size={18} /> {t('aboutPage.standout.bookButton')}
            </button>
          </div>
          <p className="mt-10 text-emerald-200/60 italic text-lg font-serif">
            {t('aboutPage.standout.closingQuote')}
          </p>
        </div>
      </section>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

export default AboutUs;
