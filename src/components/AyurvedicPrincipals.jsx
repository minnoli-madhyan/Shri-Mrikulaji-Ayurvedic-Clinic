// src/components/AyurvedicPrincipals.jsx
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.2 },
  }),
};

const icons = ["🛡️", "🌿"];

const AyurvedicPrincipals = () => {
  const { t } = useTranslation();
  // Translation returns array of card objects
  const cards = t("principles.cards", { returnObjects: true });

  return (
    <section className="bg-[#F2F9F4] py-20 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Section heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-4xl font-semibold text-primary"
        >
          {t("principles.heading")}
        </motion.h2>

        {/* Shloka */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 mx-auto max-w-3xl text-center"
        >
          <p className="text-lg font-medium text-primary/80 italic leading-relaxed tracking-wide border-l-4 border-primary/30 pl-4 text-right whitespace-pre-line font-devanagari">
            {t("principles.shloka")}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {t("principles.shlokaTranslation")}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {Array.isArray(cards) && cards.map((card, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-md border border-primary/10 p-8 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="text-4xl">{icons[i]}</div>

              <h3 className="text-xl font-semibold text-primary leading-snug">
                {card.titleEn}
              </h3>

              <p className="text-base font-medium text-primary/60 italic font-devanagari">
                {card.titleHi}
              </p>

              <p className="text-gray-600 leading-relaxed text-sm">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default AyurvedicPrincipals;
