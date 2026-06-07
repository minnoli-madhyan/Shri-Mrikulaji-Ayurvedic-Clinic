// src/pages/Services.jsx
// ─────────────────────────────────────────────────────────────
// MIGRATED: Fully dynamic — fetches from Supabase via useServices.
// Removed: import of treatmentsData and TreatmentCard.
// Preserved: all GSAP animations, Parhez diet section, bilingual
//            support, SEO structure, responsiveness.
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import {
  ChevronRight, Utensils, CheckCircle2, Ban, XCircle, Sparkles,
  Leaf, Stethoscope, Activity, Heart, User, Baby,
  Droplets, ShieldCheck, Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '../hooks/useGSAP';
import { useServices } from '../hooks/useServices';

// ── Icon resolver (maps icon_name string stored in DB → Lucide component)
const ICON_MAP = {
  Leaf,
  Stethoscope,
  Activity,
  Heart,
  User,
  Baby,
  Sparkles,
  Droplets,
  ShieldCheck,
};
const resolveIcon = (name) => ICON_MAP[name] || Leaf;

// ── Loading skeleton card
const SkeletonCard = () => (
  <div className="card-base animate-pulse">
    <div className="card-header">
      <div className="card-icon-wrapper bg-slate-200" />
      <div className="h-5 bg-slate-200 rounded-lg flex-1 ml-3" />
    </div>
    <div className="space-y-2 mt-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-3.5 bg-slate-100 rounded-full w-full" />
      ))}
      <div className="h-3.5 bg-slate-100 rounded-full w-4/5" />
    </div>
  </div>
);

