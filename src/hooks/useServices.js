// src/hooks/useServices.js
// Mirrors the architecture of useProducts.js and useDoctors.js
// ─────────────────────────────────────────────────────────────
// Exports:
//   useServices       – public Services page (visible only)
//   useAdminServices  – AdminDashboard full CRUD
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


/* ─────────────────────────────────────────────────────────────
   useServices
   Used in Services.jsx — fetches only visible services,
   ordered by display_order.

   const { services, loading, error } = useServices();
───────────────────────────────────────────────────────────── */
export const useServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setServices(data || []);
      }
      setLoading(false);
    };

    fetchServices();
  }, []);

  return { services, loading, error };
};


/* ─────────────────────────────────────────────────────────────
   useAdminServices
   Used in AdminDashboard — full CRUD without visibility filter.

   const {
     services, loading,
     addService, updateService, deleteService, toggleVisibility
   } = useAdminServices();
───────────────────────────────────────────────────────────── */
export const useAdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .order('display_order', { ascending: true });
      if (data) setServices(data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── CREATE ──────────────────────────────────────────────────
  const addService = async (service) => {
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
      .single();
    if (!error) setServices(prev => [...prev, data]);
    return { data, error };
  };

  // ── UPDATE ──────────────────────────────────────────────────
  const updateService = async (id, updates) => {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error) setServices(prev => prev.map(s => s.id === id ? data : s));
    return { data, error };
  };

  // ── DELETE ──────────────────────────────────────────────────
  const deleteService = async (id) => {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    if (!error) setServices(prev => prev.filter(s => s.id !== id));
    return { error };
  };

  // ── TOGGLE VISIBILITY ───────────────────────────────────────
  const toggleVisibility = async (id, is_visible) => {
    return updateService(id, { is_visible });
  };

  return { services, loading, addService, updateService, deleteService, toggleVisibility };
};
