// src/pages/ResetPassword.jsx
// Handles the deep-link redirect from Supabase's password-reset email.
// URL pattern: https://your-site.com/reset-password#access_token=...&type=recovery
//
// Supabase automatically exchanges the token in the URL hash, so by the time
// this component mounts the user's session is already live via onAuthStateChange.
// We just call supabase.auth.updateUser({ password }) with the new value.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Leaf, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

// ── Inline InputField (mirrors AuthModal style) ──────────────────────────────
const InputField = ({ icon: Icon, label, type, value, onChange, placeholder, error, rightEl }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={15} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pl-9 ${rightEl ? 'pr-10' : 'pr-4'} py-2.5 border rounded-xl text-sm outline-none
          focus:ring-2 transition-all
          ${error
            ? 'border-red-400 bg-red-50 focus:ring-red-300'
            : 'border-slate-200 focus:ring-emerald-400'}`}
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
    {error && (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
        <AlertCircle size={10} />{error}
      </p>
    )}
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────
const ResetPassword = () => {
  const { t }    = useTranslation();
  const navigate = useNavigate();

  const [password, setPassword]       = useState('');
  const [confirm,  setConfirm]        = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors]           = useState({});
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidLink,  setInvalidLink]  = useState(false);

  // ── Wait for Supabase to exchange the token from the URL hash ─────────────
  // Supabase fires onAuthStateChange with event "PASSWORD_RECOVERY" when the
  // hash contains type=recovery. We listen for it to know the session is live.
  useEffect(() => {
    // Check if we already have a session (e.g. navigated back)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
      }
      // If the hash was invalid / expired Supabase won't fire PASSWORD_RECOVERY
    });

    // Fallback: if no PASSWORD_RECOVERY within 5 s and no session → invalid link
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) setInvalidLink(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // ── Password strength ──────────────────────────────────────────────────────
  const strength      = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', t('auth.passwordStrength.weak'), t('auth.passwordStrength.fair'), t('auth.passwordStrength.strong')][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'][strength];

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!password)           e.password = t('auth.validation.passwordRequired');
    else if (password.length < 6) e.password = t('auth.validation.passwordMinLength');
    if (password !== confirm) e.confirm  = t('auth.validation.passwordMismatch');
    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError('');

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setServerError(error.message);
      return;
    }

    // Sign out so the user logs in fresh with the new password
    await supabase.auth.signOut();
    setSuccess(true);
  };

  // ── Eye toggle button ──────────────────────────────────────────────────────
  const eyeBtn = (show, setShow) => (
    <button type="button" onClick={() => setShow(!show)} className="text-slate-400 hover:text-slate-600">
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  // ── Loading state (waiting for token exchange) ─────────────────────────────
  if (!sessionReady && !invalidLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            {t('auth.resetVerifying', 'Verifying your reset link…')}
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ─────────────────────────────────────────────────
  if (invalidLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center px-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 px-7 pt-7 pb-5 text-white">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-700/60 p-2.5 rounded-xl">
                <Leaf size={20} className="text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t('auth.resetExpiredTitle', 'Link Expired')}</h2>
                <p className="text-emerald-300/80 text-xs">{t('auth.resetExpiredSubtitle', 'This reset link is no longer valid')}</p>
              </div>
            </div>
          </div>
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-amber-500" size={28} />
            </div>
            <p className="text-slate-500 text-sm mb-6">
              {t('auth.resetExpiredMsg', 'The password reset link has expired or is invalid. Please request a new one.')}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-800 transition-all w-full text-sm"
            >
              {t('auth.goHome', 'Back to Home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center px-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 px-7 pt-7 pb-5 text-white">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-700/60 p-2.5 rounded-xl">
                <Leaf size={20} className="text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t('auth.resetSuccessTitle', 'Password Updated')}</h2>
                <p className="text-emerald-300/80 text-xs">{t('auth.resetSuccessSubtitle', 'Your new password is ready to use')}</p>
              </div>
            </div>
          </div>
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 mb-2">
              {t('auth.resetSuccessHeading', 'All Done!')}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              {t('auth.resetSuccessMsg', 'Your password has been updated. You can now log in with your new password.')}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-800 transition-all w-full text-sm"
            >
              {t('auth.goToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main reset form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 px-7 pt-7 pb-5 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700/60 p-2.5 rounded-xl">
              <ShieldCheck size={20} className="text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {t('auth.resetTitle', 'Set New Password')}
              </h2>
              <p className="text-emerald-300/80 text-xs">
                {t('auth.resetSubtitle', 'Choose a strong password for your account')}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {serverError}
            </div>
          )}

          <InputField
            icon={Lock}
            label={t('auth.password')}
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
            placeholder={t('auth.passwordPlaceholder')}
            error={errors.password}
            rightEl={eyeBtn(showPass, setShowPass)}
          />

          {/* Strength bar */}
          {password && (
            <div className="flex items-center gap-2 -mt-1">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map(l => (
                  <div key={l} className={`h-1.5 flex-1 rounded-full transition-all ${strength >= l ? strengthColor : 'bg-slate-200'}`} />
                ))}
              </div>
              <span className="text-xs text-slate-400">{strengthLabel}</span>
            </div>
          )}

          <InputField
            icon={Lock}
            label={t('auth.confirmPassword')}
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => { setConfirm(e.target.value); if (errors.confirm) setErrors(p => ({ ...p, confirm: '' })); }}
            placeholder={t('auth.passwordPlaceholder')}
            error={errors.confirm}
            rightEl={eyeBtn(showConfirm, setShowConfirm)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 text-white font-bold py-3 rounded-xl hover:bg-emerald-800
              transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 text-sm mt-1"
          >
            {loading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {loading
              ? t('auth.loading')
              : t('auth.resetSaveButton', 'Save New Password')}
          </button>

          <p className="text-center text-xs text-slate-400 pb-1">
            <button type="button" onClick={() => navigate('/')} className="text-emerald-600 hover:underline font-medium">
              {t('auth.goHome', 'Back to Home')}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
