// src/components/Header.jsx
// Fully i18n-enabled header with LanguageSwitcher

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, LogOut, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const { t } = useTranslation();

  // Nav links using translation keys for labels
  const navLinks = [
    { labelKey: "nav.home",     to: "/" },
    { labelKey: "nav.about",    to: "/about" },
    { labelKey: "nav.services", to: "/services" },
    { labelKey: "nav.doctors",  to: "/doctors" },
    { labelKey: "nav.products", to: "/products" },
    { labelKey: "nav.history",  to: "/history", authRequired: true },
    { labelKey: "nav.blog",     to: "/blogs" },
    { labelKey: "nav.contact",  to: "/contact" },
  ];

  const [scrolled, setScrolled]         = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [authOpen, setAuthOpen]         = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef     = useRef(null);
  const userMenuRef = useRef(null);
  const location    = useLocation();
  const { cartCount } = useCart();
  const { user, profile, signOut, isAdmin, isDoctor } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const dashboardLink = isAdmin ? "/admin-dashboard" : isDoctor ? "/doctor-dashboard" : null;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled ? "bg-white shadow-lg" : "bg-white/70 backdrop-blur-md"
        }`}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-2">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/SMAC_logo.png"
              alt={t("brand.logoAlt")}
              className="h-12 w-12 object-contain"
            />
            <div className="leading-tight">
              <p className="text-olive text-lg font-medium">{t("brand.name")}</p>
              <p className="text-olive text-sm tracking-wide">{t("brand.subtitle")}</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-olive">
            {navLinks.filter(l => !l.authRequired || user).map(({ labelKey, to }) => (
              <Link
                key={to}
                to={to}
                className={`transition-colors hover:text-primary ${
                  isActive(to) ? "text-primary font-semibold" : ""
                }`}
              >
                {t(labelKey)}
              </Link>
            ))}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Cart */}
            <Link
              to="/cart"
              className="relative hover:text-primary transition-colors"
              aria-label={t("nav.cartLabel")}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Auth area */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-full font-medium hover:bg-emerald-100 transition-colors text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                    {(profile?.full_name || user.email)?.[0]?.toUpperCase()}
                  </div>
                  {profile?.full_name?.split(' ')[0] || t("nav.account")}
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-10 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 w-48 z-50"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {profile?.full_name || t("nav.account")}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full capitalize">
                          {profile?.role || 'patient'}
                        </span>
                      </div>

                      {dashboardLink && (
                        <Link
                          to={dashboardLink}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                        >
                          <LayoutDashboard size={14} /> {t("nav.dashboard")}
                        </Link>
                      )}

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} /> {t("nav.signOut")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="bg-primary text-white px-5 py-2 rounded-full font-medium hover:bg-olive transition-colors"
              >
                {t("nav.registerLogin")}
              </button>
            )}
          </nav>

          {/* Mobile: Cart + Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/cart"
              className="relative text-olive"
              aria-label={t("nav.cartLabel")}
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              className="text-primary text-2xl"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t("nav.toggleMenu")}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            className="fixed top-[64px] left-0 right-0 bg-white z-50 shadow-xl md:hidden"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="px-6 py-6 space-y-4">
              {navLinks.filter(l => !l.authRequired || user).map(({ labelKey, to }) => (
                <Link
                  key={to}
                  to={to}
                  className={`block text-olive hover:text-primary transition-colors ${
                    isActive(to) ? "text-primary font-semibold" : ""
                  }`}
                >
                  {t(labelKey)}
                </Link>
              ))}

              {user ? (
                <>
                  {dashboardLink && (
                    <Link
                      to={dashboardLink}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 text-emerald-700 font-medium"
                    >
                      <LayoutDashboard size={16} /> {t("nav.dashboard")}
                    </Link>
                  )}
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                  <button
                    onClick={() => { setMenuOpen(false); handleSignOut(); }}
                    className="flex items-center gap-2 text-red-500 font-medium text-sm"
                  >
                    <LogOut size={16} /> {t("nav.signOut")}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMenuOpen(false); setAuthOpen(true); }}
                  className="block w-full text-center bg-primary text-white py-2 rounded-full font-medium hover:bg-olive transition-colors"
                >
                  {t("nav.registerLogin")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Header;
