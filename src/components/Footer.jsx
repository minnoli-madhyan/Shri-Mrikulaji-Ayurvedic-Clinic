// src/components/Footer.jsx
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, MapPin, Phone, Clock, ArrowUp, Mail,
  ChevronRight, Heart, Shield, Award,
  Instagram, Facebook, Linkedin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '../hooks/useGSAP';

const Footer = () => {
  const { t } = useTranslation();
  const year      = new Date().getFullYear();
  const footerRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    const h = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useGSAP((gsap, ST) => {
    if (!footerRef.current) return;
    const cols = footerRef.current.querySelectorAll('.footer-col');
    gsap.fromTo(cols,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: footerRef.current, start: 'top 90%' } }
    );
    const badges = footerRef.current.querySelectorAll('.trust-badge');
    gsap.fromTo(badges,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, stagger: 0.1, duration: 0.4, ease: 'back.out(2)',
        scrollTrigger: { trigger: footerRef.current, start: 'top 88%' }, delay: 0.3 }
    );
  }, []);

  // Translated quick links array
  const quickLinks = [
    ['/', t('footer.quickLinks.links.home')],
    ['/about', t('footer.quickLinks.links.about')],
    ['/services', t('footer.quickLinks.links.services')],
    ['/doctors', t('footer.quickLinks.links.doctors')],
    ['/products', t('footer.quickLinks.links.products')],
    ['/appointment', t('footer.quickLinks.links.appointment')],
    ['/contact', t('footer.quickLinks.links.contact')],
  ];

  const specializations = t('footer.specializations.items', { returnObjects: true });

  const badges = [
    { icon: Shield, label: t('footer.badges.ayush') },
    { icon: Shield, label: t('footer.badges.nima') },
    { icon: Award,  label: t('footer.badges.since') },
  ];

  return (
    <>
      <footer ref={footerRef} className="bg-emerald-950 text-emerald-100">
        <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600"/>

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="footer-col">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="bg-emerald-700 p-2 rounded-lg">
                <Leaf className="text-white" size={20}/>
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{t('brand.name')}</p>
                <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-semibold">
                  {t('brand.subtitle')}
                </p>
              </div>
            </div>
            <p className="text-emerald-300/70 text-sm leading-relaxed mb-6">
              {t('footer.brand.tagline')}
            </p>
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <div
                  key={b.label}
                  className="trust-badge flex items-center gap-1.5 bg-emerald-900/60 border border-emerald-800 px-3 py-1.5 rounded-full text-xs text-emerald-300 font-medium"
                >
                  <b.icon size={12} className="text-emerald-400"/>{b.label}
                </div>
              ))}
            </div>
            {/* Social Media */}
            <div className="flex items-center gap-3 mt-5">
              <a href="https://www.instagram.com/shrimac.70?igsh=N3p3MmIyaGdqdDBj" target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-900/60 border border-emerald-800 text-emerald-400 hover:bg-pink-600 hover:border-pink-600 hover:text-white transition-all duration-200">
                <Instagram size={15}/>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61580725830547" target="_blank" rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-900/60 border border-emerald-800 text-emerald-400 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all duration-200">
                <Facebook size={15}/>
              </a>
              <a href="https://www.linkedin.com/company/shree-mrikulaji-ayurvedicclinic/" target="_blank" rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-900/60 border border-emerald-800 text-emerald-400 hover:bg-sky-600 hover:border-sky-600 hover:text-white transition-all duration-200">
                <Linkedin size={15}/>
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4 className="text-white font-bold text-base mb-6 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-emerald-500 inline-block rounded-full"/>
              {t('footer.clinic.heading')}
            </h4>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3 items-start">
                <MapPin size={16} className="text-emerald-400 mt-0.5 shrink-0"/>
                <a
                  href="https://www.google.com/maps/place/Shree+Mrikula+Ji+Ayurvedic+clinic/@23.3382838,70.416484,6z/data=!4m6!3m5!1s0x3974edce11457ca1:0xa0274c10a3c57f7a!8m2!3d27.6845285!4d78.3797649!16s%2Fg%2F11xgh3_p2s?entry=tts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-200/80 hover:text-white transition-colors whitespace-pre-line"
                >
                  {t('footer.clinic.address')}
                </a>
              </li>
              <li className="flex gap-3 items-center">
                <Phone size={16} className="text-emerald-400 shrink-0"/>
                <a href="tel:+919759991759" className="text-emerald-200/80 hover:text-white transition-colors">
                  {t('footer.clinic.phone')}
                </a>
              </li>
              <li className="flex gap-3 items-center">
                <Mail size={16} className="text-emerald-400 shrink-0"/>
                <a href="mailto:Shrimac.70@gmail.com" className="text-emerald-200/80 hover:text-white transition-colors break-all">
                  {t('footer.clinic.email')}
                </a>
              </li>
              <li className="flex gap-3 items-start">
                <Clock size={16} className="text-emerald-400 mt-0.5 shrink-0"/>
                <span className="text-emerald-200/80 whitespace-pre-line">
                  {t('footer.clinic.hours')}
                </span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="text-white font-bold text-base mb-6 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-emerald-500 inline-block rounded-full"/>
              {t('footer.quickLinks.heading')}
            </h4>
            <ul className="space-y-3 text-sm">
              {quickLinks.map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-emerald-300/70 hover:text-white transition-colors group"
                  >
                    <ChevronRight size={13} className="text-emerald-600 group-hover:text-emerald-400 transition-colors"/>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Specializations */}
          <div className="footer-col">
            <h4 className="text-white font-bold text-base mb-6 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-emerald-500 inline-block rounded-full"/>
              {t('footer.specializations.heading')}
            </h4>
            <ul className="space-y-2.5 text-sm mb-6">
              {Array.isArray(specializations) && specializations.map(s => (
                <li key={s}>
                  <Link
                    to="/services"
                    className="flex items-center gap-2 text-emerald-300/70 hover:text-emerald-300 transition-colors group cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 group-hover:bg-emerald-400 transition-colors"/>
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="bg-emerald-900/50 border border-emerald-800/60 rounded-2xl p-4">
              <p className="text-emerald-200/70 text-xs italic leading-relaxed">
                {t('footer.specializations.quote')}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-900/60 max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-emerald-400/60">
          <p>{t('footer.copyright', { year })}</p>
          <div className="flex gap-5">
            <Link to="/admin-dashboard" className="hover:text-emerald-300 transition-colors">
              {t('footer.adminPortal')}
            </Link>
            <Link to="/doctor-dashboard" className="hover:text-emerald-300 transition-colors">
              {t('footer.doctorPortal')}
            </Link>
          </div>
        </div>
      </footer>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-50 bg-emerald-700 text-white p-3.5 rounded-full shadow-2xl hover:bg-emerald-600 transition-colors duration-200 active:scale-90"
          aria-label={t('footer.scrollTop')}
        >
          <ArrowUp size={20}/>
        </button>
      )}
    </>
  );
};

export default Footer;
