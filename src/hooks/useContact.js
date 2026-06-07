// src/hooks/useContact.js
// Use this in ContactUs.jsx to save messages to Supabase.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


/* ─────────────────────────────────────────────────────────────
   useSendMessage
   Replace the placeholder handleSubmit in ContactUs.jsx:

   const { send, loading, error, success } = useSendMessage();
   ...
   const handleSubmit = async (e) => {
     e.preventDefault();
     const result = await send(formData);
     if (!result.error) setSubmitted(true);
   };
───────────────────────────────────────────────────────────── */
export const useSendMessage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  const send = async ({ name, email, phone, subject, message }) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error } = await supabase
      .from('contact_messages')
      .insert([{ name, email, phone, subject, message }]);

    setLoading(false);
    if (error) { setError(error.message); return { error }; }
    setSuccess(true);
    return { data: null };
  };

  return { send, loading, error, success };
};


/* ─────────────────────────────────────────────────────────────
   useContactMessages  (Admin only)
   For AdminDashboard to list & mark messages as read.
───────────────────────────────────────────────────────────── */
export const useContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setMessages(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const markRead = async (id) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    return { error };
  };

  const deleteMessage = async (id) => {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (!error) setMessages(prev => prev.filter(m => m.id !== id));
    return { error };
  };

  return { messages, loading, markRead, deleteMessage };
};
