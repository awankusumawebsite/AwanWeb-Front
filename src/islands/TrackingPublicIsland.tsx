import {
  AlertCircle,
  CalendarClock,
  Check,
  Clipboard,
  Download,
  FileText,
  LoaderCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import type { Locale } from '../config/site';
import {
  PortalApiError,
  createRuntimeApi,
  trackingDocumentUrl,
  type TrackingOrder,
  type TrackingStage,
} from '../lib/runtime-api';

interface Props {
  locale: Locale;
  messages: Record<string, string>;
  backendOrigin: string;
  loginHref: string;
}

type LookupState = 'idle' | 'loading' | 'verifying' | 'success';

function cleanTrackingCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
}

function stageLabel(stage: TrackingStage, messages: Record<string, string>): string {
  if (stage.status === 'completed') return messages.stageCompleted;
  if (stage.status === 'in_progress') return messages.stageInProgress;
  if (stage.status === 'skipped') return messages.stageSkipped;
  return messages.stagePending;
}

function statusLabel(status: string, messages: Record<string, string>): string {
  const key = status === 'in_progress'
    ? 'statusInProgress'
    : `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return messages[key] || status.replaceAll('_', ' ');
}

export default function TrackingPublicIsland({
  locale,
  messages,
  backendOrigin,
  loginHref,
}: Props) {
  const [code, setCode] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [state, setState] = useState<LookupState>('idle');
  const [error, setError] = useState('');
  const [order, setOrder] = useState<TrackingOrder | null>(null);

  const lookup = useCallback(async (trackingCode: string, phone = '') => {
    if (!trackingCode) {
      setError(messages.errorEmpty);
      return;
    }
    if (!/^AK-\d{4}-[A-Z0-9]+$/.test(trackingCode)) {
      setError(messages.errorFormat);
      return;
    }
    if (phone && !/^\d{4}$/.test(phone)) {
      setError(messages.verifyInputPlaceholder);
      return;
    }

    setError('');
    setState('loading');
    try {
      const result = await createRuntimeApi({ origin: backendOrigin }).lookupTracking(trackingCode, locale, phone);
      if (result.requiresVerification) {
        setState('verifying');
        return;
      }

      if (!result.order) {
        setError(messages.errorGeneric);
        setState('idle');
        return;
      }

      setOrder(result.order);
      setState('success');
      window.setTimeout(() => {
        document.getElementById('tracking-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (caught) {
      if (caught instanceof PortalApiError && caught.status === 429) setError(messages.errorRateLimit);
      else if (caught instanceof PortalApiError && caught.status === 404) setError(messages.errorNotFound);
      else setError(messages.errorGeneric);
      setState(phone ? 'verifying' : 'idle');
    }
  }, [backendOrigin, locale, messages]);

  useEffect(() => {
    const initial = cleanTrackingCode(new URLSearchParams(window.location.search).get('code') || '');
    if (!initial) return;
    setCode(initial);
    void lookup(initial);
  }, [lookup]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup(code, state === 'verifying' ? phoneLast4 : '');
  }

  async function copyCode() {
    if (!order?.tracking_code) return;
    await navigator.clipboard.writeText(order.tracking_code).catch(() => undefined);
  }

  const progress = Math.min(100, Math.max(0, Number(order?.progress_percent) || 0));

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8 lg:pt-36">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/4 top-0 size-[34rem] -translate-y-1/2 rounded-full bg-elm/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-[42rem] translate-y-1/3 rounded-full bg-orange-500/8 blur-[150px]" />
      </div>

      <section className="mx-auto max-w-4xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-elm/15 bg-elm/5 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-elm">
          <ShieldCheck size={15} aria-hidden="true" /> Public Tracking
        </div>
        <h1 className="text-4xl font-black leading-tight tracking-tighter text-big-stone md:text-6xl">
          {messages.heading1}<br /><span className="text-elm">{messages.heading2}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm font-medium leading-relaxed text-slate-500 md:text-base">{messages.description}</p>

        <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-2xl rounded-3xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/50 sm:p-6" noValidate>
          <label className="sr-only" htmlFor="tracking-code">{messages.inputPlaceholder}</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="tracking-code"
              value={code}
              onChange={(event) => setCode(cleanTrackingCode(event.target.value))}
              disabled={state === 'loading'}
              placeholder={messages.inputPlaceholder}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-mono text-sm font-bold uppercase tracking-wide text-big-stone outline-none transition-colors focus:border-elm focus:bg-white"
            />
            <button disabled={state === 'loading'} className="flex items-center justify-center gap-2 rounded-2xl bg-big-stone px-7 py-4 text-xs font-extrabold uppercase tracking-wider text-white transition-colors hover:bg-elm disabled:cursor-wait disabled:opacity-60">
              {state === 'loading' ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
              {state === 'loading' ? messages.btnSearching : messages.btnTrack}
            </button>
          </div>

          {state === 'verifying' && (
            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-5 text-left">
              <div className="mb-4 flex items-start gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-orange-600" size={20} aria-hidden="true" />
                <div><h2 className="text-sm font-black text-big-stone">{messages.verifyTitle}</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">{messages.verifyDesc}</p></div>
              </div>
              <input
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={phoneLast4}
                onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={messages.verifyInputPlaceholder}
                className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-center font-mono text-lg font-black tracking-[0.4em] outline-none focus:border-orange-500"
              />
            </div>
          )}

          {error && <p role="alert" className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-red-600"><AlertCircle size={15} aria-hidden="true" />{error}</p>}
        </form>

        <p className="mt-5 text-xs font-medium text-slate-400">
          Portal klien terdaftar: <a href={loginHref} className="font-bold text-elm hover:underline">Login</a>
        </p>
      </section>

      {state === 'success' && order && (
        <section id="tracking-results" className="mx-auto mt-16 max-w-4xl scroll-mt-24 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl md:p-10" aria-live="polite">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{messages.resultOrderLabel}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-big-stone md:text-4xl">{order.title}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 font-mono text-xs font-bold">{order.tracking_code}</span>
              <button type="button" onClick={copyCode} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-elm" aria-label={messages.copied}><Clipboard size={17} /></button>
              <span className="rounded-full bg-elm/10 px-4 py-2 text-xs font-bold uppercase text-elm">{statusLabel(order.status, messages)}</span>
            </div>
          </div>

          <dl className="my-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 p-5"><dt className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{messages.resultServiceLabel}</dt><dd className="mt-2 text-sm font-bold text-big-stone">{order.service_name || '-'}</dd></div>
            <div className="rounded-2xl border border-slate-100 p-5"><dt className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{messages.resultProgressLabel}</dt><dd className="mt-2 text-sm font-bold text-big-stone">{progress}%</dd></div>
            <div className="rounded-2xl border border-slate-100 p-5"><dt className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{messages.resultEtaLabel}</dt><dd className="mt-2 flex items-center gap-2 text-sm font-bold text-big-stone"><CalendarClock size={16} className="text-elm" />{order.overall_eta || '-'}</dd></div>
          </dl>

          <div className="mb-10 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-elm transition-[width] duration-700" style={{ width: `${progress}%` }} /></div>

          {order.public_note && <aside className="mb-10 rounded-2xl border border-blue-100 bg-blue-50 p-5"><p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-500">{messages.adminNote}</p><p className="mt-2 text-sm leading-relaxed text-slate-700">{order.public_note}</p></aside>}

          {order.stages && order.stages.length > 0 && (
            <ol className="space-y-4">
              {order.stages.map((stage) => (
                <li key={stage.id} className="flex gap-4 rounded-2xl border border-slate-100 p-5">
                  <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${stage.status === 'completed' ? 'bg-elm text-white' : stage.status === 'in_progress' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                    {stage.status === 'completed' ? <Check size={17} /> : <span className="size-2 rounded-full bg-current" />}
                  </span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-big-stone">{stage.name}</h3><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stageLabel(stage, messages)}</span></div>{stage.customer_note && <p className="mt-2 text-xs leading-relaxed text-slate-500">{stage.customer_note}</p>}</div>
                </li>
              ))}
            </ol>
          )}

          {order.documents && order.documents.length > 0 && (
            <div className="mt-10 border-t border-slate-100 pt-8">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-big-stone"><FileText size={20} className="text-elm" />Documents</h3>
              <ul className="space-y-3">{order.documents.map((document) => <li key={document.id}><a href={trackingDocumentUrl(order.tracking_code, document.id, phoneLast4, backendOrigin)} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 text-sm font-bold text-big-stone transition-colors hover:border-elm hover:text-elm"><span>{document.name}</span><Download size={17} /></a></li>)}</ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
