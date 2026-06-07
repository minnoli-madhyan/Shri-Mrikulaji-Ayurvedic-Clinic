// src/pages/Cart.jsx — Fully bilingual (EN + HI) with react-i18next

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Trash2, Plus, Minus, Leaf, ArrowLeft,
  MapPin, User, Phone, X, CheckCircle,
  Banknote, Smartphone, ChevronLeft, Package, Loader2,
  AlertCircle, ArrowRight,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { sendAdminOrderAlert } from "../lib/whatsapp";

// ── helpers ───────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman & Nicobar Islands','Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu','Delhi','Jammu & Kashmir','Ladakh',
  'Lakshadweep','Puducherry',
];

const EMPTY_ADDR = { full_name: '', mobile: '', pincode: '', flat: '', area: '', landmark: '', city: '', state: '' };

const parseAddress = (raw) => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return { flat: raw }; }
};

const inputCls = (k, errors) =>
  `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
    errors[k] ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-olive/30 focus:border-olive'
  }`;

// ── Checkout Popup ────────────────────────────────────────────
const CheckoutPopup = ({ cart, cartTotal, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const co = t('cart.checkout', { returnObjects: true });
  const isHindi = i18n.language === 'hi';

  const { deliveryAddress, saveAddress } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState(deliveryAddress ? 'payment' : 'address');
  const [addr, setAddr] = useState(() => parseAddress(deliveryAddress) || { ...EMPTY_ADDR });
  const [addrErrors, setAddrErrors] = useState({});
  const [payMethod, setPayMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);

  const setField = (k, v) => { setAddr(p => ({ ...p, [k]: v })); setAddrErrors(p => ({ ...p, [k]: '' })); };

  const validateAddr = () => {
    const v = co.validation;
    const e = {};
    if (!addr.full_name.trim()) e.full_name = v.nameRequired;
    if (!/^\d{10}$/.test(addr.mobile.trim())) e.mobile = v.mobileInvalid;
    if (!/^\d{6}$/.test(addr.pincode.trim())) e.pincode = v.pincodeInvalid;
    if (!addr.flat.trim()) e.flat = v.flatRequired;
    if (!addr.area.trim()) e.area = v.areaRequired;
    if (!addr.city.trim()) e.city = v.cityRequired;
    if (!addr.state) e.state = v.stateRequired;
    return e;
  };

  const handleAddrContinue = async () => {
    const e = validateAddr();
    if (Object.keys(e).length) { setAddrErrors(e); return; }
    await saveAddress(JSON.stringify(addr));
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setStep('processing');

    const items = cart.map(({ id, name, price, qty }) => ({ id, name, price: price || 0, qty }));

    let inserted = false;
    const { error } = await supabase.from('orders').insert([{
      user_id: user?.id ?? null,
      items,
      total: cartTotal || 0,
      status: 'pending',
      delivery_address: JSON.stringify(addr),
      payment_method: payMethod,
      payment_info: payMethod === 'upi' ? 'UPI via WhatsApp QR' : 'Cash on Delivery',
    }]);
    if (!error) { inserted = true; }

    if (!inserted) {
      const { error: e2 } = await supabase.from('orders').insert([{
        user_id: user?.id ?? null, items, total: cartTotal || 0, status: 'pending',
      }]);
      if (e2) { alert('Could not place order: ' + e2.message); setPlacing(false); setStep('payment'); return; }
    }

    setPlacing(false);

    const orderId = '#' + Date.now().toString(36).toUpperCase();
    const itemsSummary = (() => {
      const first = items[0];
      const rest  = items.length - 1;
      const label = `${first.name} ×${first.qty}`;
      return rest > 0 ? `${label} + ${rest} more item${rest > 1 ? 's' : ''}` : label;
    })();
    sendAdminOrderAlert({
      customerName: addr.full_name,
      phone:        addr.mobile,
      orderId,
      items:        itemsSummary,
      total:        '₹' + (cartTotal || 0).toLocaleString('en-IN'),
    });

    await onSuccess();
    setStep('success');
  };

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const af = co.addressFields;

  // Item count string
  const itemCountStr = totalItems === 1
    ? co.itemCount.replace('{{count}}', totalItems)
    : co.itemCountPlural.replace('{{count}}', totalItems);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={co.title[step] || ''}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'payment' && (
              <button onClick={() => setStep('address')} className="text-slate-400 hover:text-slate-600 mr-1" aria-label={co.backToAddress}>
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-black text-primary leading-snug">
                {co.title[step]}
              </h2>
              {(step === 'address' || step === 'payment') && (
                <p className="text-xs text-slate-400">
                  {co.stepLabel.replace('{{step}}', step === 'address' ? '1' : '2')} ·{' '}
                  <span className="text-olive font-semibold">{itemCountStr}</span>
                </p>
              )}
            </div>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label={co.close}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* ── STEP 1: Address ── */}
        {step === 'address' && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{co.country}</label>
                <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400">India 🇮🇳</div>
              </div>

              {[
                { k: 'full_name', label: af.fullName,  placeholder: '' },
                { k: 'mobile',   label: af.mobile,    placeholder: '' },
                { k: 'pincode',  label: af.pincode,   placeholder: '' },
                { k: 'flat',     label: af.flat,      placeholder: '' },
                { k: 'area',     label: af.area,      placeholder: '' },
                { k: 'landmark', label: af.landmark,  placeholder: '', req: false },
              ].map(({ k, label, placeholder, req = true }) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {label}{req && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    value={addr[k]}
                    onChange={e => setField(k, k === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                    maxLength={k === 'mobile' ? 10 : k === 'pincode' ? 6 : undefined}
                    placeholder={placeholder}
                    aria-label={label}
                    className={inputCls(k, addrErrors)}
                  />
                  {addrErrors[k] && <p className="text-xs text-red-500 mt-0.5" role="alert">{addrErrors[k]}</p>}
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {af.city}<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input value={addr.city} onChange={e => setField('city', e.target.value)} aria-label={af.city} className={inputCls('city', addrErrors)} />
                  {addrErrors.city && <p className="text-xs text-red-500 mt-0.5" role="alert">{addrErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {af.state}<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <select value={addr.state} onChange={e => setField('state', e.target.value)} aria-label={af.state} className={inputCls('state', addrErrors)}>
                    <option value="">{af.stateDefault}</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {addrErrors.state && <p className="text-xs text-red-500 mt-0.5" role="alert">{addrErrors.state}</p>}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-slate-100 shrink-0">
              <button onClick={handleAddrContinue}
                className="w-full py-3.5 rounded-full bg-primary text-white font-bold text-sm hover:bg-olive transition-colors flex items-center justify-center gap-2">
                {co.continueBtn} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Payment ── */}
        {step === 'payment' && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Address summary */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1">
                  <MapPin size={10} aria-hidden="true" /> {co.deliveredTo}
                </p>
                <p className="text-sm font-bold text-slate-800">{addr.full_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{addr.mobile}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {[addr.flat, addr.area, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                </p>
                <button onClick={() => setStep('address')} className="text-[11px] text-emerald-700 font-bold mt-2 hover:underline">
                  {co.changeAddress}
                </button>
              </div>

              {/* Items summary */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">{co.orderItems}</p>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate max-w-[220px]">
                        {item.name} <span className="text-slate-400">×{item.qty}</span>
                      </span>
                      <span className="font-semibold text-slate-800 shrink-0 ml-4">
                        {item.price ? `₹${(item.price * item.qty).toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                  ))}
                  {cartTotal > 0 && (
                    <div className="flex justify-between font-black text-primary border-t border-slate-100 pt-2 mt-1">
                      <span>{t('cart.summary.total')}</span>
                      <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment options */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{co.paymentHeading}</p>

                {/* COD */}
                <button onClick={() => setPayMethod('cod')}
                  role="radio" aria-checked={payMethod === 'cod'}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${payMethod === 'cod' ? 'border-primary bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${payMethod === 'cod' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Banknote size={20} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{co.cod.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{co.cod.subtitle}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${payMethod === 'cod' ? 'border-primary' : 'border-slate-300'}`}>
                    {payMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </button>

                {/* UPI */}
                <button onClick={() => setPayMethod('upi')}
                  role="radio" aria-checked={payMethod === 'upi'}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${payMethod === 'upi' ? 'border-primary bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${payMethod === 'upi' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Smartphone size={20} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{co.upi.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{co.upi.subtitle}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${payMethod === 'upi' ? 'border-primary' : 'border-slate-300'}`}>
                    {payMethod === 'upi' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </button>

                {/* UPI WhatsApp QR notice */}
                <AnimatePresence>
                  {payMethod === 'upi' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5">
                        <Smartphone size={14} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-xs text-emerald-800 leading-relaxed">{co.upi.whatsappNotice}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {payMethod === 'cod' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-xs text-amber-700">{co.cod.notice}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-slate-100 shrink-0">
              <button onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-full bg-primary text-white font-bold text-sm hover:bg-olive transition-colors flex items-center justify-center gap-2">
                <Package size={16} aria-hidden="true" />
                {payMethod === 'cod' ? co.confirmCod : co.confirmUpi}
              </button>
            </div>
          </>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center" aria-live="polite" aria-busy="true">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Loader2 size={48} className="text-primary" aria-hidden="true" />
            </motion.div>
            <p className="text-lg font-bold text-slate-700 mt-6">{co.processing.heading}</p>
            <p className="text-sm text-slate-400 mt-2">{co.processing.subtext}</p>
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center" aria-live="polite">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 200 }}>
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle size={44} className="text-emerald-600" aria-hidden="true" />
              </div>
            </motion.div>
            <h3 className="text-2xl font-black text-primary mt-6 mb-2">{co.success.heading}</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
              {co.success.message}{' '}
              <span className="font-bold text-slate-700">{addr.mobile}</span>{' '}
              {co.success.messageSuffix}
            </p>
            {payMethod === 'upi' && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 max-w-xs">
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {co.upi.whatsappNotice}
                </p>
              </div>
            )}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/history" onClick={onClose}
                className="px-6 py-2.5 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary hover:text-white transition-colors">
                {co.success.viewOrders}
              </Link>
              <Link to="/products" onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:bg-olive transition-colors">
                {co.success.shopMore}
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ── Main Cart ─────────────────────────────────────────────────
const Cart = () => {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';
  const c = t('cart', { returnObjects: true });

  const { cart, removeFromCart, updateQty, clearCart, deliveryAddress, cartTotal } = useCart();
  const { user } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const addr = parseAddress(deliveryAddress);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  // Resolve bilingual product field in cart items
  const cartItemName = (item) => {
    if (isHindi && item.name_hi) return item.name_hi;
    return item.name;
  };
  const cartItemHeadline = (item) => {
    if (isHindi && item.headline_hi) return item.headline_hi;
    return item.headline;
  };

  return (
    <div className="min-h-screen bg-[#e6f0ec] pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center gap-4 mb-10">
          <Link to="/products" className="flex items-center gap-2 text-olive hover:text-primary transition-colors text-sm font-medium">
            <ArrowLeft size={18} aria-hidden="true" /> {c.continueShopping}
          </Link>
        </div>

        <h1 className="text-4xl font-black text-primary mb-2">{c.heading}</h1>
        <p className="text-sm text-olive/70 mb-10">
          {cart.length > 0
            ? c.itemCount.replace('{{count}}', cart.length)
            : c.empty.heading}
        </p>

        {cart.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border border-accent/40 p-16 text-center">
            <Leaf size={80} className="text-olive/10 mx-auto mb-6" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-primary mb-3">{c.empty.heading}</h2>
            <p className="text-olive/60 mb-8 text-sm">{c.empty.subtext}</p>
            <Link to="/products"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-semibold hover:bg-olive transition-colors">
              <ShoppingCart size={18} aria-hidden="true" /> {c.empty.browseBtn}
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">

            {/* Items */}
            <div className="md:col-span-2 space-y-4">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }} transition={{ duration: 0.25 }}
                    className="bg-white rounded-2xl border border-accent/40 p-5 flex items-start gap-5">
                    <div className="w-16 h-16 rounded-xl bg-[#e6f0ec] flex items-center justify-center shrink-0">
                      <Leaf size={28} className="text-olive/40" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-primary truncate">{cartItemName(item)}</h3>
                      <p className="text-xs text-olive/60 uppercase tracking-wider mt-0.5 mb-1 line-clamp-1">
                        {cartItemHeadline(item)}
                      </p>
                      {item.price != null && (
                        <p className="text-sm font-black text-olive mb-3">₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          aria-label={c.item.decreaseQty}
                          className="w-8 h-8 rounded-full border-2 border-accent flex items-center justify-center text-olive hover:border-primary hover:text-primary transition-colors">
                          <Minus size={14} aria-hidden="true" />
                        </button>
                        <span className="font-bold text-primary w-6 text-center" aria-label={`Quantity: ${item.qty}`}>{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          aria-label={c.item.increaseQty}
                          className="w-8 h-8 rounded-full border-2 border-accent flex items-center justify-center text-olive hover:border-primary hover:text-primary transition-colors">
                          <Plus size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`${c.item.removeLabel}: ${cartItemName(item)}`}
                      className="text-gray-300 hover:text-red-400 transition-colors mt-1">
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 transition-colors mt-2">
                {c.item.clearAll}
              </button>
            </div>

            {/* Summary */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-accent/40 p-6 h-fit sticky top-24 space-y-5">
              <h2 className="font-bold text-xl text-primary">{c.summary.heading}</h2>

              {/* Address preview */}
              <div className="bg-[#e6f0ec] rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-olive/60 flex items-center gap-1 mb-2">
                  <MapPin size={10} aria-hidden="true" /> {c.summary.deliverTo}
                </p>
                {addr ? (
                  <div className="space-y-1">
                    {addr.full_name && (
                      <div className="flex items-center gap-1.5">
                        <User size={11} className="text-olive shrink-0" aria-hidden="true" />
                        <p className="text-xs font-bold text-primary">{addr.full_name}</p>
                      </div>
                    )}
                    {addr.mobile && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-olive shrink-0" aria-hidden="true" />
                        <p className="text-xs text-olive/80">{addr.mobile}</p>
                      </div>
                    )}
                    <div className="flex items-start gap-1.5 pt-0.5">
                      <MapPin size={11} className="text-olive shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs text-olive/80 leading-snug">
                        {[addr.flat, addr.area, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">{c.summary.addressPlaceholder}</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-olive/70">
                  <span>{c.summary.items}</span><span>{totalItems}</span>
                </div>
                {cartTotal > 0 ? (
                  <>
                    <div className="flex justify-between text-olive/70">
                      <span>{c.summary.subtotal}</span><span>₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-olive/70">
                      <span>{c.summary.delivery}</span><span>{c.summary.deliveryValue}</span>
                    </div>
                    <div className="border-t border-accent/30 pt-3 flex justify-between font-black text-primary">
                      <span>{c.summary.total}</span><span>₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-olive/70 text-xs">
                    <span>{c.summary.pricingLabel}</span><span>{c.summary.pricingNote}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                aria-label={c.summary.checkoutBtn}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full font-bold hover:bg-olive transition-colors">
                <Package size={16} aria-hidden="true" /> {c.summary.checkoutBtn}
              </button>
              <p className="text-[11px] text-center text-olive/50">{c.summary.checkoutNote}</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Checkout Popup */}
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutPopup
            cart={cart}
            cartTotal={cartTotal}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={async () => { await clearCart(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;
