// src/pages/BlogPost.jsx
// ─────────────────────────────────────────────────────────────
// Individual Blog Post Page
// - Slug-based dynamic routing (/blogs/:slug)
// - Main content on left, sidebar with other blogs on right
// - Bilingual rendering
// - Responsive (sidebar stacks below on mobile)
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useBlog, useBlogs } from '../hooks/useBlogs';
import { getImageUrl } from '../lib/blogStorage';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='500' viewBox='0 0 900 500'%3E%3Crect fill='%23f1f5f9' width='900' height='500'/%3E%3Ctext fill='%23cbd5e1' font-family='sans-serif' font-size='28' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";

// ── Sidebar Card ──────────────────────────────────────────────
const SidebarBlogCard = ({ blog, lang, currentSlug }) => {
  if (blog.slug === currentSlug) return null;
  const isHi  = lang === 'hi';
  const title = (isHi ? blog.title_hi : blog.title) || blog.title || '';
  const imgUrl = getImageUrl(blog.image_path);

  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="flex gap-3 group hover:bg-slate-50 rounded-xl p-2 -mx-2 transition-colors"
    >
      <div className="w-16 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
        {imgUrl
          ? <img src={imgUrl} alt={title} className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER; }} />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-slate-300" /></div>
        }
      </div>
      <p
        className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug"
        lang={isHi ? 'hi' : 'en'}
      >
        {title}
      </p>
    </Link>
  );
};

// ── Main Component ────────────────────────────────────────────
const BlogPost = () => {
  const { slug }                 = useParams();
  const { i18n }                 = useTranslation();
  const lang                     = i18n.language?.split('-')[0] || 'en';
  const { blog, loading, error } = useBlog(slug);
  const { blogs: allBlogs }      = useBlogs();

  const isHi = lang === 'hi';

  // Derived bilingual fields
  const title    = blog && ((isHi ? blog.title_hi    : blog.title)    || blog.title    || '');
  const subhead  = blog && ((isHi ? blog.subheading_hi : blog.subheading) || blog.subheading || '');
  const body     = blog && ((isHi ? blog.body_hi     : blog.body)     || blog.body     || '');
  const imgUrl   = blog?.image_path ? getImageUrl(blog.image_path) : null;

  const date = blog?.created_at
    ? new Date(blog.created_at).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const otherBlogs = allBlogs.filter(b => b.slug !== slug).slice(0, 6);

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">
            {isHi ? 'लोड हो रहा है...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error / Not found ────────────────────────────────────
  if (error || !blog) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            {isHi ? 'ब्लॉग नहीं मिला' : 'Blog Not Found'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {error || (isHi ? 'यह ब्लॉग उपलब्ध नहीं है।' : 'This blog post is not available.')}
          </p>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-800 transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            {isHi ? 'सभी ब्लॉग देखें' : 'Back to Blogs'}
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-sm hover:underline mb-6"
        >
          <ArrowLeft size={15} />
          {isHi ? 'सभी ब्लॉग' : 'All Blogs'}
        </Link>

        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Main Content ─────────────────────────────── */}
          <article className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Hero image */}
              {imgUrl && (
                <div className="w-full h-64 md:h-80 overflow-hidden bg-slate-100">
                  <img
                    src={imgUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src = PLACEHOLDER; }}
                  />
                </div>
              )}

              <div className="p-6 md:p-8">
                {/* Date */}
                {date && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                    <Calendar size={12} />
                    <span>{date}</span>
                  </div>
                )}

                {/* Title */}
                <h1
                  className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight mb-3"
                  lang={isHi ? 'hi' : 'en'}
                >
                  {title}
                </h1>

                {/* Subheading */}
                {subhead && (
                  <p
                    className="text-emerald-700 font-semibold text-lg mb-6 leading-snug"
                    lang={isHi ? 'hi' : 'en'}
                  >
                    {subhead}
                  </p>
                )}

                {/* Divider */}
                <div className="border-t border-slate-100 mb-6" />

                {/* Body */}
                {body ? (
                  <div
                    className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]"
                    lang={isHi ? 'hi' : 'en'}
                    style={isHi ? { fontFamily: "'Noto Sans Devanagari', sans-serif" } : undefined}
                  >
                    {body}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-sm">
                    {isHi ? 'इस ब्लॉग में सामग्री उपलब्ध नहीं है।' : 'No content available for this blog post.'}
                  </p>
                )}
              </div>
            </div>
          </article>

          {/* ── Sidebar ──────────────────────────────────── */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:sticky lg:top-20">
              <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-600" />
                {isHi ? 'अन्य लेख' : 'More Articles'}
              </h3>

              {otherBlogs.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  {isHi ? 'अभी और लेख नहीं हैं।' : 'No other articles yet.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {otherBlogs.map(b => (
                    <SidebarBlogCard
                      key={b.id}
                      blog={b}
                      lang={lang}
                      currentSlug={slug}
                    />
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Link
                  to="/blogs"
                  className="block w-full text-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {isHi ? 'सभी ब्लॉग देखें' : 'View All Blogs'}
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default BlogPost;
