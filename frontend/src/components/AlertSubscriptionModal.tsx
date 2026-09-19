import React, { useState, useEffect, useRef } from 'react';
import { trackAlertSubscription } from '../services/analytics';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDIAN_STATES = [
  'National Capital Region (Delhi-NCR)',
  'Maharashtra',
  'Uttar Pradesh',
  'Karnataka',
  'Tamil Nadu',
  'Gujarat',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Rajasthan',
  'Telangana',
  'Madhya Pradesh',
  'Bihar',
  'Andhra Pradesh',
  'Kerala',
  'All India National Grid',
];

export const AlertSubscriptionModal: React.FC<AlertModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [threshold, setThreshold] = useState('poor'); // 'moderate', 'poor', 'severe', 'all'
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Math challenge state
  const [num1, setNum1] = useState(4);
  const [num2, setNum2] = useState(7);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Timing defense against fast bots (< 1.5s)
  const openTimeRef = useRef<number>(Date.now());
  const lastSubmitTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      // Generate random lightweight security challenge
      const n1 = Math.floor(Math.random() * 8) + 2;
      const n2 = Math.floor(Math.random() * 8) + 2;
      setNum1(n1);
      setNum2(n2);
      setCaptchaAnswer('');
      setErrors({});
      setTouched({});
      setSubmitted(false);
    }
  }, [isOpen]);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required.';
        if (value.trim().length < 2) return 'Name must be at least 2 characters.';
        if (value.trim().length > 50) return 'Name is too long.';
        return '';
      case 'email':
        if (!value.trim()) return 'Email address is required.';
        // RFC 5322 standard email regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        if (!emailRegex.test(value.trim())) return 'Please provide a valid email address (e.g. scientist@isro.gov.in).';
        return '';
      case 'region':
        if (!value) return 'Please select a geographical monitoring region.';
        return '';
      case 'captcha':
        if (!value.trim()) return 'Security calculation answer is required.';
        if (parseInt(value.trim(), 10) !== num1 + num2) return `Incorrect answer. Please solve: ${num1} + ${num2}`;
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Bot Honeypot check: If the hidden honeypot field is populated, silently abort
    if (honeypot.trim().length > 0) {
      console.warn("Spam bot trapped by honeypot filter.");
      setSubmitted(true);
      return;
    }

    // 2. Submission Speed Check: Rapid bots submitting in < 1.5s
    const elapsed = Date.now() - openTimeRef.current;
    if (elapsed < 1500) {
      setErrors((prev) => ({ ...prev, form: 'Submission too fast. Please take a moment to review before submitting.' }));
      return;
    }

    // 3. Client-Side Rate Limiter: Cooldown 20 seconds between attempts
    const timeSinceLast = Date.now() - lastSubmitTimeRef.current;
    if (lastSubmitTimeRef.current > 0 && timeSinceLast < 20000) {
      const waitSec = Math.ceil((20000 - timeSinceLast) / 1000);
      setErrors((prev) => ({ ...prev, form: `Rate limit in effect. Please wait ${waitSec}s before submitting again.` }));
      return;
    }

    // 4. Validate all form fields
    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const regionErr = validateField('region', region);
    const captchaErr = validateField('captcha', captchaAnswer);

    const allErrors = {
      name: nameErr,
      email: emailErr,
      region: regionErr,
      captcha: captchaErr,
    };

    setTouched({ name: true, email: true, region: true, captcha: true });
    setErrors(allErrors);

    if (nameErr || emailErr || regionErr || captchaErr) {
      return;
    }

    // Form is strictly valid!
    setSubmitting(true);
    lastSubmitTimeRef.current = Date.now();

    try {
      // Simulate microservice dispatch (or save to localStorage as genuine registered subscriber)
      await new Promise((r) => setTimeout(r, 700));

      const existingSubs = JSON.parse(localStorage.getItem('aerovision_alert_subscriptions') || '[]');
      existingSubs.push({
        name,
        email,
        region,
        threshold,
        subscribed_at: new Date().toISOString(),
      });
      localStorage.setItem('aerovision_alert_subscriptions', JSON.stringify(existingSubs));

      trackAlertSubscription(region, threshold);
      setSubmitted(true);
    } catch (err) {
      setErrors({ form: 'An unexpected error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer text-xl"
          aria-label="Close dialog"
        >
          ✕
        </button>

        {!submitted ? (
          <>
            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">
                <span>🔔 Early Warning Telemetry</span>
                <span>•</span>
                <span>National Grid Dispatch</span>
              </div>
              <h2 id="alert-modal-title" className="text-2xl font-extrabold text-white tracking-tight">
                Subscribe to Air Quality & Hotspot Alerts
              </h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Receive automated alerts whenever ground CPCB particulate concentrations or Sentinel-5P HCHO columns exceed safety thresholds in your region.
              </p>
            </div>

            {/* Error Banner */}
            {errors.form && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errors.form}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Invisible Honeypot Spam Trap for Automated Bots */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <label htmlFor="hp_sub_code">Leave empty</label>
                <input
                  type="text"
                  id="hp_sub_code"
                  name="hp_sub_code"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Name Field */}
              <div>
                <label htmlFor="sub-name" className="block text-xs font-semibold text-slate-200 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="sub-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (touched.name) handleBlur('name', e.target.value);
                  }}
                  onBlur={() => handleBlur('name', name)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-sm text-white placeholder-slate-500 transition-all focus:outline-none ${
                    touched.name && errors.name
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-700 focus:border-purple-500'
                  }`}
                  aria-invalid={!!(touched.name && errors.name)}
                  aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                />
                {touched.name && errors.name && (
                  <p id="name-error" className="text-red-400 text-xs mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="sub-email" className="block text-xs font-semibold text-slate-200 mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  id="sub-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) handleBlur('email', e.target.value);
                  }}
                  onBlur={() => handleBlur('email', email)}
                  placeholder="e.g. rajesh@environment.res.in"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-sm text-white placeholder-slate-500 transition-all focus:outline-none ${
                    touched.email && errors.email
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-700 focus:border-purple-500'
                  }`}
                  aria-invalid={!!(touched.email && errors.email)}
                  aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                />
                {touched.email && errors.email && (
                  <p id="email-error" className="text-red-400 text-xs mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Region Selector */}
              <div>
                <label htmlFor="sub-region" className="block text-xs font-semibold text-slate-200 mb-1">
                  Target Region <span className="text-red-400">*</span>
                </label>
                <select
                  id="sub-region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    if (touched.region) handleBlur('region', e.target.value);
                  }}
                  onBlur={() => handleBlur('region', region)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-sm text-white transition-all focus:outline-none ${
                    touched.region && errors.region
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-700 focus:border-purple-500'
                  }`}
                  aria-invalid={!!(touched.region && errors.region)}
                >
                  <option value="">Select Monitoring Zone...</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {touched.region && errors.region && (
                  <p className="text-red-400 text-xs mt-1">{errors.region}</p>
                )}
              </div>

              {/* Threshold Preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Alert Severity Filter
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    threshold === 'poor' ? 'border-purple-500 bg-purple-950/30 text-purple-200' : 'border-slate-700 bg-slate-800/40 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="threshold"
                      value="poor"
                      checked={threshold === 'poor'}
                      onChange={() => setThreshold('poor')}
                      className="accent-purple-500"
                    />
                    <span>Poor & Severe (AQI &gt; 200)</span>
                  </label>
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    threshold === 'all' ? 'border-purple-500 bg-purple-950/30 text-purple-200' : 'border-slate-700 bg-slate-800/40 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="threshold"
                      value="all"
                      checked={threshold === 'all'}
                      onChange={() => setThreshold('all')}
                      className="accent-purple-500"
                    />
                    <span>Daily Summary Briefing</span>
                  </label>
                </div>
              </div>

              {/* Spam/Bot Verification Puzzle */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label htmlFor="sub-captcha" className="block text-xs font-semibold text-slate-200">
                    Security Verification: What is <span className="text-purple-400 font-mono font-bold">{num1} + {num2}</span>?
                  </label>
                  <p className="text-[10px] text-slate-400">Protects our national pipeline from bot spam.</p>
                </div>
                <div className="w-24">
                  <input
                    id="sub-captcha"
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => {
                      setCaptchaAnswer(e.target.value);
                      if (touched.captcha) handleBlur('captcha', e.target.value);
                    }}
                    onBlur={() => handleBlur('captcha', captchaAnswer)}
                    placeholder="Answer"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-center text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
              {touched.captcha && errors.captcha && (
                <p className="text-red-400 text-xs">{errors.captcha}</p>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      <span>Verifying & Registering...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Activate Early Warning Alerts</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Strict adherence to the Indian DPDP Act 2023. You can unsubscribe at any instant.
              </p>
            </form>
          </>
        ) : (
          /* Confirmation State */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-white">Alert Subscription Activated!</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Real-time atmospheric telemetry and CPCB threshold alerts for <strong className="text-purple-300">{region}</strong> will be dispatched to <strong className="text-purple-300">{email}</strong>.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertSubscriptionModal;
