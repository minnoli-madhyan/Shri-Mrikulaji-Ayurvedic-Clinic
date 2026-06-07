// src/lib/productStorage.js
// ─────────────────────────────────────────────────────────────
// Supabase Storage helpers for the Product image system.
// Mirrors blogStorage.js exactly — same bucket strategy.
//
// All images live in the "product-images" bucket.
// DB stores only the path (e.g. "products/abc.jpg").
// Public URL is generated on demand — never stored in DB.
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabase';

const BUCKET = 'product-images';
const FOLDER = 'products';

/**
 * Given a storage path ("products/abc.jpg"), return the full public URL.
 * Also accepts a full https:// URL already (legacy image_url values) — passes through.
 * Returns null if path is empty.
 */
export const getProductImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // If it's already an absolute URL (legacy / manually entered), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath);
  return data?.publicUrl || null;
};

/**
 * Upload a File object to Supabase Storage.
 * Returns { path, error }
 *
 * path  — storage path to save in the DB (e.g. "products/1700000000000-photo.jpg")
 * error — null on success, error object on failure
 */
export const uploadProductImage = async (file) => {
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
 * Ignores absolute URLs (legacy values — can't delete those).
 */
export const deleteProductImage = async (imagePath) => {
  if (!imagePath) return { error: null };
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return { error: null };
  const { error } = await supabase.storage.from(BUCKET).remove([imagePath]);
  return { error };
};
