// src/App.jsx
// CHANGE: Added /reset-password route (no Header/Footer, no auth guard)

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider }    from './context/CartContext';
import { AuthProvider }    from './context/AuthContext';
import ProtectedRoute      from './components/ProtectedRoute';
import ScrollToTop         from './ScrollToTop';
import Header              from './components/Header';
import Footer              from './components/Footer';
import Home                from './pages/Home';
import About               from './pages/AboutUs';
import Services            from './pages/Services';
import Products            from './pages/products';
import History             from './pages/History';
import Contact             from './pages/ContactUs';
import Cart                from './pages/Cart';
import Doctors             from './pages/Doctors';
import AppointmentBooking  from './pages/AppointmentBooking';
import AdminDashboard      from './pages/AdminDashboard';
import DoctorDashboard     from './pages/DoctorDashboard';
import Blogs               from './pages/Blogs';
import BlogPost            from './pages/BlogPost';
import ResetPassword       from './pages/ResetPassword';   // ← NEW
import { useTranslation }  from 'react-i18next';

// Dashboard routes + reset-password skip shared Header/Footer
const DASHBOARD_PATHS = ['/admin-dashboard', '/doctor-dashboard', '/reset-password'];

// SEO: Update document title on language change
const MetaUpdater = () => {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.title = t('meta.title');
    document.documentElement.lang = i18n.language?.split('-')[0] || 'en';
  }, [i18n.language, t]);
  return null;
};

const Layout = ({ children }) => {
  const location  = useLocation();
  const isDashboard = DASHBOARD_PATHS.some(p => location.pathname.startsWith(p));
  if (isDashboard) return <>{children}</>;
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <MetaUpdater />
        <ScrollToTop />
        <Layout>
          <Routes>
            {/* Public routes */}
            <Route path="/"            element={<Home />} />
            <Route path="/about"       element={<About />} />
            <Route path="/services"    element={<Services />} />
            <Route path="/products"    element={<Products />} />
            <Route path="/history"     element={<History />} />
            <Route path="/contact"     element={<Contact />} />
            <Route path="/cart"        element={<Cart />} />
            <Route path="/doctors"     element={<Doctors />} />
            <Route path="/appointment" element={<AppointmentBooking />} />
            <Route path="/blogs"       element={<Blogs />} />
            <Route path="/blogs/:slug" element={<BlogPost />} />

            {/* Password reset — must be public, receives Supabase hash token */}
            <Route path="/reset-password" element={<ResetPassword />} />  {/* ← NEW */}

            {/* Role-protected dashboard routes */}
            <Route path="/admin-dashboard" element={
              <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/doctor-dashboard" element={
              <ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
