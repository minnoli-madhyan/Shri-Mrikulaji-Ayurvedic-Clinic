// src/components/admin/BlogModal.jsx
// ─────────────────────────────────────────────────────────────
// Add / Edit blog modal — follows exact same pattern as
// ServiceModal.jsx in this project.
// Features: bilingual tabs, Supabase Storage image upload,
// image preview, slug auto-generation, visibility toggle.
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import { X, ToggleLeft, ToggleRight, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { uploadBlogImage, deleteBlogImage, getImageUrl } from '../../lib/blogStorage';

const EMPTY_FORM = {
  title:         '',
  subheading:    '',
  summary:       '',
  body:          '',
  title_hi:      '',
  subheading_hi: '',
  summary_hi:    '',
  body_hi:       '',
  slug:          '',
  image_path:    '',
  is_visible:    true,
};

const toSlug = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const BlogModal = ({ initial, onSave, onClose, saving }) => {
  const isEdit = !!initial;

  const [form, setForm] = useState(() => initial ? {
    title:         initial.title         || '',
    subheading:    initial.subheading    || '',
    summary:       initial.summary       || '',
    body:          initial.body          || '',
    title_hi:      initial.title_hi      || '',
    subheading_hi: initial.subheading_hi || '',
    summary_hi:    initial.summary_hi    || '',
    body_hi:       initial.body_hi       || '',
    slug:          initial.slug          || '',
    image_path:    initial.image_path    || '',
    is_visible:    initial.is_visible !== false,
  } : EMPTY_FORM);

  const [activeTab,     setActiveTab]     = useState('en');
  const [error,         setError]         = useState('');
  const [uploading,     setUploading]     = useState(false);
  const [uploadError,   setUploadError]   = useState('');
  const [previewUrl,    setPreviewUrl]    = useState(
    initial?.image_path ? getImageUrl(initial.image_path) : null
  );
  const fileInputRef = useRef(null);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleTitleEnChange = (val) => {
    set('title', val);
    if (!isEdit && !form.slug) set('slug', toSlug(val));
  };

  // ── Image upload ───────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP, etc.)');
      return;
    }

    // Optimistic local preview
    setPreviewUrl(URL.createObjectURL(file));
    setUploadError('');
    setUploading(true);

    // Delete old image from storage if replacing
    if (form.image_path) {
      await deleteBlogImage(form.image_path);
    }

    const { path, error: uploadErr } = await uploadBlogImage(file);
    setUploading(false);

    if (uploadErr) {
      setUploadError(`Upload failed: ${uploadErr.message}`);
      setPreviewUrl(form.image_path ? getImageUrl(form.image_path) : null);
      return;
    }

    set('image_path', path);
    setPreviewUrl(getImageUrl(path));
  };

  const handleRemoveImage = async () => {
    if (form.image_path) await deleteBlogImage(form.image_path);
    set('image_path', '');
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Save ──────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.title.trim())    { setError('English title is required.');    return; }
    if (!form.title_hi.trim()) { setError('Hindi title is required.');      return; }
    if (!form.slug.trim())     { setError('Slug is required.');             return; }
    setError('');

    onSave({
      title:         form.title.trim(),
      subheading:    form.subheading.trim(),
      summary:       form.summary.trim(),
      body:          form.body.trim(),
      title_hi:      form.title_hi.trim(),
      subheading_hi: form.subheading_hi.trim(),
      summary_hi:    form.summary_hi.trim(),
      body_hi:       form.body_hi.trim(),
      slug:          form.slug.trim() || toSlug(form.title),
      image_path:    form.image_path,
      is_visible:    form.is_visible,
    });
  };

  const inputCls   = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400';
  const labelCls   = 'text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1';
  const hindiInput = `${inputCls} font-['Noto_Sans_Devanagari',sans-serif]`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800 text-lg">
            {isEdit ? 'Edit Blog' : 'Add New Blog'}
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

          {/* ── English fields ── */}
          {activeTab === 'en' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Title (English) *</label>
                <input
                  value={form.title}
                  onChange={e => handleTitleEnChange(e.target.value)}
                  placeholder="e.g. The Benefits of Panchakarma Therapy"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Subheading (English)</label>
                <input
                  value={form.subheading}
                  onChange={e => set('subheading', e.target.value)}
                  placeholder="e.g. A deep dive into Ayurvedic detox"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Summary (English)</label>
                <textarea
                  value={form.summary}
                  onChange={e => set('summary', e.target.value)}
                  rows={2}
                  placeholder="Short summary shown on the blog card..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Body / Full Content (English)</label>
                <textarea
                  value={form.body}
                  onChange={e => set('body', e.target.value)}
                  rows={8}
                  placeholder="Full blog article content..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}

          {/* ── Hindi fields ── */}
          {activeTab === 'hi' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>शीर्षक (हिंदी) *</label>
                <input
                  value={form.title_hi}
                  onChange={e => set('title_hi', e.target.value)}
                  placeholder="जैसे: पंचकर्म थेरेपी के लाभ"
                  className={hindiInput}
                  lang="hi"
                />
              </div>
              <div>
                <label className={labelCls}>उपशीर्षक (हिंदी)</label>
                <input
                  value={form.subheading_hi}
                  onChange={e => set('subheading_hi', e.target.value)}
                  placeholder="जैसे: आयुर्वेदिक डिटॉक्स पर विस्तृत चर्चा"
                  className={hindiInput}
                  lang="hi"
                />
              </div>
              <div>
                <label className={labelCls}>सारांश (हिंदी)</label>
                <textarea
                  value={form.summary_hi}
                  onChange={e => set('summary_hi', e.target.value)}
                  rows={2}
                  placeholder="ब्लॉग कार्ड पर दिखाया जाने वाला संक्षिप्त सारांश..."
                  className={`${hindiInput} resize-none`}
                  lang="hi"
                />
              </div>
              <div>
                <label className={labelCls}>मुख्य सामग्री (हिंदी)</label>
                <textarea
                  value={form.body_hi}
                  onChange={e => set('body_hi', e.target.value)}
                  rows={8}
                  placeholder="पूरा ब्लॉग लेख..."
                  className={`${hindiInput} resize-none`}
                  lang="hi"
                />
              </div>
            </div>
          )}

          {/* ── Shared fields ── */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Settings</p>

            {/* Slug */}
            <div>
              <label className={labelCls}>Slug (URL) *</label>
              <input
                value={form.slug}
                onChange={e => set('slug', toSlug(e.target.value))}
                placeholder="benefits-of-panchakarma"
                className={inputCls}
              />
              <p className="text-[11px] text-slate-400 mt-1">URL will be: /blogs/<span className="font-mono">{form.slug || 'your-slug'}</span></p>
            </div>

            {/* Image upload */}
            <div>
              <label className={labelCls}>Blog Image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="blog-image-input"
              />

              {previewUrl ? (
                <div className="relative mt-1">
                  <img
                    src={previewUrl}
                    alt="Blog preview"
                    className="w-full h-48 object-cover rounded-xl border border-slate-200"
                    onError={e => { e.target.src = ''; e.target.style.display = 'none'; }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <label
                      htmlFor="blog-image-input"
                      className="cursor-pointer bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white transition-all shadow-sm flex items-center gap-1.5"
                    >
                      {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                      {uploading ? 'Uploading...' : 'Replace'}
                    </label>
                    <button
                      onClick={handleRemoveImage}
                      className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="blog-image-input"
                  className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={24} className="text-emerald-600 animate-spin mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Uploading image...</p>
                    </>
                  ) : (
                    <>
                      <ImagePlus size={24} className="text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Click to upload image</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP — max 5 MB</p>
                    </>
                  )}
                </label>
              )}

              {uploadError && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{uploadError}</p>
              )}
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Visible to visitors</p>
                <p className="text-xs text-slate-400">Show this blog on the Blog listing page</p>
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
            disabled={saving || uploading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Blog' : 'Add Blog'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogModal;
