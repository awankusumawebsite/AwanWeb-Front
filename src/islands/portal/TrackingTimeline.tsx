import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import type { TrackingStage } from '../../lib/runtime-api';

interface Props {
  stages: TrackingStage[];
  messages?: Record<string, string>;
  locale?: string;
}

function dateLocale(locale: string): string {
  if (locale === 'en') return 'en-US';
  if (locale === 'zh') return 'zh-CN';
  return 'id-ID';
}

function StageItem({
  stage,
  messages = {},
  locale = 'id',
}: {
  stage: TrackingStage;
  messages?: Record<string, string>;
  locale?: string;
}) {
  const completed = stage.status === 'completed';
  const inProgress = stage.status === 'in_progress';
  const skipped = stage.status === 'skipped';
  const label = completed
    ? messages.stageCompleted || 'Selesai'
    : inProgress
      ? messages.stageInProgress || 'Diproses'
      : skipped
        ? messages.stageSkipped || 'Dilewati'
        : messages.stagePending || 'Menunggu';

  const statusClass = completed
    ? 'border-elm bg-elm text-white'
    : inProgress
      ? 'border-amber-300 bg-amber-100 text-amber-600 ring-4 ring-amber-100'
      : skipped
        ? 'border-dashed border-gray-200 bg-gray-100 text-gray-400'
        : 'border-slate-200 bg-slate-200 text-slate-500';

  return (
    <div className="relative z-10 flex w-full items-start gap-4 md:gap-8">
      <div className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500 md:size-12 ${statusClass}`}>
        {completed ? (
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        ) : inProgress ? (
          <svg className="size-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        ) : skipped ? (
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>
        ) : <span className="size-2.5 rounded-full bg-slate-400" />}
      </div>

      <div className={`flex-1 pb-12 pt-1 transition-all duration-500 ${completed || inProgress ? 'opacity-100' : 'opacity-50'}`}>
        <div className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
          <div className="mb-2 flex flex-col justify-between gap-2 md:flex-row md:items-start">
            <h3 className="text-lg font-bold text-slate-800 md:text-xl">{stage.name}</h3>
            <div className="flex flex-col items-start gap-1 md:items-end">
              <span className={`rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ${completed ? 'bg-elm/10 text-elm' : inProgress ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{label}</span>
              {stage.completed_at ? (
                <span className="font-mono text-xs text-slate-400">✓ {new Date(stage.completed_at).toLocaleDateString(dateLocale(locale))}</span>
              ) : null}
            </div>
          </div>

          {stage.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">{stage.description}</p>}

          {stage.customer_note && (
            <div className="mt-3 flex gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-amber-900 shadow-sm">
              <svg className="mt-0.5 size-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div><p className="mb-0.5 font-bold text-amber-950">{messages.adminNote || 'Catatan Admin'}</p><p className="leading-relaxed text-amber-800">{stage.customer_note}</p></div>
            </div>
          )}

          {stage.checklist_items && stage.checklist_items.length > 0 && (
            <div className="mt-4 border-t border-slate-100/80 pt-4">
              <ul className="flex flex-col gap-2.5">
                {stage.checklist_items.map((item, index) => (
                  <li key={item.id || index} className="group/item flex items-start gap-3">
                    <div className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
                      {item.is_completed ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-elm/10 text-elm transition-transform duration-300 group-hover/item:scale-110"><svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>
                      ) : <span className="size-2.5 rounded-full bg-slate-200 transition-colors group-hover/item:bg-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm font-medium transition-colors md:text-base ${item.is_completed ? 'text-slate-700' : 'text-slate-400'}`}>{item.name}</span>
                      {item.completed_at && <span className="mt-0.5 block font-mono text-xs text-slate-400">✓ {new Date(item.completed_at).toLocaleDateString(dateLocale(locale))}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackingTimeline({ stages, messages = {}, locale = 'id' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineFillRef = useRef<HTMLDivElement>(null);
  const cometRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || stages.length === 0) return;

    let activeIndex = stages.findIndex((stage) => stage.status === 'in_progress');
    if (activeIndex === -1) {
      for (let index = stages.length - 1; index >= 0; index -= 1) {
        if (stages[index]?.status === 'completed') { activeIndex = index; break; }
      }
    }
    const allCompleted = stages.every((stage) => stage.status === 'completed');
    const target = allCompleted ? 1 : activeIndex === -1 ? 0 : activeIndex / Math.max(1, stages.length - 1);
    const items = container.querySelectorAll<HTMLElement>('[data-tracking-stage]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      gsap.set(lineFillRef.current, { scaleY: target });
      gsap.set(cometRef.current, { top: `${target * 100}%`, opacity: 0 });
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(items, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out', scrollTrigger: { trigger: container, start: 'top 85%' } });
      const timeline = gsap.timeline({ scrollTrigger: { trigger: container, start: 'top 75%' } });
      timeline.fromTo(lineFillRef.current, { scaleY: 0 }, { scaleY: target, duration: 1.5, ease: 'power2.out' });
      timeline.fromTo(cometRef.current, { top: '0%', opacity: 1 }, { top: `${target * 100}%`, opacity: target === 1 ? 0 : 1, duration: 1.5, ease: 'power2.out' }, '<');
    }, container);

    return () => context.revert();
  }, [stages]);

  if (stages.length === 0) return null;

  return (
    <div ref={containerRef} className="relative mx-auto max-w-4xl px-4 py-12 md:px-8">
      <div className="absolute bottom-16 left-[36px] top-16 z-0 w-1 overflow-hidden rounded-full bg-slate-200 md:left-[56px]">
        <div ref={lineFillRef} className="h-full w-full origin-top bg-gradient-to-b from-elm to-orange-400" style={{ transform: 'scaleY(0)' }} />
      </div>
      <div ref={cometRef} className="absolute left-[34px] z-10 h-6 w-2 -translate-y-full rounded-full bg-white opacity-0 shadow-[0_0_15px_rgba(251,146,60,1)] md:left-[54px] md:h-8" style={{ top: 0 }}><span className="absolute inset-0 rounded-full bg-orange-400 blur-sm" /></div>
      <ol className="relative z-10 m-0 flex w-full list-none flex-col p-0">
        {stages.map((stage, index) => <li key={stage.id || index} data-tracking-stage className="relative mb-2"><StageItem stage={stage} messages={messages} locale={locale} /></li>)}
      </ol>
    </div>
  );
}
