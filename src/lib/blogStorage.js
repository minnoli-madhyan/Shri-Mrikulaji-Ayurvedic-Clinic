// src/lib/blogStorage.js
// ─────────────────────────────────────────────────────────────
// Supabase Storage helpers for the Blog image system.
//
// All images live in the "blog-images" bucket.
// DB stores only the path (e.g. "blogs/abc.jpg").
// Public URL is generated on demand — never stored in DB.
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabase';

const BUCKET = 'blog-images';
const FOLDER = 'blogs';

/**
 * Given a storage path ("blogs/abc.jpg"), return the full public URL.
 * Returns null if path is empty.
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath);
  return data?.publicUrl || null;
};

/**
 * Upload a File object to Supabase Storage.
 * Returns { path, error }
 *
 * path  — storage path to save in the DB (e.g. "blogs/1700000000000-photo.jpg")
 * error — null on success, error object on failure
 */
export const uploadBlogImage = async (file) => {
  if (!file) return { path: null, error: new Error('No file provided') };

  // Sanitise filename — strip spaces, keep extension
  const ext      = file.name.split('.').pop().toLowerCase();
  const safe     = file.name.replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/gi, '');
  const filename = `${Date.now()}-${safe}`;
  const path     = `${FOLDER}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });

  if (error) return { path: null, error };
  return { path, error: null };
};

/**
 * Delete an image from Supabase Storage by its path.
 * Safe to call with null/undefined — does nothing.
 */
export const deleteBlogImage = async (imagePath) => {
  if (!imagePath) return { error: null };
  const { error } = await supabase.storage.from(BUCKET).remove([imagePath]);
  return { error };
};
