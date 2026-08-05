import {
  Clipboard,
  Download,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import type { Locale } from '../config/site';
import { gsap } from '../lib/gsap';
import {
  PortalApiError,
  createRuntimeApi,
  trackingDocumentUrl,
  type TrackingOrder,
} from '../lib/runtime-api';
import TrackingTimeline from './portal/TrackingTimeline';

interface Props {
  locale: Locale;
  messages: Record<string, string>;
  backendOrigin: string;
  isTab?: boolean;
}

type LookupState = 'idle' | 'loading' | 'success';

function cleanTrackingCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
}

export default function TrackingPublicIsland({
  locale,
  messages,
  backendOrigin,
  isTab = false,
}: Props) {
  const heroRef = useRef<HTMLElement>(null);
  const [code, setCode] = useState('');
  const [state, setState] = useState<LookupState>('idle');
  const [error, setError] = useState('');
  const [order, setOrder] = useState<TrackingOrder | null>(null);

  const lookup = useCallback(async (trackingCode: string) => {
    if (!trackingCode) {
      setError(messages.errorEmpty);
      return;
    }
    if (!/^AK-\d{4}-[A-Z0-9]+$/.test(trackingCode)) {
      setError(messages.errorFormat);
      return;
    }
    setError('');
    setState('loading');
    try {
      const result = await createRuntimeApi({ origin: backendOrigin }).lookupTracking(trackingCode, locale);
      if (!result) {
        setError(messages.errorGeneric);
        setState('idle');
        return;
      }

      setOrder(result);
      setState('success');
      window.setTimeout(() => {
        document.getElementById('tracking-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (caught) {
      if (caught instanceof PortalApiError && caught.status === 429) setError(messages.errorRateLimit);
      else if (caught instanceof PortalApiError && caught.status === 404) setError(messages.errorNotFound);
      else setError(messages.errorGeneric);
      setState('idle');
    }
  }, [backendOrigin, locale, messages]);

  useEffect(() => {
    const initial = cleanTrackingCode(new URLSearchParams(window.location.search).get('code') || '');
    if (!initial) return;
    setCode(initial);
    void lookup(initial);
  }, [lookup]);

  useEffect(() => {
    if (!heroRef.current) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        '.tracking-hero-reveal',
        {
          y: 50,
          opacity: 0,
          clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
        },
        {
          y: 0,
          opacity: 1,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          duration: 1.2,
          stagger: 0.1,
          ease: 'expo.out',
          delay: 0.2,
        },
      );
    }, heroRef);

    return () => context.revert();
  }, []);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup(code);
  }

  async function copyCode() {
    if (!order?.tracking_code) return;
    await navigator.clipboard.writeText(order.tracking_code).catch(() => undefined);
  }

  const progress = Math.min(100, Math.max(0, Number(order?.progress_percent) || 0));

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/4 top-0 size-[600px] -translate-y-1/2 rounded-full bg-elm/15 blur-[120px] motion-safe:animate-pulse [animation-duration:10s]" />
        <div className="absolute bottom-0 right-1/4 size-[800px] translate-y-1/3 rounded-full bg-orange-500/10 blur-[150px] motion-safe:animate-pulse [animation-delay:2s] [animation-duration:15s]" />
      </div>

      <main id="tracking-manual" className="relative z-10 mx-auto min-h-screen w-full max-w-7xl scroll-mt-24 px-4 pb-24 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <section
          ref={heroRef}
          className={`relative flex flex-col items-center justify-center px-6 pb-16 text-center text-slate-800 lg:px-8 lg:pb-24 ${isTab ? 'pt-8 lg:pt-12' : 'pt-32 lg:pt-40'}`}
        >
          <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
            <h1 className="tracking-hero-reveal mb-4 text-4xl font-black uppercase leading-none tracking-tight lg:text-6xl">
              <span className="block text-slate-800">{messages.heading1}</span>
              <span className="block bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">{messages.heading2}</span>
            </h1>
            <p className="tracking-hero-reveal mx-auto mb-10 max-w-md text-sm text-slate-500 lg:text-base">{messages.description}</p>

            <form
              onSubmit={handleSubmit}
              className="tracking-hero-reveal flex w-full flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] md:p-8"
              noValidate
            >
              <label className="sr-only" htmlFor="tracking-code">{messages.inputPlaceholder}</label>
              <div className="relative w-full">
                <input
                  id="tracking-code"
                  value={code}
                  onChange={(event) => setCode(cleanTrackingCode(event.target.value))}
                  disabled={state === 'loading'}
                  placeholder={messages.inputPlaceholder}
                  autoComplete="off"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center font-mono text-lg tracking-wider text-slate-800 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 disabled:opacity-50 lg:text-xl"
                />
              </div>

              {error && (
                <p role="alert" aria-live="assertive" className="mt-2 w-full rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
                  {error}
                </p>
              )}

              <button
                disabled={state === 'loading' || code.length < 5}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-elm px-10 py-4 font-bold uppercase tracking-wider text-white shadow-[0_10px_20px_rgba(30,165,154,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#15887e] hover:shadow-[0_15px_25px_rgba(30,165,154,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === 'loading' && <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />}
                {state === 'loading' ? messages.btnSearching : messages.btnTrack}
              </button>
            </form>
          </div>
        </section>

        {state === 'success' && order && (
          <section id="tracking-results" className="mx-auto mt-16 max-w-4xl scroll-mt-24 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl md:p-10" aria-live="polite">
          <div className="relative mb-12 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-6 md:p-8">
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">{messages.resultOrderLabel}</p>
                <h2 className="mb-3 text-2xl font-black uppercase tracking-tight text-slate-800 md:text-4xl">{order.title}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 font-mono text-sm text-slate-700 shadow-sm">
                    {order.tracking_code}
                    <button type="button" onClick={copyCode} className="ml-2 hover:text-elm" aria-label={messages.copied}><Clipboard size={16} /></button>
                  </span>
                  <span className="rounded-full bg-elm/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-elm">{order.service_name || '-'}</span>
                  {order.target_deadline && (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {messages.resultTargetLabel}: {new Date(`${order.target_deadline}T00:00:00`).toLocaleDateString(locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-US' : 'id-ID')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex w-full items-center justify-center md:w-auto">
                <div className="relative flex size-32 items-center justify-center">
                  <svg className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={351.8} strokeDashoffset={351.8 - (351.8 * progress) / 100} className="text-orange-400 transition-all duration-1000 ease-out" strokeLinecap="round" />
                  </svg>
                  <div className="text-center"><span className="block text-3xl font-black text-slate-800">{progress}%</span><span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">{messages.resultProgressLabel}</span></div>
                </div>
              </div>
            </div>
            {order.public_note && <aside className="mt-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-amber-500" size={22} /><div><p className="mb-1 text-sm font-bold text-amber-800">{messages.adminNote}</p><p className="text-sm text-amber-700">{order.public_note}</p></div></aside>}
          </div>

          {order.documents && order.documents.length > 0 && (
            <div className="mb-12 rounded-3xl border border-slate-100 bg-slate-50 p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-elm/10 text-elm"><FileText size={20} /></div><div><h3 className="text-lg font-bold uppercase tracking-tight text-slate-800">Dokumen Final &amp; Legalitas</h3><p className="text-xs font-medium text-slate-500">Unduh dokumen hasil pekerjaan yang telah dirilis.</p></div></div>
              <ul className="grid gap-4 md:grid-cols-2">{order.documents.map((document) => <li key={document.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-700">{document.name}</p><p className="text-[10px] text-slate-400">Dirilis: {document.released_at || '-'}</p></div><a href={trackingDocumentUrl(order.tracking_code, document.id, backendOrigin)} target="_blank" rel="noreferrer" className="ml-4 inline-flex shrink-0 items-center gap-1 rounded-lg bg-elm/10 px-3 py-1.5 text-xs font-bold text-elm transition-colors hover:bg-elm hover:text-white"><Download size={14} />Unduh</a></li>)}</ul>
            </div>
          )}
          <TrackingTimeline stages={order.stages || []} messages={messages} locale={locale} />
          </section>
        )}
      </main>
    </>
  );
}