// ── Dynamic Treatment Card (replaces static TreatmentCard)
const ServiceCard = ({ service, lang }) => {
  const Icon = resolveIcon(service.icon_name);
  const title       = lang === 'hi' ? (service.title_hi || service.title_en)       : service.title_en;
  const description = lang === 'hi' ? (service.description_hi || service.description_en) : service.description_en;
  const items       = lang === 'hi'
    ? (service.items_hi?.length ? service.items_hi : service.items_en)
    : (service.items_en || []);

  return (
    <div className="card-base group hover-shadow-extra transform hover:-translate-y-2 hover:border-emerald-200 transition-all duration-500 ease-out">
      <div className="card-header">
        <div className="card-icon-wrapper group-hover:bg-emerald-600 group-hover:text-white">
          <Icon size={24} />
        </div>
        <h3 className="card-title">{title}</h3>
      </div>

      {description && (
        <p className="card-description">{description}</p>
      )}

      <div className="mt-auto">
        <ul className="space-y-2.5">
          {items.map((item, idx) => (
            <li key={idx} className="card-list-item">
              <div className="card-bullet" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ── Main Services Page ────────────────────────────────────────
const Services = () => {
  const { t, i18n }      = useTranslation();
  const lang             = i18n.language;           // 'en' | 'hi'
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ── Data ────────────────────────────────────────────────────
  const { services, loading, error } = useServices();

  // ── Refs for GSAP ───────────────────────────────────────────
  const heroRef      = useRef(null);
  const heroBadgeRef = useRef(null);
  const heroH1Ref    = useRef(null);
  const heroPRef     = useRef(null);
  const cardsRef     = useRef(null);
  const parhezHRef   = useRef(null);
  const pathyaRef    = useRef(null);
  const apathyaRef   = useRef(null);

  // ── Scroll-top listener ─────────────────────────────────────
  useGSAP(() => {
    const h = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  // ── Hero entrance ───────────────────────────────────────────
  useGSAP((gsap) => {
    if (!heroRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.services-orb-1', { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.15, duration: 1.2, ease: 'elastic.out(1,0.6)' })
      .fromTo('.services-orb-2', { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.1, duration: 1.2, ease: 'elastic.out(1,0.6)' }, '-=0.9')
      .fromTo(heroBadgeRef.current, { y: 30, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.6 }, '-=0.6')
      .fromTo(heroH1Ref.current, { y: 60, opacity: 0, skewY: 3 }, { y: 0, opacity: 1, skewY: 0, duration: 0.8 }, '-=0.3')
      .fromTo(heroPRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4');
  }, []);

  // ── Treatment cards scroll stagger (re-runs when services load)
  useGSAP((gsap) => {
    if (!cardsRef.current || loading) return;
    const cards = cardsRef.current.querySelectorAll('.treatment-card-anim');
    cards.forEach((card, i) => {
      gsap.fromTo(card,
        { x: i % 2 === 0 ? -80 : 80, opacity: 0, scale: 0.95 },
        {
          x: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 80%', toggleActions: 'play none none none' },
          delay: (i % 2) * 0.15,
        }
      );
    });
  }, [loading, services]);

  // ── Parhez heading animation ────────────────────────────────
  useGSAP((gsap) => {
    if (!parhezHRef.current) return;
    gsap.fromTo(parhezHRef.current,
      { opacity: 0, scale: 0.85, y: 40 },
      { opacity: 1, scale: 1, y: 0, duration: 1, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: parhezHRef.current, start: 'top 80%' } }
    );
  }, []);

  // ── Diet card flip animations ───────────────────────────────
  useGSAP((gsap) => {
    if (!pathyaRef.current || !apathyaRef.current) return;
    gsap.fromTo(pathyaRef.current,
      { rotateY: -25, x: -100, opacity: 0 },
      { rotateY: 0, x: 0, opacity: 1, duration: 1, ease: 'power4.out',
        scrollTrigger: { trigger: pathyaRef.current, start: 'top 80%' } }
    );
    gsap.fromTo(apathyaRef.current,
      { rotateY: 25, x: 100, opacity: 0 },
      { rotateY: 0, x: 0, opacity: 1, duration: 1, ease: 'power4.out',
        scrollTrigger: { trigger: apathyaRef.current, start: 'top 80%' }, delay: 0.15 }
    );
  }, []);

  useGSAP((gsap, ScrollTrigger) => {
  if (!ScrollTrigger || loading) return;

  ScrollTrigger.refresh();
}, [loading, services]);

  return (
    <div className="page-container">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header ref={heroRef} className="relative pt-32 pb-20 bg-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="services-orb-1 absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="services-orb-2 absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <span ref={heroBadgeRef} className="inline-block px-4 py-1.5 rounded-full bg-emerald-800/60 border border-emerald-600 text-emerald-200 text-sm font-semibold mb-6">
            {lang === 'hi' ? '🌿 विश्वसनीय आयुर्वेदिक उपचार' : '🌿 Trusted Ayurvedic Healing'}
          </span>
          <h1 ref={heroH1Ref} className="text-4xl md:text-6xl font-serif font-bold mb-6 tracking-tight">
            {lang === 'hi' ? 'हमारे विशेष उपचार' : 'Our Specialized Treatments'}
          </h1>
          <p ref={heroPRef} className="text-emerald-100/90 max-w-2xl mx-auto text-base leading-relaxed">
            {lang === 'hi'
              ? 'आपके शरीर की अनूठी प्रकृति के अनुरूप 100% प्राकृतिक हर्बल उपचार। हम केवल लक्षणों का नहीं — भीतर से उपचार करते हैं।'
              : 'Experience 100% natural herbal healing tailored to your body\'s unique constitution. We don\'t just treat symptoms — we heal from within.'}
          </p>
        </div>
      </header>

      {/* ── Treatment Cards ───────────────────────────────────── */}
      <section
        className="py-20 relative"
        style={{
          backgroundImage: `url('https://i.pinimg.com/1200x/30/8f/48/308f48fbecdfff4ad1021a1e136cf198.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          // backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-emerald-900/75 backdrop-blur-[1px]" />

        <div ref={cardsRef} className="max-w-7xl mx-auto px-4 relative z-10">

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="text-center py-16">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-white/20">
                <p className="text-white font-semibold text-lg mb-2">
                  {lang === 'hi' ? 'सेवाएं लोड नहीं हो सकीं' : 'Could not load services'}
                </p>
                <p className="text-emerald-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && services.length === 0 && (
            <div className="text-center py-16">
              <p className="text-emerald-100 text-base">
                {lang === 'hi' ? 'अभी कोई सेवा उपलब्ध नहीं है।' : 'No treatments available at the moment.'}
              </p>
            </div>
          )}

          {/* Dynamic service cards */}
          {!loading && !error && services.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <div key={service.id} className="treatment-card-anim">
                  <ServiceCard service={service} lang={lang} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Parhez / Diet Section (static — unchanged) ─────────── */}
      <section id="diet" className="py-24 bg-[#ECFAE5] relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="bg-[#A0D683]/20 p-4 rounded-3xl border border-[#A0D683]/40">
                <Utensils className="text-emerald-800" size={40} />
              </div>
            </div>
            <h2 ref={parhezHRef} className="text-3xl md:text-5xl font-serif font-bold text-emerald-950 mb-6 opacity-0">
              {lang === 'hi' ? '"परहेज" – आपके इलाज की कुंजी' : '"Parhez" – The Key to Your Cure'}
            </h2>
            <div className="h-1.5 w-32 bg-[#A0D683] mx-auto rounded-full mb-8" />
            <p className="text-emerald-900/80 max-w-3xl mx-auto text-lg leading-relaxed italic font-medium">
              {lang === 'hi'
                ? '"उचित आहार आधा उपचार है। इन दिशानिर्देशों का पालन करें ताकि हमारी प्राकृतिक दवाएं पूरी शक्ति से काम करें।"'
                : '"Proper diet is half the treatment. Follow these guidelines so our natural medicines work at their full strength."'}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12" style={{ perspective: '1000px' }}>

            {/* Pathya */}
            <div ref={pathyaRef} className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-emerald-100" style={{ opacity: 0 }}>
              <div className="bg-[#A0D683] p-10 pb-12 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="bg-white/90 p-4 rounded-2xl shadow-sm">
                    <CheckCircle2 className="text-[#A0D683]" size={36} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-emerald-950 tracking-tight">
                      {lang === 'hi' ? 'पथ्य' : 'Pathya'}
                    </h3>
                    <span className="text-emerald-900/70 font-bold text-sm uppercase tracking-widest italic">
                      {lang === 'hi' ? 'खाने योग्य आहार' : 'Foods to Eat'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-10 -mt-6 bg-white rounded-t-[3rem] relative z-20 space-y-8">
                <div>
                  <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-base">
                    <ChevronRight size={22} className="text-[#A0D683]" />
                    {lang === 'hi' ? 'सब्जियाँ एवं फल' : 'Vegetables & Fruits'}
                  </h4>
                  <p className="text-slate-600 leading-relaxed pl-8 text-base">
                    {lang === 'hi'
                      ? 'लौकी, तोरई, पालक, टिंडा, परवल, मेथी, गाजर, शलगम, चुकंदर। पपीता, चीकू और मौसमी मीठे फल।'
                      : 'Bottle Gourd (Lauki), Ridge Gourd (Torai), Spinach (Palak), Round Gourd (Tinda), Parwal, Fenugreek (Methi), Carrots, Turnip, Beetroot. Papaya, Chikoo, and seasonal sweet fruits.'}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-base">
                    <ChevronRight size={22} className="text-[#A0D683]" />
                    {lang === 'hi' ? 'हल्के अनाज एवं अन्य' : 'Light Grains & Others'}
                  </h4>
                  <p className="text-slate-600 leading-relaxed pl-8 text-base">
                    {lang === 'hi'
                      ? 'मूंग दाल, मोठ दाल, मसूर दाल, गेहूं की दलिया, खिचड़ी। दूध (जैसा निर्धारित हो), हल्का घर का खाना और गुनगुना पानी।'
                      : 'Moong Dal, Moth Dal, Masoor Dal, Wheat Porridge (Daliya), Khichdi. Milk (as prescribed), light home-cooked meals, and lukewarm water.'}
                  </p>
                </div>
                <div className="p-6 bg-[#ECFAE5] rounded-2xl flex gap-4 items-center border border-[#A0D683]/30">
                  <Sparkles className="text-[#A0D683] shrink-0" size={24} />
                  <p className="text-sm leading-snug text-emerald-900">
                    <strong className="block text-base">
                      {lang === 'hi' ? 'सुझाव:' : 'Pro Tip:'}
                    </strong>
                    {lang === 'hi'
                      ? 'पाचन को सही रखने के लिए ताजा और गर्म भोजन करें।'
                      : 'Stick to fresh, warm meals to keep digestion clear.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Apathya */}
            <div ref={apathyaRef} className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-red-50" style={{ opacity: 0 }}>
              <div className="bg-[#F87171] p-10 pb-12 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="bg-white/90 p-4 rounded-2xl shadow-sm">
                    <Ban className="text-[#F87171]" size={36} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">
                      {lang === 'hi' ? 'अपथ्य' : 'Apathya'}
                    </h3>
                    <span className="text-white/80 font-bold text-sm uppercase tracking-widest italic">
                      {lang === 'hi' ? 'न खाने योग्य आहार' : 'Foods to Avoid'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-10 -mt-6 bg-white rounded-t-[3rem] relative z-20 space-y-8">
                <div>
                  <h4 className="font-bold text-red-600 mb-3 flex items-center gap-2 text-base">
                    <XCircle size={22} className="text-[#F87171]" />
                    {lang === 'hi' ? 'हानिकारक आदतें एवं फास्ट फूड' : 'Harmful Habits & Fast Food'}
                  </h4>
                  <p className="text-slate-600 leading-relaxed pl-8 text-base">
                    {lang === 'hi'
                      ? 'शराब, तम्बाकू, सिगरेट, गुटखा। पिज्जा, बर्गर, चाउमीन, मैगी, पास्ता, चिप्स, कुरकुरे, बिस्किट, ब्रेड, चॉकलेट।'
                      : 'Alcohol, Tobacco, Cigarettes, Gutka. Pizza, Burgers, Chowmein, Maggi, Pasta, Chips, Kurkure, Biscuits, Bread, Chocolates.'}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-red-600 mb-3 flex items-center gap-2 text-base">
                    <XCircle size={22} className="text-[#F87171]" />
                    {lang === 'hi' ? 'भारी आहार एवं सब्जियाँ' : 'Heavy Foods & Veggies'}
                  </h4>
                  <p className="text-slate-600 leading-relaxed pl-8 text-base">
                    {lang === 'hi'
                      ? 'उड़द दाल, अरहर दाल, राजमा, छोले, चावल, पनीर। आलू, बैंगन, कटहल, अरबी। लाल मिर्च और तले हुए खाद्य पदार्थ।'
                      : 'Urad Dal, Arhar Dal, Rajma, Chickpeas, Rice, Paneer. Potatoes, Eggplant, Jackfruit, Colocasia. Red Chillies, and deep-fried foods.'}
                  </p>
                </div>
                <div className="p-6 bg-red-50 rounded-2xl flex gap-4 items-center border border-red-100">
                  <XCircle className="text-red-500 shrink-0 animate-pulse" size={24} />
                  <p className="text-sm leading-snug text-red-900">
                    <strong className="block text-base">
                      {lang === 'hi' ? 'अनिवार्य चेतावनी:' : 'Mandatory Warning:'}
                    </strong>
                    {lang === 'hi'
                      ? 'ये खाद्य पदार्थ आपके उपचार में काफी देरी करते हैं।'
                      : 'These foods significantly delay your healing.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default Services;
