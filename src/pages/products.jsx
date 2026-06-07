// src/pages/products.jsx — Fully bilingual (EN + HI) with react-i18next + Supabase
// FIX: Removed all hardcoded product data (STATIC_FEATURED, STATIC_CATEGORIES).
//      All products — including Chandraprabha Vati Special — now come exclusively
//      from the `products` table and respect the `is_active` flag.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Shield, Star, Leaf, CheckCircle,
  Search, X, Plus, Minus, Lock, MapPin,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import AuthModal from '../components/AuthModal';
import { getProductImageUrl } from '../lib/productStorage';

// ── Indian states list (kept in JS — not translated; official names are in EN) ──
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman & Nicobar Islands','Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu','Delhi','Jammu & Kashmir','Ladakh',
  'Lakshadweep','Puducherry',
];

const EMPTY_ADDR = {
  full_name: '', mobile: '', pincode: '', flat: '',
  area: '', landmark: '', city: '', state: '',
};

const parseAddress = (raw) => {
  if (!raw) return EMPTY_ADDR;
  try { return { ...EMPTY_ADDR, ...JSON.parse(raw) }; }
  catch { return { ...EMPTY_ADDR, flat: raw }; }
};

// ── Build category map from DB rows ──────────────────────────
const buildCategoriesFromDB = (products) => {
  const map = {};
  products.forEach((p) => {
    const cat = p.category || 'General';
    if (!map[cat]) map[cat] = { title: cat, title_hi: p.category_hi || cat, products: [] };
    map[cat].products.push(p);
  });
  return Object.values(map);
};

// ── Field + inputCls (outside component to prevent remount) ──
const Field = ({ label, id, required, children, hint, errors }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !errors[id] && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    {errors[id] && <p className="text-xs text-red-500 mt-0.5">{errors[id]}</p>}
  </div>
);

const inputCls = (k, errors) =>
  `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
    errors[k] ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-olive/30 focus:border-olive'
  }`;

