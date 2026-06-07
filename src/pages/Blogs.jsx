// src/pages/Blogs.jsx
// ─────────────────────────────────────────────────────────────
// Public Blog Listing Page
// - Fetches visible blogs from Supabase
// - Bilingual rendering via react-i18next
// - Responsive grid layout
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { useBlogs } from '../hooks/useBlogs';
import { getImageUrl } from '../lib/blogStorage';

// Fallback placeholder image (inline SVG data-url)
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='340' viewBox='0 0 600 340'%3E%3Crect fill='%23f1f5f9' width='600' height='340'/%3E%3Ctext fill='%23cbd5e1' font-family='sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";

const BlogCard = ({ blog, lang }) => {
  const isHi     = lang === 'hi';
  const title    = (isHi ? blog.title_hi    : blog.title)    || blog.title    || '';
  const subhead  = (isHi ? blog.subheading_hi : blog.subheading) || blog.subheading || '';
  const summary  = (isHi ? blog.summary_hi  : blog.summary)  || blog.summary  || '';
  const imgUrl   = getImageUrl(blog.image_path) || PLACEHOLDER;

  const date = blog.created_at
    ? new Date(blog.created_at).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img
          src={imgUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { e.target.src = PLACEHOLDER; }}
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {date && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Calendar size={12} />
            <span>{date}</span>
          </div>
        )}
        <h2
          className="font-bold text-slate-800 text-lg leading-snug mb-1.5 group-hover:text-emerald-700 transition-colors line-clamp-2"
          lang={isHi ? 'hi' : 'en'}
        >
          {title}
        </h2>
        {subhead && (
          <p
            className="text-emerald-700 text-sm font-medium mb-2 line-clamp-1"
            lang={isHi ? 'hi' : 'en'}
          >
            {subhead}
          </p>
        )}
        {summary && (
          <p
            className="text-slate-500 text-sm leading-relaxed line-clamp-3 flex-1"
            lang={isHi ? 'hi' : 'en'}
          >
            {summary}
          </p>
        )}
        <div className="mt-4 flex items-center gap-1.5 text-emerald-700 text-sm font-semibold">
          <BookOpen size={14} />
          <span>{isHi ? 'पूरा पढ़ें' : 'Read More'}</span>
        </div>
      </div>
    </Link>
  );
};

const Blogs = () => {
  const { i18n, t } = useTranslation();
  const lang        = i18n.language?.split('-')[0] || 'en';
  const { blogs, loading, error } = useBlogs();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-white pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <BookOpen size={15} />
            {lang === 'hi' ? 'ज्ञान व स्वास्थ्य' : 'Knowledge & Wellness'}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3" lang={lang}>
            {lang === 'hi' ? 'हमारा ब्लॉग' : 'Our Blog'}
          </h1>
          <p className="text-white/75 text-lg max-w-xl mx-auto" lang={lang}>
            {lang === 'hi'
              ? 'आयुर्वेद, स्वास्थ्य और प्राकृतिक जीवनशैली पर विशेषज्ञ ज्ञान'
              : 'Expert insights on Ayurveda, wellness & natural living'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded" />
                  <div className="h-4 bg-slate-200 rounded w-4/5" />
                  <div className="h-4 bg-slate-200 rounded" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-5 max-w-lg mx-auto">
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <p className="text-red-700 text-sm font-medium">
              {lang === 'hi' ? 'ब्लॉग लोड नहीं हो सके।' : 'Could not load blogs.'} {error}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && blogs.length === 0 && (
          <div className="text-center py-24">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
            <p className="text-slate-500 text-lg font-medium">
              {lang === 'hi' ? 'अभी कोई ब्लॉग उपलब्ध नहीं है।' : 'No blogs available yet.'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {lang === 'hi' ? 'जल्द ही नई सामग्री आएगी।' : 'Check back soon for new content.'}
            </p>
          </div>
        )}

        {/* Blog grid */}
        {!loading && !error && blogs.length > 0 && (
          <>
            <p className="text-sm text-slate-400 mb-6">
              {blogs.length} {lang === 'hi' ? 'लेख' : 'article'}{blogs.length !== 1 ? (lang === 'hi' ? '' : 's') : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map(blog => (
                <BlogCard key={blog.id} blog={blog} lang={lang} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Blogs;
