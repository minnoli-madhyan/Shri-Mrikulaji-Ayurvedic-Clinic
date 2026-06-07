// src/components/AuthModal.jsx
// Fully i18n-enabled. All UI strings use t() from react-i18next.
// Now includes: Login · Sign Up · Forgot Password (inline view)

import React, { useState } from 'react';
import {
  X, Mail, Lock, User, Phone, Eye, EyeOff,
  CheckCircle, Leaf, AlertCircle, ArrowLeft, KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

// ─── Reusable input ──────────────────────────────────────────────────────────
const InputField = ({
  icon: Icon, label, type = 'text', value, onChange,
  onBlur, placeholder, error, rightEl, maxLength, inputMode,
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={15} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`w-full pl-9 ${rightEl ? 'pr-10' : 'pr-4'} py-2.5 border rounded-xl text-sm outline-none
          focus:ring-2 transition-all
          ${error
            ? 'border-red-400 bg-red-50 focus:ring-red-300'
            : 'border-slate-200 focus:ring-emerald-400'}`}
      />
      {rightEl && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
      )}
    </div>
    {error && (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
        <AlertCircle size={10} />{error}
      </p>
    )}
  </div>
);

// ─── View enum ───────────────────────────────────────────────────────────────
const VIEW = { LOGIN: 'login', SIGNUP: 'signup', FORGOT: 'forgot', FORGOT_SENT: 'forgot_sent' };