// ── Address Modal ─────────────────────────────────────────────
const AddressModal = ({ onSave, onClose, existingRaw }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(parseAddress(existingRaw));
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    const p = t('products');
    if (!form.full_name.trim())  e.full_name = p.validation.nameRequired;
    if (!form.mobile.trim())     e.mobile    = p.validation.mobileRequired;
    if (!/^\d{10}$/.test(form.mobile.trim())) e.mobile = p.validation.mobileInvalid;
    if (!form.pincode.trim())    e.pincode   = p.validation.pincodeRequired;
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = p.validation.pincodeInvalid;
    if (!form.flat.trim())       e.flat      = p.validation.flatRequired;
    if (!form.area.trim())       e.area      = p.validation.areaRequired;
    if (!form.city.trim())       e.city      = p.validation.cityRequired;
    if (!form.state)             e.state     = p.validation.stateRequired;
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(JSON.stringify(form));
  };

  const isEditing = !!existingRaw;
  const addr = t('products.address', { returnObjects: true });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={isEditing ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col"
        >
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#e6f0ec] flex items-center justify-center">
              <MapPin size={18} className="text-olive" />
            </div>
            <div>
              <h2 className="text-lg font-black text-primary">
                {isEditing ? addr.modalEdit : addr.modalTitle}
              </h2>
              <p className="text-xs text-olive/60">
                {isEditing ? addr.modalEditSubtitle : addr.modalSubtitle}
              </p>
            </div>
            {isEditing && (
              <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600" aria-label={t('products.address.cancel')}>
                <X size={20} />
              </button>
            )}
          </div>

          <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
            <Field label={addr.country} id="country" required={false} hint={null} errors={errors}>
              <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-500">
                India 🇮🇳
              </div>
            </Field>
            <Field label={addr.fullName} id="full_name" required hint={null} errors={errors}>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="" className={inputCls('full_name', errors)} />
            </Field>
            <Field label={addr.mobile} id="mobile" required hint={addr.mobileHint} errors={errors}>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                placeholder="" maxLength={10} className={inputCls('mobile', errors)} />
            </Field>
            <Field label={addr.pincode} id="pincode" required hint={null} errors={errors}>
              <input value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))}
                placeholder="" maxLength={6} className={inputCls('pincode', errors)} />
            </Field>
            <Field label={addr.flat} id="flat" required hint={null} errors={errors}>
              <input value={form.flat} onChange={e => set('flat', e.target.value)}
                placeholder="" className={inputCls('flat', errors)} />
            </Field>
            <Field label={addr.area} id="area" required hint={null} errors={errors}>
              <input value={form.area} onChange={e => set('area', e.target.value)}
                placeholder="" className={inputCls('area', errors)} />
            </Field>
            <Field label={addr.landmark} id="landmark" required={false} hint={null} errors={errors}>
              <input value={form.landmark} onChange={e => set('landmark', e.target.value)}
                placeholder={addr.landmarkPlaceholder} className={inputCls('landmark', errors)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={addr.city} id="city" required hint={null} errors={errors}>
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  placeholder="" className={inputCls('city', errors)} />
              </Field>
              <Field label={addr.state} id="state" required hint={null} errors={errors}>
                <select value={form.state} onChange={e => set('state', e.target.value)}
                  className={inputCls('state', errors)}>
                  <option value="">{addr.stateDefault}</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-slate-100 shrink-0 flex gap-3">
            {isEditing && (
              <button onClick={onClose}
                className="flex-1 py-3 rounded-full border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                {addr.cancel}
              </button>
            )}
            <button onClick={handleSave}
              className="flex-1 py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-olive transition-colors flex items-center justify-center gap-2">
              <MapPin size={15} />
              {isEditing ? addr.updateBtn : addr.saveBtn}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Main Component ────────────────────────────────────────────
const ProductPage = () => {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const { addToCart, updateQty, cart } = useCart();
  const { user } = useAuth();
  const { products: dbProducts, loading } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [authOpen, setAuthOpen] = useState(false);

  // Resolve bilingual field from a product row
  const field = (product, key) => {
    const hiKey = `${key}_hi`;
    if (isHindi && product[hiKey]) return product[hiKey];
    return product[key] ?? '';
  };

  // ── Featured product: first DB product with category === 'Featured'
  //    (or the one named 'Chandraprabha Vati Special' if no explicit Featured category).
  //    Falls back to null — never uses hardcoded data.
  const featuredProduct = dbProducts.find(p =>
    p.category === 'Featured' || p.name === 'Chandraprabha Vati Special'
  ) || null;

  // All non-featured products, grouped into categories
  const nonFeaturedProducts = dbProducts.filter(p => p !== featuredProduct);
  const rawCategories = buildCategoriesFromDB(nonFeaturedProducts);

  const getQty = (id) => { const item = cart.find((c) => c.id === id); return item ? item.qty : 0; };

  const handleAddToCart = (product) => {
    if (!user) { setAuthOpen(true); return; }
    addToCart(product);
  };

  const Stepper = ({ qty, id, variant = 'grid', product }) => {
    const isFeatured = variant === 'featured';
    return (
      <div className={`flex items-center justify-between w-full px-6 py-4 rounded-${isFeatured ? 'full' : 'xl'} border-2 ${isFeatured ? 'bg-primary border-primary text-white shadow-lg' : 'border-primary text-primary bg-white'}`}>
        <button
          onClick={() => updateQty(id, qty - 1)}
          aria-label={t('cart.item.decreaseQty')}
          className={`hover:scale-110 transition-transform ${isFeatured ? 'text-white' : 'text-primary'}`}>
          <Minus size={isFeatured ? 20 : 18} strokeWidth={3} />
        </button>
        <span className="font-bold text-lg">{qty}</span>
        <button
          onClick={() => addToCart(product)}
          aria-label={t('cart.item.increaseQty')}
          className={`hover:scale-110 transition-transform ${isFeatured ? 'text-white' : 'text-primary'}`}>
          <Plus size={isFeatured ? 20 : 18} strokeWidth={3} />
        </button>
      </div>
    );
  };

  // Search across EN and HI fields simultaneously so search works in either language
  const matchesSearch = (p, catTitle, catTitleHi) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.name_hi || '').toLowerCase().includes(q) ||
      (p.headline || '').toLowerCase().includes(q) ||
      (p.headline_hi || '').toLowerCase().includes(q) ||
      (p.description || p.desc || '').toLowerCase().includes(q) ||
      (p.description_hi || '').toLowerCase().includes(q) ||
      (catTitle || '').toLowerCase().includes(q) ||
      (catTitleHi || '').toLowerCase().includes(q)
    );
  };

  const filteredCategories = rawCategories
    .map((cat) => ({
      ...cat,
      products: cat.products.filter((p) => matchesSearch(p, cat.title, cat.title_hi)),
    }))
    .filter((cat) => cat.products.length > 0);

  const featuredMatchesSearch =
    !featuredProduct
      ? false
      : searchQuery === '' || matchesSearch(featuredProduct, 'Featured', 'विशेष');

  const p = t('products', { returnObjects: true });

  return (
    <div className="min-h-screen bg-[#e6f0ec] text-primary font-sans">

      <header className="pt-24 pb-12 px-6 text-center max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
            {p.hero.heading}
          </h1>
          <p className="text-lg md:text-xl opacity-60 mb-6 leading-relaxed">
            {p.hero.subheading}
          </p>

          {!user && (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-full mb-6 flex-wrap justify-center">
              <Lock size={14} />
              <span>
                {p.hero.loginNotice}{' '}
                <button onClick={() => setAuthOpen(true)} className="font-bold underline underline-offset-2">
                  {p.hero.loginLink}
                </button>
                {p.hero.loginNoticeSuffix && ` ${p.hero.loginNoticeSuffix}`}
              </span>
            </div>
          )}

          <div className="relative max-w-xl mx-auto group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-olive transition-colors" size={20} aria-hidden="true" />
            <input
              type="text"
              placeholder={p.hero.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={p.hero.searchPlaceholder}
              className="w-full pl-14 pr-12 py-4 rounded-2xl border border-accent/60 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-olive/5 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label={p.hero.clearSearch}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-950 transition-colors">
                <X size={20} />
              </button>
            )}
          </div>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24">

        {/* ── Featured Product ── Only rendered when DB returns a featured product AND it's active */}
        {!loading && featuredProduct && featuredMatchesSearch && (() => {
          const featuredImgUrl = getProductImageUrl(featuredProduct.image_url);
          return (
            <div className="max-w-5xl mx-auto mb-24">
              <motion.div
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-white rounded-[2.5rem] shadow-xl border border-accent/40 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row"
              >
                {/* ── Text content ── */}
                <div className="flex-1 p-8 md:p-14">
                  <div className="flex flex-wrap gap-2 mb-8">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 bg-cream rounded-full border border-accent text-olive flex items-center gap-1.5">
                      <Shield size={12} aria-hidden="true" /> {p.badges.natural}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 bg-cream rounded-full border border-accent text-olive flex items-center gap-1.5">
                      <Star size={12} aria-hidden="true" /> {p.badges.topRated}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black mb-3 leading-tight">
                    {field(featuredProduct, 'name')}
                  </h2>
                  <p className="text-xl font-bold italic mb-8 text-olive leading-snug">
                    {field(featuredProduct, 'headline')}
                  </p>
                  <p className="text-sm md:text-base opacity-75 leading-relaxed mb-10">
                    {field(featuredProduct, 'description')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                      <CheckCircle size={20} className="text-olive shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs leading-snug">
                        <strong>{p.featured.benefit1Title}</strong> {p.featured.benefit1Desc}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                      <CheckCircle size={20} className="text-olive shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs leading-snug">
                        <strong>{p.featured.benefit2Title}</strong> {p.featured.benefit2Desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-8">
                    <div className="w-full sm:w-auto min-w-[240px]">
                      {getQty(featuredProduct.id) > 0 ? (
                        <Stepper qty={getQty(featuredProduct.id)} id={featuredProduct.id} variant="featured" product={featuredProduct} />
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => handleAddToCart(featuredProduct)}
                          aria-label={user ? p.card.addToCart : p.card.loginToAdd}
                          className="w-full px-12 py-4 rounded-full font-bold text-white shadow-lg bg-primary hover:bg-olive transition-colors flex items-center justify-center gap-3"
                        >
                          {user ? <ShoppingCart size={20} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}
                          {user ? p.card.addToCart : p.card.loginToAdd}
                        </motion.button>
                      )}
                    </div>
                    <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest text-center">
                      {p.featured.dosageLabel}
                    </p>
                  </div>
                </div>

                {/* ── Image panel ── */}
                {featuredImgUrl ? (
                  <div className="w-full h-72 md:w-[40%] md:h-auto border-t md:border-t-0 md:border-l border-accent/30 shrink-0">
                    <img
                      src={featuredImgUrl}
                      alt={field(featuredProduct, 'name')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="hidden md:flex w-[40%] shrink-0 items-center justify-center bg-cream/20 border-l border-accent/30">
                    <Leaf size={120} className="text-olive/10" aria-hidden="true" />
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}

        {/* ── Loading ── */}
        {loading && (
          <div className="text-center py-20 opacity-50">
            <p className="text-lg font-medium animate-pulse">{p.loading}</p>
          </div>
        )}

        {/* ── Category Grids ── */}
        {!loading && (
          <div className="space-y-20">
            <AnimatePresence>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => {
                  const catTitle = isHindi && cat.title_hi ? cat.title_hi : cat.title;
                  return (
                    <motion.section key={cat.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex items-center justify-center gap-6 mb-10">
                        <div className="h-px flex-1 bg-accent/40 hidden md:block" aria-hidden="true" />
                        <h3 className="text-2xl font-bold px-4 text-olive text-center leading-snug">
                          {catTitle}
                        </h3>
                        <div className="h-px flex-1 bg-accent/40 hidden md:block" aria-hidden="true" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {cat.products.map((product) => {
                          const imgUrl = getProductImageUrl(product.image_url);
                          return (
                            <motion.div
                              key={product.id} layout whileHover={{ y: -8 }}
                              className="bg-white p-8 rounded-[2rem] border border-accent/50 flex flex-col justify-between hover:shadow-2xl hover:border-olive/20 transition-all duration-500"
                            >
                              {/* Product image if available */}
                              {imgUrl && (
                                <div className="w-full h-40 mb-5 rounded-2xl overflow-hidden bg-cream/30">
                                  <img
                                    src={imgUrl}
                                    alt={field(product, 'name')}
                                    className="w-full h-full object-contain"
                                    onError={e => { e.target.parentElement.style.display = 'none'; }}
                                  />
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-xl mb-1.5 leading-snug">
                                  {field(product, 'name')}
                                </h4>
                                <p className="text-xs font-bold mb-5 uppercase tracking-wider text-olive leading-snug">
                                  {field(product, 'headline')}
                                </p>
                                <p className="text-sm opacity-70 leading-relaxed mb-4">
                                  {field(product, 'description')}
                                </p>
                                {product.price != null && (
                                  <p className="text-lg font-black text-olive mb-4">
                                    ₹{Number(product.price).toLocaleString('en-IN')}
                                  </p>
                                )}
                              </div>
                              <div className="h-[56px] flex items-end">
                                {getQty(product.id) > 0 ? (
                                  <Stepper qty={getQty(product.id)} id={product.id} product={product} />
                                ) : (
                                  <button
                                    onClick={() => handleAddToCart(product)}
                                    aria-label={`${user ? p.card.addToCart : p.card.loginToAdd}: ${field(product, 'name')}`}
                                    className="w-full py-4 rounded-xl border-2 font-bold transition-all border-primary text-primary hover:bg-primary hover:text-white flex items-center justify-center gap-2"
                                  >
                                    {user ? <ShoppingCart size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
                                    {user ? p.card.addToCart : p.card.loginToAdd}
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.section>
                  );
                })
              ) : (
                !featuredProduct ? (
                  /* No products in DB at all */
                  <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-accent/40">
                    <p className="text-gray-400 font-medium italic">
                      {searchQuery
                        ? t('products.empty.noResults', { query: searchQuery })
                        : (p.empty?.noProducts || 'No products available yet.')}
                    </p>
                  </div>
                ) : searchQuery ? (
                  /* Typed a search term that matched nothing in categories (but may have matched featured) */
                  <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-accent/40">
                    <p className="text-gray-400 font-medium italic">
                      {t('products.empty.noResults', { query: searchQuery })}
                    </p>
                  </div>
                ) : null
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      <footer className="py-16 text-center border-t border-accent/20 opacity-40 text-[11px] font-bold tracking-[0.3em] uppercase">
        {p.footer}
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

export default ProductPage;
