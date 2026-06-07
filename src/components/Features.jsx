// src/components/Features.jsx
import { motion } from "framer-motion";
import { HeartHandshake, Leaf, Sprout, HandCoins } from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = [HeartHandshake, Leaf, Sprout, HandCoins];

const Features = () => {
  const { t } = useTranslation();
  // returnObjects: true lets us get an array from the JSON
  const items = t("features.items", { returnObjects: true });

  return (
    <section className="bg-[#FFF8EC] py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.isArray(items) && items.map((item, index) => {
            const Icon = icons[index];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="
                  group bg-white rounded-2xl p-8
                  transition-transform transition-shadow transition-colors
                  duration-300 ease-out
                  hover:bg-emerald-900 hover:text-white
                  hover:-translate-y-[6px] hover:scale-[1.05]
                  hover:shadow-[0_20px_40px_rgba(0,0,0,0.536)]
                "
              >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <Icon
                    className="
                      w-14 h-14 text-primary
                      transition-transform transition-colors duration-200
                      group-hover:text-accent
                      group-hover:scale-110
                    "
                  />
                </div>

                {/* Title */}
                <h4
                  className="
                    text-lg font-semibold text-primary mb-3 text-center
                    transition-colors duration-200
                    group-hover:text-white
                  "
                >
                  {item.title}
                </h4>

                {/* Description */}
                <p
                  className="
                    text-sm text-gray-600 leading-relaxed text-center
                    transition-colors duration-200
                    group-hover:text-white
                  "
                >
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
