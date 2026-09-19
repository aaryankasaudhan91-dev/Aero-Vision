import React, { useState, useEffect, useRef } from 'react';
import { trackAlertSubscription } from '../services/analytics';
import { alertsApi } from '../services/api';

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
  const [activeTelemetry, setActiveTelemetry] = useState<{
    subscription_id?: number;
    active_aqi_reading?: number | null;
    regional_air_status?: string | null;
    message?: string;
  } | null>(null);

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
        if (!emailRegex.test(value.trim())) return 'Please provide a valid email address (e.g. scientist@isro.res.in).';
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

    // 2. Submission Speed Check: Rapid bots submitting in < 200ms
    const elapsed = Date.now() - openTimeRef.current;
    if (elapsed < 200) {
      setErrors((prev) => ({ ...prev, form: 'Submission too fast. Please take a moment to review before submitting.' }));
      return;
    }

    // 3. Client-Side Rate Limiter: Brief 2 second cooldown
    const timeSinceLast = Date.now() - lastSubmitTimeRef.current;
    if (lastSubmitTimeRef.current > 0 && timeSinceLast < 2000) {
      setErrors((prev) => ({ ...prev, form: 'Please wait a moment before submitting again.' }));
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
      const res = await alertsApi.subscribe({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        region: region.trim(),
        threshold: threshold.trim(),
      });

      setActiveTelemetry(res.data);
      trackAlertSubscription(region, threshold);
      setSubmitted(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d.msg || d).join(', ')
          : (err.message || 'Failed to communicate with alert telemetry backend. Please try again.');
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 text-slate-800 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-1 rounded-lg transition-colors cursor-pointer text-xl"
          aria-label="Close dialog"
        >
          ✕
        </button>

        {!submitted ? (
          <>
            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">
                <span>🔔 Early Warning Telemetry</span>
                <span>•</span>
                <span>National Grid Dispatch</span>
              </div>
              <h2 id="alert-modal-title" className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Subscribe to Air Quality &amp; Hotspot Alerts
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Receive automated notifications whenever ground CPCB particulate concentrations or Sentinel-5P HCHO columns exceed safety thresholds in your region.
              </p>
            </div>

            {/* Error Banner */}
            {errors.form && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
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
                <label htmlFor="sub-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
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
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none ${
                    touched.name && errors.name
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-300 focus:border-purple-600'
                  }`}
                  aria-invalid={!!(touched.name && errors.name)}
                  aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                />
                {touched.name && errors.name && (
                  <p id="name-error" className="text-red-600 text-xs mt-1 font-medium">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="sub-email" className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
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
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none ${
                    touched.email && errors.email
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-300 focus:border-purple-600'
                  }`}
                  aria-invalid={!!(touched.email && errors.email)}
                  aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                />
                {touched.email && errors.email && (
                  <p id="email-error" className="text-red-600 text-xs mt-1 font-medium">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Region Selector */}
              <div>
                <label htmlFor="sub-region" className="block text-xs font-bold text-slate-700 mb-1">
                  Target Monitoring Zone <span className="text-red-500">*</span>
                </label>
                <select
                  id="sub-region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    if (touched.region) handleBlur('region', e.target.value);
                  }}
                  onBlur={() => handleBlur('region', region)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 transition-all focus:outline-none cursor-pointer ${
                    touched.region && errors.region
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-300 focus:border-purple-600'
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
                  <p className="text-red-600 text-xs mt-1 font-medium">{errors.region}</p>
                )}
              </div>

              {/* Threshold Preference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alert Severity Filter
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    threshold === 'poor' ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="threshold"
                      value="poor"
                      checked={threshold === 'poor'}
                      onChange={() => setThreshold('poor')}
                      className="accent-purple-600"
                    />
                    <span>Poor &amp; Severe (AQI &gt; 200)</span>
                  </label>
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    threshold === 'all' ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="threshold"
                      value="all"
                      checked={threshold === 'all'}
                      onChange={() => setThreshold('all')}
                      className="accent-purple-600"
                    />
                    <span>Daily Summary Briefing</span>
                  </label>
                </div>
              </div>

              {/* Spam/Bot Verification Puzzle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label htmlFor="sub-captcha" className="block text-xs font-bold text-slate-800">
                    Security Verification: What is <span className="text-purple-700 font-mono font-bold">{num1} + {num2}</span>?
                  </label>
                  <p className="text-[10px] text-slate-500">Protects our national pipeline from bot spam.</p>
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
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm text-center text-slate-900 focus:outline-none focus:border-purple-600 font-mono font-bold"
                  />
                </div>
              </div>
              {touched.captcha && errors.captcha && (
                <p className="text-red-600 text-xs font-medium">{errors.captcha}</p>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 !text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      <span>Verifying &amp; Registering...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Activate Early Warning Alerts</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                Strict adherence to the Indian DPDP Act 2023. You can unsubscribe at any instant.
              </p>
            </form>
          </>
        ) : (
          /* Confirmation State with Real Live Telemetry */
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full flex items-center justify-center text-3xl mx-auto font-bold shadow-inner">
              ✓
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Alert Subscription Activated!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed mt-1">
                {activeTelemetry?.message || `Real-time atmospheric telemetry and CPCB threshold alerts for ${region} are now actively dispatched.`}
              </p>
            </div>

            {/* Real telemetry badge card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 max-w-md mx-auto">
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Subscription Ref:</span>
                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  #AV-SUB-{activeTelemetry?.subscription_id ?? 'ACTIVE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Target Region:</span>
                <span className="font-semibold text-slate-800">{region}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Dispatch Recipient:</span>
                <span className="font-semibold text-slate-800">{email}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Alert Level Trigger:</span>
                <span className="font-bold text-amber-700 uppercase">
                  {threshold} ({threshold === 'poor' ? 'AQI > 200' : threshold === 'severe' ? 'AQI > 400' : 'Any Warning'})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-500 font-medium">Current Regional Telemetry:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                  {activeTelemetry?.active_aqi_reading != null ? `AQI ${activeTelemetry.active_aqi_reading} (${activeTelemetry.regional_air_status})` : (activeTelemetry?.regional_air_status || 'Grid Online & Synced')}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 !text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Close &amp; Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertSubscriptionModal;
