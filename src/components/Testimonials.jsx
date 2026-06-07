// src/components/Testimonials.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

export default function Testimonials() {
  const { t } = useTranslation();
  const testimonials = t("testimonials.items", { returnObjects: true });
  const total = Array.isArray(testimonials) ? testimonials.length : 0;

  const [current, setCurrent] = useState(0);
  const intervalRef = useRef(null);

  const goNext = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const goPrev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  const startAuto = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, 3000);
  }, [goNext]);

  const stopAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [startAuto, stopAuto]);

  const getPos = (i) => {
    const p = (current - 1 + total) % total;
    const n = (current + 1) % total;
    if (i === current) return "center";
    if (i === p) return "left";
    if (i === n) return "right";
    return "hidden";
  };

  const posClass = {
    center: "left-1/2 -translate-x-1/2 scale-[1.15] opacity-100 z-20",
    left:   "left-[15%] -translate-x-1/2 scale-[0.85] opacity-50 z-10",
    right:  "left-[85%] -translate-x-1/2 scale-[0.85] opacity-50 z-10",
    hidden: "left-1/2 -translate-x-1/2 scale-75 opacity-0 z-0 pointer-events-none",
  };

  if (!Array.isArray(testimonials) || total === 0) return null;

  return (
    <section className="bg-[#f8faf9] py-20 text-center overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-4xl font-semibold text-[#0F4C5C]">
          {t("testimonials.heading")}
        </h2>
        <p className="text-gray-600 mt-4">
          {t("testimonials.subheading")}
        </p>
      </div>

      <div className="relative flex items-center justify-center mt-16">
        {/* Prev */}
        <button
          onClick={goPrev}
          aria-label="Previous testimonial"
          className="absolute left-4 z-30 text-3xl font-bold text-gray-500 hover:text-emerald-950 transition-colors select-none"
        >
          &#10094;
        </button>

        <div className="relative w-full max-w-[360px] sm:max-w-[600px] md:max-w-[900px] h-[350px] flex items-center justify-center">
          {testimonials.map((item, i) => (
            <div
              key={i}
              onMouseEnter={stopAuto}
              onMouseLeave={startAuto}
              className={`absolute w-[280px] bg-white rounded-xl shadow-lg px-6 py-8 text-center transition-all duration-500 ease-in-out cursor-pointer ${posClass[getPos(i)]}`}
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl select-none">
                  🌿
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm italic">"{item.text}"</p>
              <h6 className="font-semibold mt-4 text-emerald-900">{item.name}</h6>
              <small className="text-gray-500">{t("testimonials.role")}</small>
            </div>
          ))}
        </div>

        {/* Next */}
        <button
          onClick={goNext}
          aria-label="Next testimonial"
          className="absolute right-4 z-30 text-3xl font-bold text-gray-500 hover:text-emerald-950 transition-colors select-none"
        >
          &#10095;
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to testimonial ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-6 bg-emerald-700" : "w-2 bg-emerald-200 hover:bg-emerald-400"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
