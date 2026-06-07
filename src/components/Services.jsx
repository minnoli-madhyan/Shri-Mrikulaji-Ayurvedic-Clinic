// src/components/Services.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Services = () => {
  const { t } = useTranslation();
  const services = t("services.items", { returnObjects: true });

  return (
    <section
      className="py-20 overflow-hidden relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1600&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-emerald-900/75 backdrop-blur-[1px]" />

      <div className="relative z-10">
        {/* Heading */}
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-4xl font-semibold text-white">
            {t("services.heading")}
          </h2>
          <p className="text-center text-emerald-200 mt-4 mb-12">
            {t("services.subheading")}
          </p>
        </div>

        {/* Full-width marquee */}
        <div className="w-screen overflow-hidden">
          <div className="marquee-track flex w-max gap-6 px-6">
            {Array.isArray(services) && [...services, ...services].map((service, index) => (
              <div
                key={index}
                className="
                  min-w-[260px] bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-5
                  shadow-md border border-white/30
                  text-primary font-medium text-center
                  transition-all duration-200
                  hover:bg-emerald-700 hover:text-white hover:border-emerald-600
                "
              >
                {service}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-14">
          <Link
            to="/services"
            className="
              bg-white text-emerald-900 px-8 py-3 rounded-full
              font-semibold transition hover:bg-emerald-50 shadow-lg
            "
          >
            {t("services.knowMore")}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Services;
