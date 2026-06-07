// src/components/Hero.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ShoppingBag } from "lucide-react";
import heroImg from "/images/hero.jpg";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import { useTranslation } from "react-i18next";

/* ================= COUNTER COMPONENT ================= */
const Counter = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return (
    <>
      {count.toLocaleString()}
      {suffix}
    </>
  );
};

/* ================= HERO COMPONENT ================= */
const Hero = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  const handleBookClick = () => {
    if (!user) {
      setAuthOpen(true);
    } else {
      navigate("/appointment");
    }
  };

  return (
    <>
      <section className="relative min-h-screen overflow-hidden">

        {/* Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/55 z-10" />

        {/* Content */}
        <div className="relative z-20 min-h-screen flex items-center justify-center">
          <div className="text-center px-6 max-w-4xl">

            {/* Badge */}
            <span className="inline-block mb-6 px-5 py-1.5 rounded-full bg-white/10 border border-white/25 text-[#d4c5c5] text-sm font-semibold tracking-widest uppercase backdrop-blur-sm">
              {t("hero.badge")}
            </span>

            <h1 className="text-white text-4xl md:text-5xl font-bold mb-5 leading-tight">
              {t("hero.headline")}
              <br className="hidden md:block" />
              {t("hero.headlineCont")}
            </h1>

            <p className="text-gray-200 font-medium text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              {t("hero.subheading")}
            </p>

            {/* Dual CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleBookClick}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/40 text-white px-8 py-3.5 rounded-full text-base font-bold transition-colors backdrop-blur-sm w-full sm:w-auto justify-center"
              >
                <Calendar size={18} />
                {t("hero.bookAppointment")}
              </button>

              <Link
                to="/products"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/40 text-white px-8 py-3.5 rounded-full text-base font-bold transition-colors backdrop-blur-sm w-full sm:w-auto justify-center"
              >
                <ShoppingBag size={18} />
                {t("hero.exploreProducts")}
              </Link>
            </div>

            {/* Trust Bar */}
            <div className="mt-14 flex flex-wrap justify-center gap-10 text-white/70 text-sm">

              <div className="text-center">
                <p className="text-2xl font-black text-white">
                  <Counter end={50} suffix="+" />
                </p>
                <p className="text-xs uppercase tracking-wider mt-1 opacity-70">
                  {t("hero.stats.yearsLabel")}
                </p>
              </div>

              <div className="text-center">
                <p className="text-2xl font-black text-white">
                  <Counter end={500000} suffix="+" />
                </p>
                <p className="text-xs uppercase tracking-wider mt-1 opacity-70">
                  {t("hero.stats.patientsLabel")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
};

export default Hero;