// ─── Main component ──────────────────────────────────────────────────────────
const AuthModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { signIn, signUp, sendPasswordReset } = useAuth();

  const [view, setView]           = useState(VIEW.LOGIN);
  const [showPass, setShowPass]   = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [serverError, setServerError] = useState('');
  const [form, setForm]           = useState({
    name: '', email: '', phone: '',
    password: '', confirmPassword: '',
    resetEmail: '',
  });
  const [errors, setErrors]       = useState({});

  if (!isOpen) return null;

  // ── Validation ──────────────────────────────────────────────────────────
  const validateField = (key, value) => {
    switch (key) {
      case 'name':
        if (!value.trim()) return t('auth.validation.nameRequired');
        if (value.trim().length < 3) return t('auth.validation.nameMinLength');
        return '';
      case 'phone':
        if (!value.trim()) return t('auth.validation.phoneRequired');
        if (!/^[6-9]\d{9}$/.test(value.replace(/[\s\-+]/g, '')))
          return t('auth.validation.phoneInvalid');
        return '';
      case 'email':
        if (!value.trim()) return t('auth.validation.emailRequired');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return t('auth.validation.emailInvalid');
        return '';
      case 'password':
        if (!value) return t('auth.validation.passwordRequired');
        if (value.length < 6) return t('auth.validation.passwordMinLength');
        return '';
      case 'resetEmail':
        if (!value.trim()) return t('auth.validation.emailRequired');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return t('auth.validation.emailInvalid');
        return '';
      default: return '';
    }
  };

  // ── Field helpers ───────────────────────────────────────────────────────
  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
    if (serverError) setServerError('');
  };

  const blur = (k, v) => {
    const err = validateField(k, v);
    if (err) setErrors(e => ({ ...e, [k]: err }));
  };

  // ── Validate whole form ─────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (view === VIEW.SIGNUP) {
      const nameErr  = validateField('name',  form.name);
      const phoneErr = validateField('phone', form.phone);
      if (nameErr)  e.name  = nameErr;
      if (phoneErr) e.phone = phoneErr;
    }
    if (view !== VIEW.FORGOT) {
      const emailErr = validateField('email', form.email);
      const passErr  = validateField('password', form.password);
      if (emailErr) e.email    = emailErr;
      if (passErr)  e.password = passErr;
      if (view === VIEW.SIGNUP && form.password !== form.confirmPassword)
        e.confirmPassword = t('auth.validation.passwordMismatch');
    }
    return e;
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ── Forgot password submit ──
    if (view === VIEW.FORGOT) {
      const resetEmailErr = validateField('resetEmail', form.resetEmail);
      if (resetEmailErr) { setErrors({ resetEmail: resetEmailErr }); return; }
      setLoading(true);
      setServerError('');
      const { error } = await sendPasswordReset(form.resetEmail.trim());
      setLoading(false);
      if (error) { setServerError(error.message); return; }
      setView(VIEW.FORGOT_SENT);
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError('');

    if (view === VIEW.LOGIN) {
      const { data, error } = await signIn({ email: form.email, password: form.password });
      setLoading(false);
      if (error) { setServerError(error.message); return; }
      if (!data?.session) {
        setServerError(t('auth.validation.emailConfirmRequired'));
        return;
      }
      onClose();
    } else {
      const { error } = await signUp({
        email: form.email, password: form.password,
        name: form.name, phone: form.phone,
      });
      setLoading(false);
      if (error) { setServerError(error.message); return; }
      onClose();
    }
  };

  const handleClose = () => {
    setView(VIEW.LOGIN);
    setServerError('');
    setForm({ name: '', email: '', phone: '', password: '', confirmPassword: '', resetEmail: '' });
    setErrors({});
    setShowPass(false);
    setShowConfirmPass(false);
    onClose();
  };

  const switchMode = (targetView) => {
    setView(targetView);
    setErrors({});
    setServerError('');
    setForm({ name: '', email: '', phone: '', password: '', confirmPassword: '', resetEmail: '' });
    setShowPass(false);
    setShowConfirmPass(false);
  };

  // ── Password strength (signup) ──────────────────────────────────────────
  const strength      = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthLabel = ['', t('auth.passwordStrength.weak'), t('auth.passwordStrength.fair'), t('auth.passwordStrength.strong')][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'][strength];
  const eyeBtn = (show, setShow) => (
    <button type="button" onClick={() => setShow(!show)} className="text-slate-400 hover:text-slate-600">
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  // ── Header copy ─────────────────────────────────────────────────────────
  const headerTitle = view === VIEW.FORGOT || view === VIEW.FORGOT_SENT
    ? t('auth.forgotTitle', 'Reset Password')
    : view === VIEW.LOGIN
      ? t('auth.modalTitle')
      : t('auth.modalTitleSignup');

  const headerSubtitle = view === VIEW.FORGOT
    ? t('auth.forgotSubtitle', 'Enter your email to receive a reset link')
    : view === VIEW.FORGOT_SENT
      ? t('auth.forgotSentSubtitle', 'Check your inbox')
      : view === VIEW.LOGIN
        ? t('auth.modalSubtitle')
        : t('auth.modalSubtitleSignup');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 px-7 pt-7 pb-5 text-white relative">
          <button
            onClick={handleClose}
            aria-label={t('auth.close')}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-700/60 p-2.5 rounded-xl">
              {view === VIEW.FORGOT || view === VIEW.FORGOT_SENT
                ? <KeyRound size={20} className="text-emerald-300" />
                : <Leaf size={20} className="text-emerald-300" />
              }
            </div>
            <div>
              <h2 className="text-lg font-bold">{headerTitle}</h2>
              <p className="text-emerald-300/80 text-xs">{headerSubtitle}</p>
            </div>
          </div>

          {/* Login / Signup tabs — hidden on forgot views */}
          {view !== VIEW.FORGOT && view !== VIEW.FORGOT_SENT && (
            <div className="flex bg-emerald-900/50 rounded-xl p-1 gap-1 mt-1">
              {[VIEW.LOGIN, VIEW.SIGNUP].map(v => (
                <button
                  key={v}
                  onClick={() => view !== v && switchMode(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${view === v ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-300 hover:text-white'}`}
                >
                  {v === VIEW.LOGIN ? t('auth.login') : t('auth.signUp')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Forgot-password sent confirmation ────────────────────── */}
        {view === VIEW.FORGOT_SENT && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 mb-2">
              {t('auth.forgotSentTitle', 'Reset Email Sent!')}
            </h3>
            <p className="text-slate-500 text-sm mb-1">
              {t('auth.forgotSentMsg', 'We\'ve sent a password reset link to')}
            </p>
            <p className="text-emerald-700 font-semibold text-sm mb-6 break-all">
              {form.resetEmail}
            </p>
            <p className="text-slate-400 text-xs mb-6">
              {t('auth.forgotSentNote', 'Click the link in that email to choose a new password. The link expires in 1 hour.')}
            </p>
            <button
              onClick={() => switchMode(VIEW.LOGIN)}
              className="bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-800 transition-all w-full text-sm"
            >
              {t('auth.goToLogin')}
            </button>
            <p className="text-slate-400 text-xs mt-4">
              {t('auth.forgotNoEmail', 'Didn\'t receive it?')}{' '}
              <button
                type="button"
                onClick={() => switchMode(VIEW.FORGOT)}
                className="text-emerald-600 font-semibold hover:underline"
              >
                {t('auth.forgotResend', 'Resend')}
              </button>
            </p>
          </div>
        )}

        {/* ── Forgot-password form ──────────────────────────────────── */}
        {view === VIEW.FORGOT && (
          <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">
            <button
              type="button"
              onClick={() => switchMode(VIEW.LOGIN)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-700 transition-colors font-medium"
            >
              <ArrowLeft size={13} />{t('auth.backToLogin', 'Back to Login')}
            </button>

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {serverError}
              </div>
            )}

            <InputField
              icon={Mail}
              label={t('auth.emailAddress')}
              type="email"
              value={form.resetEmail}
              onChange={e => update('resetEmail', e.target.value)}
              onBlur={e => blur('resetEmail', e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              error={errors.resetEmail}
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
                : t('auth.forgotSendLink', 'Send Reset Link')}
            </button>
          </form>
        )}

        {/* ── Login / Signup form ───────────────────────────────────── */}
        {(view === VIEW.LOGIN || view === VIEW.SIGNUP) && (
          <form onSubmit={handleSubmit} className="px-7 py-5 space-y-3.5">

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {serverError}
              </div>
            )}

            {view === VIEW.SIGNUP && (
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  icon={User}
                  label={t('auth.fullName')}
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  onBlur={e => blur('name', e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  error={errors.name}
                />
                <div>
                  <InputField
                    icon={Phone}
                    label={t('auth.phoneNumber')}
                    value={form.phone}
                    onChange={e => { const v = e.target.value.replace(/\D/g, ''); update('phone', v.slice(0, 10)); }}
                    onBlur={e => blur('phone', e.target.value)}
                    placeholder={t('auth.phonePlaceholder')}
                    error={errors.phone}
                    maxLength={10}
                    inputMode="numeric"
                  />
                  <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                    {t('auth.whatsappHint')}
                  </p>
                </div>
              </div>
            )}

            <InputField
              icon={Mail}
              label={t('auth.emailAddress')}
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              onBlur={e => blur('email', e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              error={errors.email}
            />

            <InputField
              icon={Lock}
              label={t('auth.password')}
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={e => update('password', e.target.value)}
              onBlur={e => blur('password', e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              error={errors.password}
              rightEl={eyeBtn(showPass, setShowPass)}
            />

            {view === VIEW.SIGNUP && form.password && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map(l => (
                    <div key={l} className={`h-1.5 flex-1 rounded-full transition-all ${strength >= l ? strengthColor : 'bg-slate-200'}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-400">{strengthLabel}</span>
              </div>
            )}

            {view === VIEW.SIGNUP && (
              <InputField
                icon={Lock}
                label={t('auth.confirmPassword')}
                type={showConfirmPass ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                error={errors.confirmPassword}
                rightEl={eyeBtn(showConfirmPass, setShowConfirmPass)}
              />
            )}

            {view === VIEW.LOGIN && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode(VIEW.FORGOT)}
                  className="text-xs text-emerald-600 hover:underline font-semibold"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

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
                : view === VIEW.LOGIN
                  ? t('auth.loginButton')
                  : t('auth.signupButton')}
            </button>

            <p className="text-center text-slate-400 text-xs pb-1">
              {view === VIEW.LOGIN ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchMode(view === VIEW.LOGIN ? VIEW.SIGNUP : VIEW.LOGIN)}
                className="font-bold text-emerald-700 hover:underline"
              >
                {view === VIEW.LOGIN ? t('auth.signUp') : t('auth.login')}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
