// src/context/AuthContext.jsx
// CHANGES from original:
//  - Added sendPasswordReset(email) – calls supabase.auth.resetPasswordForEmail()
//  - After login: patients → /, doctors → /doctor-dashboard, admins → /admin-dashboard
//  - signOut always → /

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error) setProfile(data);
    return data;
  };

  /* ── Redirect based on role ─────────────────────────────────────────────
       Patients  → /  (homepage)
       Doctors   → /doctor-dashboard
       Admins    → /admin-dashboard
  */
  const redirectByRole = (role) => {
    if (role === 'admin')  { navigate('/admin-dashboard',  { replace: true }); return; }
    if (role === 'doctor') { navigate('/doctor-dashboard', { replace: true }); return; }
    navigate('/', { replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ email, password, name, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone, role: 'patient' } },
    });
    if (error || !data?.session) return { data, error };

    const prof = await fetchProfile(data.user.id);
    setUser(data.user);
    redirectByRole(prof?.role ?? 'patient');

    return { data, error: null };
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session) return { data, error };

    const prof = await fetchProfile(data.user.id);
    setUser(data.user);
    redirectByRole(prof?.role ?? 'patient');

    return { data, error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    navigate('/', { replace: true });
  };

  /**
   * sendPasswordReset
   * Triggers Supabase's built-in "reset password for email" flow.
   * Supabase sends an email with a magic link that redirects to
   * SITE_URL/reset-password  (configure in Supabase Dashboard).
   *
   * @param {string} email
   * @returns {{ error: Error|null }}
   */
  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const isAdmin   = profile?.role === 'admin';
  const isDoctor  = profile?.role === 'doctor';
  const isPatient = profile?.role === 'patient';

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signOut,
      sendPasswordReset,
      isAdmin, isDoctor, isPatient,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
