import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import type { Locale } from '../config/site';
import type { LoginCopy } from '../content/auth';
import { PortalApiError, createRuntimeApi, safeLocalRedirect } from '../lib/runtime-api';

interface Props {
  locale: Locale;
  copy: LoginCopy;
  homeHref: string;
  contactHref: string;
  trackingHref: string;
  mitraHref: string;
  backendOrigin: string;
}

const ADMIN_ROLES = new Set(['super_admin', 'manager', 'admin']);

export default function LoginIsland({
  copy,
  homeHref,
  contactHref,
  trackingHref,
  mitraHref,
  backendOrigin,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError(copy.missing);
      return;
    }

    setLoading(true);
    try {
      const user = await createRuntimeApi({ origin: backendOrigin }).login(email.trim(), password, remember);
      const requested = new URLSearchParams(window.location.search).get('redirect');

      if (user.role === 'notaris' || user.role === 'staff_notaris') {
        window.location.assign(safeLocalRedirect(requested, mitraHref));
      } else if (user.role && ADMIN_ROLES.has(user.role)) {
        window.location.assign(`${backendOrigin.replace(/\/+$/, '')}/admin`);
      } else {
        window.location.assign(safeLocalRedirect(requested, trackingHref));
      }
    } catch (caught) {
      setError(caught instanceof PortalApiError && caught.code === 'NETWORK_ERROR'
        ? copy.network
        : caught instanceof Error ? caught.message : copy.failed);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 sm:px-0">
      <a href={homeHref} className="mb-10 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-elm sm:text-xs">
        <ArrowLeft size={16} aria-hidden="true" /> {copy.back}
      </a>

      <div className="mb-9">
        <h1 className="mb-3 text-3xl font-black tracking-tighter text-big-stone md:text-4xl">{copy.title}</h1>
        <p className="text-[13px] font-medium leading-relaxed text-gray-500">{copy.description}</p>
      </div>

      <div className={`mb-6 rounded-xl border p-4 ${error ? 'border-red-100 bg-red-50' : 'border-elm/10 bg-elm/5'}`} role={error ? 'alert' : undefined}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${error ? 'bg-red-100 text-red-600' : 'bg-elm/10 text-elm'}`}>
            {error ? <AlertCircle size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
          </div>
          <div>
            <p className={`mb-1 text-xs font-bold ${error ? 'text-red-800' : 'text-big-stone'}`}>{error ? copy.failed : copy.noticeTitle}</p>
            <p className={`text-[11px] leading-relaxed ${error ? 'text-red-600' : 'text-gray-500'}`}>{error || copy.noticeDescription}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <label className="relative block">
          <span className="absolute -top-2 left-5 z-10 bg-[#fafafa] px-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400">{copy.email}</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border-2 border-gray-100 bg-white px-5 py-4 text-[13px] font-bold text-big-stone shadow-sm outline-none transition-colors focus:border-elm"
            placeholder={copy.emailPlaceholder}
          />
        </label>

        <label className="relative block">
          <span className="absolute -top-2 left-5 z-10 bg-[#fafafa] px-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400">{copy.password}</span>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border-2 border-gray-100 bg-white py-4 pl-5 pr-12 text-[13px] font-bold tracking-widest text-big-stone shadow-sm outline-none transition-colors focus:border-elm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 transition-colors hover:text-elm"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </label>

        <label className="flex cursor-pointer select-none items-center gap-2 px-1 text-xs font-bold text-gray-500">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={loading} className="size-4 rounded border-gray-300 text-elm focus:ring-elm" />
          {copy.remember}
        </label>

        <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center rounded-xl bg-elm py-4 text-[13px] font-bold tracking-widest text-white shadow-lg shadow-elm/20 transition-colors hover:bg-big-stone disabled:cursor-wait disabled:opacity-60">
          <span className="flex items-center gap-2">{loading ? copy.submitting : copy.submit}<ArrowRight size={16} aria-hidden="true" /></span>
        </button>
      </form>

      <p className="mt-10 text-center text-xs font-bold tracking-wide text-gray-400">
        {copy.noAccount} <a href={contactHref} className="text-elm transition-colors hover:text-big-stone">{copy.contact}</a>
      </p>
    </div>
  );
}
