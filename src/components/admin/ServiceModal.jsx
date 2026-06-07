// src/components/admin/ServiceModal.jsx
// ─────────────────────────────────────────────────────────────
// Add / Edit service modal — follows exact same pattern as
// ProductModal in AdminDashboard.jsx
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { X, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react';

const ICON_OPTIONS = [
  'User', 'Stethoscope', 'Droplets', 'ShieldCheck',
  'Heart', 'Sparkles', 'Activity', 'Baby', 'Leaf',
];

const EMPTY_FORM = {
  title_en:         '',
  title_hi:         '',
  description_en:   '',
  description_hi:   '',
  short_description:'',
  items_en:         [''],
  items_hi:         [''],
  icon_name:        'Leaf',
  image_url:        '',
  pricing_info:     '',
  slug:             '',
  is_visible:       true,
  display_order:    0,
};

// Auto-generate slug from English title
const toSlug = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ServiceModal = ({ initial, onSave, onClose, saving }) => {
  const isEdit = !!initial;

  const normaliseItems = (val) => {
    if (!val) return [''];
    if (Array.isArray(val)) return val.length ? val : [''];
    try { const p = JSON.parse(val); return Array.isArray(p) && p.length ? p : ['']; }
    catch { return ['']; }
  };

  const [form, setForm] = useState(() => initial ? {
    title_en:          initial.title_en          || '',
    title_hi:          initial.title_hi          || '',
    description_en:    initial.description_en    || '',
    description_hi:    initial.description_hi    || '',
    short_description: initial.short_description || '',
    items_en:          normaliseItems(initial.items_en),
    items_hi:          normaliseItems(initial.items_hi),
    icon_name:         initial.icon_name         || 'Leaf',
    image_url:         initial.image_url         || '',
    pricing_info:      initial.pricing_info      || '',
    slug:              initial.slug              || '',
    is_visible:        initial.is_visible !== false,
    display_order:     initial.display_order     || 0,
  } : EMPTY_FORM);

  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('en'); // 'en' | 'hi'

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Items helpers
  const setItem = (lang, idx, val) => {
    const key = `items_${lang}`;
    const arr = [...form[key]];
    arr[idx] = val;
    set(key, arr);
  };
  const addItem    = (lang) => set(`items_${lang}`, [...form[`items_${lang}`], '']);
  const removeItem = (lang, idx) => {
    const arr = form[`items_${lang}`].filter((_, i) => i !== idx);
    set(`items_${lang}`, arr.length ? arr : ['']);
  };

  const handleTitleEnChange = (val) => {
    set('title_en', val);
    if (!isEdit && !form.slug) set('slug', toSlug(val));
  };

  const handleSave = () => {
    if (!form.title_en.trim()) { setError('English title is required.'); return; }
    if (!form.title_hi.trim()) { setError('Hindi title is required.'); return; }
    setError('');

    onSave({
      title_en:          form.title_en.trim(),
      title_hi:          form.title_hi.trim(),
      description_en:    form.description_en.trim(),
      description_hi:    form.description_hi.trim(),
      short_description: form.short_description.trim(),
      items_en:          form.items_en.filter(i => i.trim()),
      items_hi:          form.items_hi.filter(i => i.trim()),
      icon_name:         form.icon_name,
      image_url:         form.image_url.trim(),
      pricing_info:      form.pricing_info.trim(),
      slug:              form.slug.trim() || toSlug(form.title_en),
      is_visible:        form.is_visible,
      display_order:     parseInt(form.display_order) || 0,
    });
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400";
  const labelCls = "text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800 text-lg">
            {isEdit ? 'Edit Service' : 'Add New Service'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Language tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {[{ key: 'en', label: '🇬🇧 English' }, { key: 'hi', label: '🇮🇳 हिंदी' }].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white shadow text-emerald-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* English fields */}
          {activeTab === 'en' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Title (English) *</label>
                <input
                  value={form.title_en}
                  onChange={e => handleTitleEnChange(e.target.value)}
                  placeholder="e.g. Women's Health (Stri Rog)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Description (English)</label>
                <textarea
                  value={form.description_en}
                  onChange={e => set('description_en', e.target.value)}
                  rows={2}
                  placeholder="Brief description of the service..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Bullet Points (English)</label>
                <div className="space-y-2">
                  {form.items_en.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input
                        value={item}
                        onChange={e => setItem('en', idx, e.target.value)}
                        placeholder={`Point ${idx + 1}...`}
                        className={`${inputCls} flex-1`}
                      />
                      <button
                        onClick={() => removeItem('en', idx)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addItem('en')}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                  >
                    <Plus size={14} /> Add Point
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hindi fields */}
          {activeTab === 'hi' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>शीर्षक (हिंदी) *</label>
                <input
                  value={form.title_hi}
                  onChange={e => set('title_hi', e.target.value)}
                  placeholder="जैसे: महिला स्वास्थ्य (स्त्री रोग)"
                  className={`${inputCls} font-['Noto_Sans_Devanagari',sans-serif]`}
                  lang="hi"
                />
              </div>
              <div>
                <label className={labelCls}>विवरण (हिंदी)</label>
                <textarea
                  value={form.description_hi}
                  onChange={e => set('description_hi', e.target.value)}
                  rows={2}
                  placeholder="सेवा का संक्षिप्त विवरण..."
                  className={`${inputCls} resize-none font-['Noto_Sans_Devanagari',sans-serif]`}
                  lang="hi"
                />
              </div>
              <div>
                <label className={labelCls}>बुलेट पॉइंट (हिंदी)</label>
                <div className="space-y-2">
                  {form.items_hi.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input
                        value={item}
                        onChange={e => setItem('hi', idx, e.target.value)}
                        placeholder={`बिंदु ${idx + 1}...`}
                        className={`${inputCls} flex-1 font-['Noto_Sans_Devanagari',sans-serif]`}
                        lang="hi"
                      />
                      <button
                        onClick={() => removeItem('hi', idx)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addItem('hi')}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                  >
                    <Plus size={14} /> बिंदु जोड़ें
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shared fields (always visible) */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Settings</p>

            <div>
              <label className={labelCls}>Short Description / Tagline</label>
              <input
                value={form.short_description}
                onChange={e => set('short_description', e.target.value)}
                placeholder="e.g. Holistic care for every stage of a woman's life."
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Icon</label>
                <select
                  value={form.icon_name}
                  onChange={e => set('icon_name', e.target.value)}
                  className={inputCls}
                >
                  {ICON_OPTIONS.map(ico => (
                    <option key={ico} value={ico}>{ico}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Display Order</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={e => set('display_order', e.target.value)}
                  placeholder="1"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Image URL</label>
              <input
                value={form.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://... (Supabase storage URL or CDN link)"
                className={inputCls}
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="preview"
                  className="mt-2 h-24 w-full object-cover rounded-xl border border-slate-100"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Pricing / Info Badge</label>
                <input
                  value={form.pricing_info}
                  onChange={e => set('pricing_info', e.target.value)}
                  placeholder="e.g. Free Consultation"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Slug (URL)</label>
                <input
                  value={form.slug}
                  onChange={e => set('slug', e.target.value)}
                  placeholder="womens-health-stri-rog"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Visible to visitors</p>
                <p className="text-xs text-slate-400">Show this service on the Services page</p>
              </div>
              <button
                onClick={() => set('is_visible', !form.is_visible)}
                className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${form.is_visible ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {form.is_visible ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>

            {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Service' : 'Add Service'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;
