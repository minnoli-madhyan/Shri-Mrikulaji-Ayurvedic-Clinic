// src/components/AboutAyurveda.jsx
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const AboutAyurveda = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-[#fcf3e8] py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-4xl font-semibold text-primary"
        >
          {t("about.heading")}
        </motion.h2>

        <p className="text-center text-gray-600 mt-4 max-w-2xl mx-auto">
          {t("about.principle")}
        </p>

        {/* Content */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Image */}
          <motion.div
            className="rounded-2xl shadow-lg overflow-hidden"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            whileHover={{ y: -6, scale: 1.02, boxShadow: "0 25px 50px rgba(0,0,0,0.18)" }}
          >
            <img
              src="/images/ayurveda.png"
              alt={t("about.imageAlt")}
              className="w-full h-[380px] object-contain bg-[#fcf3e8]"
            />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h3 className="text-2xl font-semibold text-primary mb-4">
              {t("about.subheading")}
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t("about.para1")}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {t("about.para2")}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutAyurveda;
