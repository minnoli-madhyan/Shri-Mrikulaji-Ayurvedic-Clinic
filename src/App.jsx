// src/App.jsx
// Pages are lazy-loaded so visitors don't download the admin/doctor dashboards.

import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { CartProvider }    from './context/CartContext';
import { AuthProvider }    from './context/AuthContext';
import ProtectedRoute      from './components/ProtectedRoute';
import ScrollToTop         from './ScrollToTop';
import Header              from './components/Header';
import Footer              from './components/Footer';
import Home                from './pages/Home';
const About = lazy(() => import('./pages/AboutUs'));
const Services = lazy(() => import('./pages/Services'));
const Products = lazy(() => import('./pages/products'));
const History = lazy(() => import('./pages/History'));
const Contact = lazy(() => import('./pages/ContactUs'));
const Cart = lazy(() => import('./pages/Cart'));
const Doctors = lazy(() => import('./pages/Doctors'));
const AppointmentBooking = lazy(() => import('./pages/AppointmentBooking'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const Blogs = lazy(() => import('./pages/Blogs'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
import { useTranslation }  from 'react-i18next';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center text-sm text-emerald-800/60 animate-pulse">Loading…</div>
);

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
    <h1 className="text-5xl font-bold text-emerald-800">404</h1>
    <p className="text-gray-600">This page could not be found.</p>
    <Link to="/" className="px-5 py-2 rounded-full bg-emerald-700 text-white text-sm">Back to home</Link>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </Layout>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
