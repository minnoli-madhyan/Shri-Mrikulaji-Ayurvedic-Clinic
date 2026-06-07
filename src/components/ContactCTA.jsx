// src/components/ContactCTA.jsx
import React, { useState } from "react";
import { Calendar, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import { useTranslation } from "react-i18next";

const ContactCTA = () => {
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
      <section
        className="py-14 text-white text-center relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1600&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-emerald-900/80" />
        <div className="max-w-3xl mx-auto px-4 relative z-10">

          <ShieldCheck className="mx-auto text-emerald-400 mb-3" size={34} />

          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">
            {t("cta.heading")}
          </h2>

          <p className="text-emerald-200/80 italic text-sm md:text-base mb-6">
            {t("cta.subheading")}
          </p>

          <button
            onClick={handleBookClick}
            className="inline-flex items-center gap-2 bg-white text-emerald-900 font-semibold px-6 py-3 rounded-full hover:bg-emerald-50 transition-colors shadow-md"
          >
            <Calendar size={18} />
            {t("cta.bookButton")}
          </button>

          <p className="mt-6 text-emerald-200/60 italic text-sm font-serif">
            {t("cta.tagline")}
          </p>

        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default ContactCTA;
