// src/context/CartContext.jsx

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [userId, setUserId] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [addressLoaded, setAddressLoaded] = useState(false);

  // Track auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session) {
        setCart([]);
        setDeliveryAddress(null);
        setAddressLoaded(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load cart + address when user logs in
  useEffect(() => {
    if (!userId) return;
    loadCartFromDB(userId);
    loadAddressFromDB(userId);
  }, [userId]);

  const loadCartFromDB = async (uid) => {
    const { data, error } = await supabase
      .from("cart_items")
      .select("qty, products(*)")
      .eq("user_id", uid);
    if (!error && data) {
      setCart(data.map(row => ({ ...row.products, qty: row.qty })));
    }
  };

  const loadAddressFromDB = async (uid) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("delivery_address")
      .eq("id", uid)
      .maybeSingle(); // won't crash if row doesn't exist

    if (error) {
      console.error("❌ Load address error:", error.message);
      setAddressLoaded(true);
      return;
    }
    setDeliveryAddress(data?.delivery_address || null);
    setAddressLoaded(true);
  };

  const saveAddress = async (address) => {
    setDeliveryAddress(address);
    if (!userId) return;

    // Use upsert so it works even if profile row doesn't exist yet
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, delivery_address: address }, { onConflict: "id" });

    if (error) {
      console.error("❌ Address save error:", error.message);
    } else {
      console.log("✅ Address saved successfully");
    }
  };

  const upsertItemInDB = async (productId, qty) => {
    if (!userId) return;
    if (qty < 1) {
      await supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", productId);
    } else {
      await supabase.from("cart_items").upsert(
        { user_id: userId, product_id: productId, qty },
        { onConflict: "user_id,product_id" }
      );
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const newQty = existing ? existing.qty + 1 : 1;
      upsertItemInDB(product.id, newQty);
      if (existing) return prev.map((item) => item.id === product.id ? { ...item, qty: newQty } : item);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    upsertItemInDB(id, 0);
  };

  const updateQty = (id, qty) => {
    if (qty < 1) { removeFromCart(id); return; }
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, qty } : item)));
    upsertItemInDB(id, qty);
  };

  const clearCart = async () => {
    setCart([]);
    if (userId) await supabase.from("cart_items").delete().eq("user_id", userId);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.qty * (item.price || 0), 0);

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQty, clearCart,
      cartCount, cartTotal,
      deliveryAddress, saveAddress, addressLoaded
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
