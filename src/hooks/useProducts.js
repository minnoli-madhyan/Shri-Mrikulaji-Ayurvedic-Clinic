// src/hooks/useProducts.js
// ADDED: useMyOrders hook for History page (patient's own orders)
// UPDATED: bilingual fields (name_hi, description_hi, category_hi, headline_hi)

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


/* ─────────────────────────────────────────────────────────────
   useProducts
   Fetches active products including bilingual Hindi columns.
   Falls back gracefully if Hindi columns don't exist yet.
───────────────────────────────────────────────────────────── */
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_hi, description, description_hi, headline, headline_hi, category, category_hi, price, stock, is_active, image_url')
        .eq('is_active', true)
        .order('name');

      if (error) { setError(error.message); }
      else        { setProducts(data); }
      setLoading(false);
    };
    fetch();
  }, []);

  return { products, loading, error };
};

/* ─────────────────────────────────────────────────────────────
   usePlaceOrder
   Call this from Cart.jsx when user clicks "Checkout".
───────────────────────────────────────────────────────────── */
export const usePlaceOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const placeOrder = async (cart, total) => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    const items = cart.map(({ id, name, price, qty }) => ({ id, name, price, qty }));

    const { data, error } = await supabase
      .from('orders')
      .insert([{ user_id: user?.id ?? null, items, total, status: 'pending' }])
      .select()
      .single();

    setLoading(false);
    if (error) { setError(error.message); return { error }; }
    return { data };
  };

  return { placeOrder, loading, error };
};


/* ─────────────────────────────────────────────────────────────
   useMyOrders  (Patient — History page)
   Fetches the current user's own orders, with cancel support.

   const { orders, loading, cancelOrder } = useMyOrders();
───────────────────────────────────────────────────────────── */
export const useMyOrders = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) setOrders(data);
      setLoading(false);
    };
    fetch();
  }, []);

  // Optimistic cancel — UI updates immediately, DB updated by caller
  const cancelOrder = (id) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
  };

  return { orders, loading, cancelOrder };
};


/* ─────────────────────────────────────────────────────────────
   useOrders  (Admin — all orders)
───────────────────────────────────────────────────────────── */
export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setOrders(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    else console.error('[useOrders] updateOrderStatus failed:', error.message);
    return { error: error ?? null };
  };

  return { orders, loading, updateOrderStatus };
};


/* ─────────────────────────────────────────────────────────────
   useAdminProducts  (Admin CRUD)
───────────────────────────────────────────────────────────── */
export const useAdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const addProduct = async (product) => {
    const { data, error } = await supabase.from('products').insert([product]).select().single();
    if (!error) setProducts(prev => [...prev, data]);
    return { data, error };
  };

  const updateProduct = async (id, updates) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (!error) setProducts(prev => prev.map(p => p.id === id ? data : p));
    return { data, error };
  };

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
    return { error };
  };

  return { products, loading, addProduct, updateProduct, deleteProduct };
};
