import { ChevronDown, LayoutDashboard, LogOut, RefreshCw, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { authDestination, resolveAuthNavigation, type AuthNavigationState } from '../lib/auth-navigation';
import { createRuntimeApi, hasSessionHint } from '../lib/runtime-api';

interface Labels {
  login: string;
  account: string;
  activeAccount: string;
  adminDashboard: string;
  partnerPortal: string;
  customerPortal: string;
  logout: string;
  retry: string;
}

interface Props {
  variant: 'desktop' | 'mobile';
  backendOrigin: string;
  loginHref: string;
  customerHref: string;
  partnerHref: string;
  labels: Labels;
}

const sessionRequests = new Map<string, Promise<AuthNavigationState>>();

function sharedSession(origin: string, reload = false): Promise<AuthNavigationState> {
  if (reload) sessionRequests.delete(origin);
  const existing = sessionRequests.get(origin);
  if (existing) return existing;

  const api = createRuntimeApi({ origin });
  const request = resolveAuthNavigation(hasSessionHint(), api.currentUser);
  sessionRequests.set(origin, request);
  return request;
}

export default function AuthNavIsland({
  variant,
  backendOrigin,
  loginHref,
  customerHref,
  partnerHref,
  labels,
}: Props) {
  const api = useMemo(() => createRuntimeApi({ origin: backendOrigin }), [backendOrigin]);
  const [session, setSession] = useState<AuthNavigationState>({ status: 'guest', user: null });
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);

  const resolve = useCallback(async (reload = false) => {
    if (!hasSessionHint()) {
      setSession({ status: 'guest', user: null });
      setChecking(false);
      return;
    }

    setChecking(true);
    const next = await sharedSession(backendOrigin, reload);
    setSession(next);
    setChecking(false);
  }, [backendOrigin]);

  useEffect(() => {
    void resolve();
    const sync = () => void resolve(true);
    window.addEventListener('storage', sync);
    window.addEventListener('awan-auth-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('awan-auth-change', sync);
    };
  }, [resolve]);

  const logout = async () => {
    setChecking(true);
    try {
      await api.logout();
      window.dispatchEvent(new Event('awan-auth-change'));
      window.location.assign(loginHref);
    } catch {
      setSession({ status: 'unavailable', user: null });
      setChecking(false);
    }
  };

  if (checking && session.status === 'guest') {
    return <span className={variant === 'desktop' ? 'h-9 w-20 animate-pulse rounded-full bg-slate-200' : 'h-12 w-full animate-pulse rounded-full bg-white/10'} aria-label={labels.account}></span>;
  }

  if (session.status === 'unavailable') {
    return (
      <button
        type="button"
        onClick={() => void resolve(true)}
        className={variant === 'desktop'
          ? 'inline-flex items-center gap-2 rounded-full border border-amber-300 px-4 py-2 text-[11px] font-bold text-amber-700 hover:bg-amber-50'
          : 'inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-400/60 px-6 py-4 text-sm font-bold tracking-widest text-amber-300'}
      >
        <RefreshCw size={14} />{labels.retry}
      </button>
    );
  }

  if (session.status === 'guest') {
    return (
      <a
        href={loginHref}
        className={variant === 'desktop'
          ? 'whitespace-nowrap rounded-full border border-elm px-4 py-2 text-[11px] font-bold text-elm transition-colors hover:bg-elm hover:text-white xl:px-5 xl:py-2.5 xl:text-xs'
          : 'flex w-full items-center justify-center rounded-full border border-slate-600 px-6 py-4 text-sm font-bold tracking-widest text-white transition-colors hover:bg-white/10'}
      >
        {labels.login}
      </a>
    );
  }

  const { user } = session;
  const destination = authDestination(user.role);
  const dashboardHref = destination === 'admin'
    ? `${backendOrigin}/admin`
    : destination === 'mitra'
      ? partnerHref
      : customerHref;
  const dashboardLabel = destination === 'admin'
    ? labels.adminDashboard
    : destination === 'mitra'
      ? labels.partnerPortal
      : labels.customerPortal;

  if (variant === 'mobile') {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="rounded-2xl border border-white/10 px-5 py-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{labels.activeAccount}</p>
          <p className="mt-1 truncate text-sm font-bold">{user.email}</p>
        </div>
        <a href={dashboardHref} className="flex w-full items-center justify-center gap-2 rounded-full border border-elm px-6 py-4 text-sm font-bold tracking-widest text-elm">
          <LayoutDashboard size={18} />{dashboardLabel}
        </a>
        <button type="button" onClick={() => void logout()} className="flex w-full items-center justify-center gap-2 rounded-full border border-red-500/50 px-6 py-4 text-sm font-bold tracking-widest text-red-400">
          <LogOut size={18} />{labels.logout}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-elm/20 bg-elm/10 px-4 py-2 text-[11px] font-bold text-elm transition-colors hover:border-elm hover:bg-elm hover:text-white xl:px-5 xl:py-2.5 xl:text-xs">
        <User size={14} strokeWidth={2.5} />
        <span>{user.name.split(' ')[0]}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      <div className={`absolute right-0 top-full z-50 w-56 pt-3 transition-[opacity,visibility,transform] duration-300 ${open ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0'}`}>
        <div className="flex flex-col gap-1 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
          <div className="mb-1 border-b border-slate-100 px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{labels.activeAccount}</p>
            <p className="truncate text-xs font-bold text-big-stone">{user.email}</p>
          </div>
          <a href={dashboardHref} className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-elm/10 hover:text-elm">
            <LayoutDashboard size={16} />{dashboardLabel}
          </a>
          <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50">
            <LogOut size={16} />{labels.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
