// src/hooks/useDoctors.js
// Use in Doctors.jsx and AdminDashboard.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


/* ─────────────────────────────────────────────────────────────
   useDoctors
   Replaces hardcoded doctorsData in Doctors.jsx and AdminDashboard.jsx

   const { doctors, loading } = useDoctors();
───────────────────────────────────────────────────────────── */
export const useDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error) setDoctors(data);
      setLoading(false);
    };
    fetch();
  }, []);

  return { doctors, loading };
};


/* ─────────────────────────────────────────────────────────────
   useAdminDoctors
   For AdminDashboard — full CRUD

   const { doctors, loading, addDoctor, updateDoctor, deleteDoctor } = useAdminDoctors();
───────────────────────────────────────────────────────────── */
export const useAdminDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('doctors').select('*').order('display_order', { ascending: true });
      if (data) setDoctors(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const addDoctor = async (doctor) => {
    const { data, error } = await supabase.from('doctors').insert([doctor]).select().single();
    if (!error) setDoctors(prev => [...prev, data]);
    return { data, error };
  };

  const updateDoctor = async (id, updates) => {
    const { data, error } = await supabase.from('doctors').update(updates).eq('id', id).select().single();
    if (!error) setDoctors(prev => prev.map(d => d.id === id ? data : d));
    return { data, error };
  };

  const toggleActive = async (id, is_active) => {
    return updateDoctor(id, { is_active });
  };

  const deleteDoctor = async (id) => {
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (!error) setDoctors(prev => prev.filter(d => d.id !== id));
    return { error };
  };

  // Link a doctor row to a Supabase auth user_id
  const linkDoctorToUser = async (doctorId, userId) => {
    const { data, error } = await supabase
      .from('doctors')
      .update({ user_id: userId })
      .eq('id', doctorId)
      .select()
      .single();
    if (!error) setDoctors(prev => prev.map(d => d.id === doctorId ? data : d));
    return { data, error };
  };

  // Fetch all doctor-role profiles so admin can pick which user to link
  const fetchDoctorProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('role', 'doctor');
    return { data: data || [], error };
  };

  return { doctors, loading, addDoctor, updateDoctor, toggleActive, deleteDoctor, linkDoctorToUser, fetchDoctorProfiles };
};
