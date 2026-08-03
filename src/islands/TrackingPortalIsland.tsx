import { AlertCircle, Building2, LoaderCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '../config/site';
import {
  PortalApiError,
  createRuntimeApi,
  hasSessionHint,
  setSessionHint,
  type AuthUser,
} from '../lib/runtime-api';
import CustomerPortalPanel from './CustomerPortalPanel';
import TrackingPublicIsland from './TrackingPublicIsland';

interface Props {
  locale: Locale;
  messages: Record<string, string>;
  backendOrigin: string;
  loginHref: string;
  contactHref: string;
  mitraHref: string;
}

type SessionState = 'guest' | 'checking' | 'customer' | 'other' | 'error';

export default function TrackingPortalIsland({
  locale,
  messages,
  backendOrigin,
  loginHref,
  contactHref,
  mitraHref,
}: Props) {
  const api = useMemo(() => createRuntimeApi({ origin: backendOrigin }), [backendOrigin]);
  const [sessionState, setSessionState] = useState<SessionState>('guest');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionError, setSessionError] = useState('');

  const resolveSession = useCallback(async () => {
    if (!hasSessionHint()) {
      setSessionState('guest');
      setUser(null);
      return;
    }

    setSessionState('checking');
    setSessionError('');
    try {
      const current = await api.currentUser();
      if (!current) {
        setSessionHint(false);
        setUser(null);
        setSessionState('guest');
        return;
      }

      setUser(current);
      setSessionState(current.role === 'customer' ? 'customer' : 'other');
    } catch (caught) {
      if (caught instanceof PortalApiError && caught.code === 'SESSION_EXPIRED') {
        setSessionHint(false);
        setUser(null);
        setSessionState('guest');
        return;
      }
      setSessionError(caught instanceof Error ? caught.message : 'Sesi belum dapat diperiksa.');
      setSessionState('error');
    }
  }, [api]);

  useEffect(() => { void resolveSession(); }, [resolveSession]);

  function handleLogout() {
    setSessionHint(false);
    setUser(null);
    setSessionState('guest');
  }

  if (sessionState === 'checking') {
    return <main className="flex min-h-screen items-center justify-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-elm" size={36} /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Memeriksa sesi aman</p></div></main>;
  }

  if (sessionState === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div role="alert" className="w-full max-w-xl rounded-3xl border border-red-100 bg-white p-10 text-center shadow-xl">
          <AlertCircle className="mx-auto text-red-500" size={36} />
          <h1 className="mt-4 text-2xl font-black text-big-stone">Sesi belum dapat diperiksa</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{sessionError}</p>
          <button type="button" onClick={() => void resolveSession()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-elm px-5 py-3 text-xs font-bold uppercase tracking-wider text-white"><RefreshCw size={15} />Coba lagi</button>
        </div>
      </main>
    );
  }

  if (sessionState === 'customer' && user) {
    return (
      <>
        <CustomerPortalPanel
          user={user}
          backendOrigin={backendOrigin}
          loginHref={loginHref}
          contactHref={contactHref}
          onLogout={handleLogout}
        />
        <TrackingPublicIsland
          locale={locale}
          messages={messages}
          backendOrigin={backendOrigin}
          loginHref={loginHref}
          showLogin={false}
        />
      </>
    );
  }

  if (sessionState === 'other' && user) {
    const isMitra = user.role === 'notaris' || user.role === 'staff_notaris';
    return (
      <>
        <section className="mx-auto w-full max-w-4xl px-4 pb-4 pt-32 text-center">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <Building2 className="mx-auto text-elm" size={34} />
            <h1 className="mt-4 text-2xl font-black text-big-stone">Halo, {user.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{isMitra ? 'Akun ini menggunakan portal mitra.' : 'Akun ini tidak menggunakan portal klien.'}</p>
            {isMitra && <a href={mitraHref} className="mt-6 inline-flex rounded-xl bg-elm px-5 py-3 text-xs font-bold uppercase tracking-wider text-white">Buka portal mitra</a>}
          </div>
        </section>
        <TrackingPublicIsland locale={locale} messages={messages} backendOrigin={backendOrigin} loginHref={loginHref} showLogin={false} />
      </>
    );
  }

  return <TrackingPublicIsland locale={locale} messages={messages} backendOrigin={backendOrigin} loginHref={loginHref} />;
}
