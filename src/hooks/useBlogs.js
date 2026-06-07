// src/hooks/useBlogs.js
// ─────────────────────────────────────────────────────────────
// Mirrors the architecture of useServices.js / useProducts.js
//
// Exports:
//   useBlogs       – public Blog listing page (visible only)
//   useBlog        – single blog by slug (public)
//   useAdminBlogs  – AdminDashboard full CRUD
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { deleteBlogImage } from '../lib/blogStorage';


/* ─────────────────────────────────────────────────────────────
   useBlogs
   Used on the Blog listing page — fetches only visible blogs,
   newest first.
   const { blogs, loading, error } = useBlogs();
───────────────────────────────────────────────────────────── */
export const useBlogs = () => {
  const [blogs,   setBlogs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, slug, title, subheading, summary, title_hi, subheading_hi, summary_hi, image_path, created_at')
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else       setBlogs(data || []);
      setLoading(false);
    };
    fetchBlogs();
  }, []);

  return { blogs, loading, error };
};


/* ─────────────────────────────────────────────────────────────
   useBlog
   Fetches a single blog by slug (public, only visible).
   const { blog, loading, error } = useBlog(slug);
───────────────────────────────────────────────────────────── */
export const useBlog = (slug) => {
  const [blog,    setBlog]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    setLoading(true);
    setBlog(null);
    setError(null);

    const fetchBlog = async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('is_visible', true)
        .single();

      if (error) setError(error.message);
      else       setBlog(data);
      setLoading(false);
    };
    fetchBlog();
  }, [slug]);

  return { blog, loading, error };
};


/* ─────────────────────────────────────────────────────────────
   useAdminBlogs
   Used in AdminDashboard — full CRUD without visibility filter.

   const {
     blogs, loading,
     addBlog, updateBlog, deleteBlog, toggleVisibility
   } = useAdminBlogs();
───────────────────────────────────────────────────────────── */
export const useAdminBlogs = () => {
  const [blogs,   setBlogs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setBlogs(data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── CREATE ──────────────────────────────────────────────────
  const addBlog = async (blog) => {
    const { data, error } = await supabase
      .from('blogs')
      .insert([blog])
      .select()
      .single();
    if (!error && data) setBlogs(prev => [data, ...prev]);
    return { data, error };
  };

  // ── UPDATE ──────────────────────────────────────────────────
  const updateBlog = async (id, updates) => {
    const { data, error } = await supabase
      .from('blogs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) setBlogs(prev => prev.map(b => b.id === id ? data : b));
    return { data, error };
  };

  // ── DELETE (also removes storage image) ─────────────────────
  const deleteBlog = async (id) => {
    const blog = blogs.find(b => b.id === id);
    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (!error) {
      setBlogs(prev => prev.filter(b => b.id !== id));
      // Clean up storage image if present
      if (blog?.image_path) await deleteBlogImage(blog.image_path);
    }
    return { error };
  };

  // ── TOGGLE VISIBILITY ───────────────────────────────────────
  const toggleVisibility = async (id, is_visible) => {
    return updateBlog(id, { is_visible });
  };

  return { blogs, loading, addBlog, updateBlog, deleteBlog, toggleVisibility };
};
