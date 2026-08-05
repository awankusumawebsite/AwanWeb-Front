import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Filter,
  LoaderCircle,
  LogOut,
  Package,
  RefreshCw,
  RotateCcw,
  Users2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';
import {
  PortalApiError,
  createRuntimeApi,
  hasSessionHint,
  notaryDocumentUrl,
  setSessionHint,
  type AuthUser,
  type NotaryOrderDetail,
  type NotaryOrderSummary,
  type NotaryStaff,
  type NotaryStage,
} from '../lib/runtime-api';

interface Props {
  messages: Record<string, string>;
  backendOrigin: string;
  loginHref: string;
  trackingHref: string;
}

type SessionState = 'checking' | 'ready' | 'error';
type Tab = 'orders' | 'staff';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

function statusClass(status: string): string {
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'in_progress') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (status === 'canceled' || status === 'cancelled') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status === 'cancelled' ? 'canceled' : status;
  const labels: Record<string, string> = {
    completed: 'Selesai',
    in_progress: 'Diproses',
    canceled: 'Batal',
    pending: 'Menunggu',
  };
  const Icon = normalized === 'completed' ? CheckCircle2 : normalized === 'canceled' ? AlertCircle : Clock3;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${statusClass(status)}`}>
      <Icon size={12} />
      {labels[normalized] || status.replaceAll('_', ' ')}
    </span>
  );
}

function PortalFailure({ error, retry, loginHref }: { error: unknown; retry: () => void; loginHref: string }) {
  const expired = error instanceof PortalApiError && error.code === 'SESSION_EXPIRED';
  const forbidden = error instanceof PortalApiError && error.code === 'FORBIDDEN';
  return (
    <div role="alert" className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
      <AlertCircle className="mx-auto text-red-500" size={34} />
      <h2 className="mt-4 text-xl font-black text-big-stone">{expired ? 'Sesi berakhir' : forbidden ? 'Akses ditolak' : 'Data belum dapat dimuat'}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{error instanceof Error ? error.message : 'Permintaan tidak dapat diproses.'}</p>
      {expired ? <a href={loginHref} className="mt-6 inline-flex rounded-xl bg-elm px-5 py-3 text-xs font-bold uppercase text-white">Login kembali</a> : <button type="button" onClick={retry} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-elm px-5 py-3 text-xs font-bold uppercase text-white"><RefreshCw size={15} />Coba lagi</button>}
    </div>
  );
}

export default function MitraPortalIsland({ messages, backendOrigin, loginHref, trackingHref }: Props) {
  const api = useMemo(() => createRuntimeApi({ origin: backendOrigin }), [backendOrigin]);
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionError, setSessionError] = useState<unknown>(null);
  const [tab, setTab] = useState<Tab>('orders');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [orders, setOrders] = useState<NotaryOrderSummary[]>([]);
  const [staff, setStaff] = useState<NotaryStaff[]>([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [detail, setDetail] = useState<NotaryOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutating, setMutating] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);

  const copy = useCallback((key: string, fallback: string) => messages[key] || fallback, [messages]);

  const resolveSession = useCallback(async () => {
    if (!hasSessionHint()) {
      window.location.replace(loginHref);
      return;
    }
    setSessionState('checking');
    setSessionError(null);
    try {
      const current = await api.currentUser();
      if (!current) {
        setSessionHint(false);
        window.location.replace(loginHref);
        return;
      }
      if (current.role !== 'notaris' && current.role !== 'staff_notaris') {
        window.location.replace(trackingHref);
        return;
      }
      setUser(current);
      setSessionState('ready');
    } catch (caught) {
      if (caught instanceof PortalApiError && caught.code === 'SESSION_EXPIRED') {
        setSessionHint(false);
        window.location.replace(loginHref);
        return;
      }
      setSessionError(caught);
      setSessionState('error');
    }
  }, [api, loginHref, trackingHref]);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [orderRows, staffRows] = await Promise.all([
        api.notaryOrders(),
        user.role === 'notaris' ? api.notaryStaff() : Promise.resolve([]),
      ]);
      setOrders(orderRows);
      setStaff(staffRows);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  const loadDetail = useCallback(async (trackingCode: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      setDetail(await api.notaryOrderDetail(trackingCode));
    } catch (caught) {
      setDetail(null);
      setError(caught);
    } finally {
      setDetailLoading(false);
    }
  }, [api]);

  useEffect(() => { void resolveSession(); }, [resolveSession]);
  useEffect(() => { if (sessionState === 'ready') void loadDashboard(); }, [loadDashboard, sessionState]);

  useEffect(() => {
    if (sessionState !== 'ready' || selectedOrder || !dashboardRef.current) return;

    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.mitra-stagger', { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        '.mitra-stagger',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        },
      );
    }, dashboardRef);

    return () => context.revert();
  }, [selectedOrder, sessionState, user]);

  useEffect(() => {
    if (sessionState !== 'ready') return;
    const syncOrder = () => {
      const code = new URLSearchParams(window.location.search).get('order') || '';
      setSelectedOrder(code);
      setDetail(null);
      if (code) void loadDetail(code);
    };
    syncOrder();
    window.addEventListener('popstate', syncOrder);
    return () => window.removeEventListener('popstate', syncOrder);
  }, [loadDetail, sessionState]);

  function openOrder(code: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('order', code);
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setSelectedOrder(code);
    setDetail(null);
    void loadDetail(code);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeOrder() {
    const url = new URL(window.location.href);
    url.searchParams.delete('order');
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setSelectedOrder('');
    setDetail(null);
  }

  async function mutate(label: string, operation: () => Promise<void>) {
    setMutating(label);
    setNotice('');
    try {
      await operation();
      if (selectedOrder) await loadDetail(selectedOrder);
      await loadDashboard();
      setNotice('Perubahan berhasil disimpan.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Perubahan gagal disimpan.');
    } finally {
      setMutating('');
    }
  }

  async function assign(order: NotaryOrderSummary, value: string) {
    const staffId = value ? Number(value) : null;
    await mutate(`assign-${order.id}`, async () => {
      const name = await api.assignNotaryOrder(order.tracking_code, staffId);
      setOrders((rows) => rows.map((row) => row.id === order.id ? { ...row, assigned_staff_id: staffId, assigned_staff_name: name } : row));
    });
  }

  async function logout() {
    try { await api.logout(); } finally {
      setSessionHint(false);
      window.location.assign(loginHref);
    }
  }

  if (sessionState === 'checking') return <main className="flex min-h-screen items-center justify-center"><LoaderCircle className="animate-spin text-elm" size={38} /><span className="sr-only">Memverifikasi akses mitra</span></main>;
  if (sessionState === 'error') return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5"><PortalFailure error={sessionError} retry={() => void resolveSession()} loginHref={loginHref} /></main>;

  const filteredOrders = filter === 'all' ? orders : orders.filter((order) => order.status === filter);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8 lg:pt-36">
      {selectedOrder ? (
        <OrderDetail
          detail={detail}
          loading={detailLoading}
          error={error}
          mutating={mutating}
          notice={notice}
          backendOrigin={backendOrigin}
          loginHref={loginHref}
          onBack={closeOrder}
          onRetry={() => void loadDetail(selectedOrder)}
          onCompleteStage={(stage) => void mutate(`stage-${stage.id}`, () => api.completeNotaryStage(selectedOrder, stage.id))}
          onUndoStage={(stage) => void mutate(`stage-${stage.id}`, () => api.undoNotaryStage(selectedOrder, stage.id))}
          onCompleteChecklist={(id) => void mutate(`check-${id}`, () => api.completeNotaryChecklist(selectedOrder, id))}
          onUndoChecklist={(id) => void mutate(`check-${id}`, () => api.undoNotaryChecklist(selectedOrder, id))}
          copy={copy}
        />
      ) : (
        <div ref={dashboardRef} className="flex w-full flex-col gap-10">
          <header className="mitra-stagger flex flex-col items-start justify-between gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-center">
            <div><span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-elm/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-elm"><Building2 size={12} />Portal Resmi Mitra Notaris</span><h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-big-stone md:text-5xl">Dasbor Mitra</h1><p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500">{copy('description', 'Kelola order dan staf kantor notaris.')}</p></div>
            <div className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:w-auto"><div className="flex size-12 items-center justify-center rounded-xl bg-elm/10 text-elm"><Building2 size={24} /></div><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Akses Kantor</p><p className="text-sm font-bold text-big-stone">{user?.name}</p><p className="text-xs font-semibold capitalize text-elm">{user?.role?.replace('_', ' ')}</p></div><button type="button" onClick={logout} className="ml-3 rounded-xl p-3 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500" aria-label="Logout"><LogOut size={18} /></button></div>
          </header>

          <div className="mitra-stagger flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 sm:w-auto"><button type="button" onClick={() => setTab('orders')} className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all sm:flex-none ${tab === 'orders' ? 'bg-elm text-white shadow-lg shadow-elm/20' : 'text-slate-500 hover:bg-slate-50 hover:text-big-stone'}`}><Building2 size={16} />{copy('tabOrders', 'Order Kantor')}</button>{user?.role === 'notaris' && <button type="button" onClick={() => setTab('staff')} className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all sm:flex-none ${tab === 'staff' ? 'bg-elm text-white shadow-lg shadow-elm/20' : 'text-slate-500 hover:bg-slate-50 hover:text-big-stone'}`}><Users2 size={16} />{copy('tabStaff', 'Staf Saya')}</button>}</div>
            {tab === 'orders' && <div className="flex w-full items-center gap-2 overflow-x-auto pb-2 sm:w-auto sm:pb-0"><Filter size={16} className="ml-2 shrink-0 text-slate-400 sm:ml-0" />{(['all', 'pending', 'in_progress', 'completed'] as StatusFilter[]).map((status) => <button type="button" key={status} onClick={() => setFilter(status)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${filter === status ? 'bg-big-stone text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{copy(status === 'all' ? 'filterAll' : status === 'pending' ? 'filterPending' : status === 'in_progress' ? 'filterInProgress' : 'filterCompleted', status.replaceAll('_', ' '))}</button>)}</div>}
          </div>

          <section className="mitra-stagger w-full">
            {loading && <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="animate-spin text-elm" size={36} /></div>}
            {!loading && error !== null && <PortalFailure error={error} retry={() => void loadDashboard()} loginHref={loginHref} />}
            {!loading && error === null && tab === 'orders' && <OrderList orders={filteredOrders} staff={staff} principal={user?.role === 'notaris'} mutating={mutating} onOpen={openOrder} onAssign={assign} emptyTitle={copy('noOrders', 'Belum ada order')} />}
            {!loading && error === null && tab === 'staff' && user?.role === 'notaris' && <StaffList staff={staff} mutating={mutating} onToggle={(row) => void mutate(`staff-${row.id}`, async () => { const active = await api.toggleNotaryStaff(row.id); setStaff((rows) => rows.map((item) => item.id === row.id ? { ...item, is_active: active } : item)); })} copy={copy} />}
            {notice && !selectedOrder && <p role="status" className="mt-5 text-center text-sm font-bold text-slate-600">{notice}</p>}
          </section>
        </div>
      )}
    </main>
  );
}

function OrderList({
  orders,
  staff,
  principal,
  mutating,
  onOpen,
  onAssign,
  emptyTitle,
}: {
  orders: NotaryOrderSummary[];
  staff: NotaryStaff[];
  principal: boolean;
  mutating: string;
  onOpen: (trackingCode: string) => void;
  onAssign: (order: NotaryOrderSummary, staffId: string) => Promise<void>;
  emptyTitle: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || orders.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        '.order-card-mitra',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out', clearProps: 'transform,opacity' },
      );
    }, containerRef);

    return () => context.revert();
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
        <Package className="mx-auto text-slate-300" size={42} />
        <h2 className="mt-4 text-xl font-black text-big-stone">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-slate-500">Order yang dapat Anda akses akan tampil di sini.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="grid grid-cols-1 gap-6">
      {orders.map((order) => {
        const assignmentBusy = mutating === `assign-${order.id}`;
        return (
          <article
            key={order.id}
            className={`order-card-mitra group relative flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:bg-slate-50/80 hover:shadow-md md:flex-row md:items-center md:p-8 ${activeDropdown === order.tracking_code ? 'z-30' : 'z-10'}`}
          >
            <button type="button" onClick={() => onOpen(order.tracking_code)} className="flex w-full flex-1 flex-col text-left">
              <div className="mb-3 flex items-center gap-3"><span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">#{order.tracking_code}</span><StatusBadge status={order.status} /></div>
              <h2 className="mb-2 text-xl font-black uppercase leading-tight tracking-tight text-big-stone transition-colors group-hover:text-elm">{order.title}</h2>
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-elm">{order.service_name || 'Layanan legalitas'}</p>
              <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-elm to-orange-400 transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(0, Number(order.progress) || 0))}%` }} /></div>
              <div className="mt-2 flex max-w-md flex-wrap items-center justify-between gap-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Progres: {Math.round(Number(order.progress) || 0)}%</p>
                {!principal && order.assigned_staff_name && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    <span className="size-1.5 rounded-full bg-slate-400" />
                    Petugas: {order.assigned_staff_name}
                  </span>
                )}
              </div>
            </button>

            <div className="flex w-full flex-col gap-4 border-t border-slate-100 pt-4 md:w-auto md:min-w-60 md:border-0 md:pt-0">
              {principal && (
                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delegasi:</span>
                  <StaffAssignDropdown
                    order={order}
                    staff={staff}
                    busy={assignmentBusy}
                    isOpen={activeDropdown === order.tracking_code}
                    onToggle={() => setActiveDropdown((current) => current === order.tracking_code ? null : order.tracking_code)}
                    onAssign={async (staffId) => {
                      await onAssign(order, staffId);
                      setActiveDropdown(null);
                    }}
                  />
                </div>
              )}
              <button type="button" onClick={() => onOpen(order.tracking_code)} className="flex items-center justify-center gap-2 rounded-2xl bg-elm px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all group-hover:bg-big-stone">Lihat detail<ChevronRight size={16} className="transition-transform group-hover:translate-x-1" /></button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StaffAssignDropdown({
  order,
  staff,
  busy,
  isOpen,
  onToggle,
  onAssign,
}: {
  order: NotaryOrderSummary;
  staff: NotaryStaff[];
  busy: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onAssign: (staffId: string) => Promise<void>;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentStaff = staff.find((row) => row.id === order.assigned_staff_id);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) onToggle();
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={busy}
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isOpen ? 'border-elm bg-elm/5 text-elm shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900'}`}
      >
        {busy ? <LoaderCircle className="animate-spin" size={13} /> : <span className={`size-1.5 rounded-full ${currentStaff ? 'animate-pulse bg-orange-500' : 'bg-slate-400'}`} />}
        <span className="max-w-32 truncate">{busy ? 'Menyimpan...' : currentStaff?.name || 'Belum Ditugaskan'}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div role="listbox" className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white/95 py-2 shadow-xl backdrop-blur-md">
          <button
            type="button"
            role="option"
            aria-selected={!order.assigned_staff_id}
            onClick={() => void onAssign('')}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <span className="size-2 rounded-full bg-slate-300" />Belum ditugaskan
          </button>
          {staff.filter((row) => row.is_active).map((row) => (
            <button
              type="button"
              role="option"
              aria-selected={row.id === order.assigned_staff_id}
              key={row.id}
              onClick={() => void onAssign(String(row.id))}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elm/5 ${row.id === order.assigned_staff_id ? 'bg-elm/5' : ''}`}
            >
              <span className={`size-2 rounded-full ${row.id === order.assigned_staff_id ? 'bg-orange-500' : 'bg-emerald-500'}`} />
              <span className="min-w-0"><span className="block truncate text-xs font-bold text-big-stone">{row.name}</span><span className="block truncate text-[10px] text-slate-400">{row.email}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffList({
  staff,
  mutating,
  onToggle,
  copy,
}: {
  staff: NotaryStaff[];
  mutating: string;
  onToggle: (staff: NotaryStaff) => void;
  copy: (key: string, fallback: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || staff.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        '.staff-row-mitra',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'transform,opacity' },
      );
    }, containerRef);

    return () => context.revert();
  }, [staff]);

  if (staff.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
        <Users2 className="mx-auto text-slate-300" size={42} />
        <h2 className="mt-4 text-xl font-black text-big-stone">{copy('noStaff', 'Belum ada staf notaris')}</h2>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/50 p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-black uppercase tracking-wider text-big-stone">{copy('staffTitle', 'Daftar Staf Notaris')}</h2>
        <p className="text-xs text-slate-500">{copy('staffSub', 'Kelola status staf yang dapat menerima delegasi order.')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
              <th className="px-6 py-4">{copy('colName', 'Nama')}</th>
              <th className="px-6 py-4">{copy('colEmail', 'Email')}</th>
              <th className="px-6 py-4">{copy('colStatus', 'Status')}</th>
              <th className="px-6 py-4">{copy('colSupervisor', 'Supervisor')}</th>
              <th className="px-6 py-4 text-right">Aksi Kontrol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {staff.map((row) => {
              const busy = mutating === `staff-${row.id}`;
              return (
                <tr key={row.id} className="staff-row-mitra transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-big-stone">{row.name}</td>
                  <td className="px-6 py-4 text-slate-600">{row.email}</td>
                  <td className="px-6 py-4">
                    {row.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={12} />{copy('statusActive', 'Aktif')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600"><XCircle size={12} />{copy('statusInactive', 'Nonaktif')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-elm">{row.supervisor_name || 'Pimpinan Kantor'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{row.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.is_active}
                        aria-label={`${row.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${row.name}`}
                        disabled={busy}
                        onClick={() => onToggle(row)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-wait disabled:opacity-50 ${row.is_active ? 'bg-elm' : 'bg-slate-200'}`}
                      >
                        <span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${row.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderDetail({
  detail,
  loading,
  error,
  mutating,
  notice,
  backendOrigin,
  loginHref,
  onBack,
  onRetry,
  onCompleteStage,
  onUndoStage,
  onCompleteChecklist,
  onUndoChecklist,
  copy,
}: {
  detail: NotaryOrderDetail | null;
  loading: boolean;
  error: unknown;
  mutating: string;
  notice: string;
  backendOrigin: string;
  loginHref: string;
  onBack: () => void;
  onRetry: () => void;
  onCompleteStage: (stage: NotaryStage) => void;
  onUndoStage: (stage: NotaryStage) => void;
  onCompleteChecklist: (checklistId: number) => void;
  onUndoChecklist: (checklistId: number) => void;
  copy: (key: string, fallback: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressCircleRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLElement>(null);
  const lineFillRef = useRef<HTMLDivElement>(null);
  const cometRef = useRef<HTMLDivElement>(null);
  const [confirmation, setConfirmation] = useState<{ message: string; action: () => void } | null>(null);

  useEffect(() => {
    if (!detail || !containerRef.current) return;

    const stages = detail.stages || [];
    let activeIndex = stages.findIndex((stage) => stage.status === 'in_progress');
    if (activeIndex === -1) {
      for (let index = stages.length - 1; index >= 0; index -= 1) {
        if (stages[index]?.status === 'completed') {
          activeIndex = index;
          break;
        }
      }
    }
    const allCompleted = stages.length > 0 && stages.every((stage) => stage.status === 'completed');
    const targetProgress = allCompleted ? 1 : activeIndex >= 0 ? activeIndex / Math.max(1, stages.length - 1) : 0;

    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.detail-stagger, .notary-stage-item', { opacity: 1, y: 0 });
        gsap.set(lineFillRef.current, { scaleY: targetProgress });
        gsap.set(cometRef.current, { top: `${targetProgress * 100}%`, opacity: targetProgress > 0 && targetProgress < 1 ? 1 : 0 });
        return;
      }

      gsap.fromTo('.detail-stagger', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out', clearProps: 'transform,opacity' });
      gsap.fromTo('.notary-stage-item', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.09, ease: 'power2.out', clearProps: 'transform,opacity' });
      if (progressCircleRef.current) gsap.fromTo(progressCircleRef.current, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.5)', clearProps: 'transform,opacity' });

      const timeline = gsap.timeline({
        scrollTrigger: timelineRef.current ? { trigger: timelineRef.current, start: 'top 75%', once: true } : undefined,
      });
      timeline.fromTo(lineFillRef.current, { scaleY: 0 }, { scaleY: targetProgress, duration: 1.5, ease: 'power2.out' });
      timeline.fromTo(cometRef.current, { top: '0%', opacity: targetProgress > 0 ? 1 : 0 }, { top: `${targetProgress * 100}%`, opacity: targetProgress === 1 ? 0 : targetProgress > 0 ? 1 : 0, duration: 1.5, ease: 'power2.out' }, '<');
    }, containerRef);

    return () => context.revert();
  }, [detail]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoaderCircle className="animate-spin text-elm" size={38} /></div>;
  if (error !== null) return <><button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><ArrowLeft size={16} />Kembali</button><PortalFailure error={error} retry={onRetry} loginHref={loginHref} /></>;
  if (!detail) return null;

  const progress = Math.min(100, Math.max(0, Number(detail.progress) || 0));

  function confirmAction(message: string, action: () => void) {
    setConfirmation({ message, action });
  }

  return (
    <div ref={containerRef} className="relative w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all md:p-12">
      <button type="button" onClick={onBack} className="detail-stagger group mb-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-elm"><ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />{copy('back', 'Kembali ke daftar order')}</button>

      <header className="detail-stagger mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-200 pb-10 md:flex-row md:items-center">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Order #{detail.tracking_code}</p><h1 className="mb-4 max-w-3xl text-2xl font-black uppercase tracking-tight text-big-stone md:text-4xl">{detail.title}</h1><div className="flex flex-wrap items-center gap-3"><span className="rounded-xl bg-elm/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-elm">{detail.service_name || 'Layanan legalitas'}</span><StatusBadge status={detail.status} />{detail.customer_name && <span className="text-xs font-semibold text-slate-500">Customer: {detail.customer_name}</span>}</div></div>
        <div ref={progressCircleRef} className="flex w-full items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm md:w-auto">
          <div className="relative flex size-16 shrink-0 items-center justify-center"><svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" /><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * progress) / 100} className="text-orange-400 transition-all duration-1000 ease-out" strokeLinecap="round" /></svg><span className="text-base font-black text-big-stone">{Math.round(progress)}%</span></div>
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Progress pekerjaan</p><p className="text-[11px] text-slate-400">Diperbarui secara real-time</p></div>
        </div>
      </header>

      {notice && <p role="status" className="mb-6 rounded-2xl border border-elm/20 bg-elm/5 px-5 py-4 text-center text-sm font-bold text-elm">{notice}</p>}
      {detail.public_note && <div className="detail-stagger mb-12 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6"><AlertCircle className="mt-0.5 size-6 shrink-0 text-amber-600" /><div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-900">Catatan Admin</p><p className="text-sm leading-relaxed text-amber-800">{detail.public_note}</p></div></div>}

      <section className="detail-stagger mb-14 rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-10">
        <div className="mb-8 flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-elm/10 text-elm"><FileText size={24} /></div><div><h2 className="text-lg font-bold uppercase tracking-wider text-big-stone">Dokumen final &amp; legalitas</h2><p className="text-xs text-slate-500">Berkas resmi yang telah diterbitkan dan siap diunduh</p></div></div>
        {detail.documents.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Belum ada dokumen yang dirilis</p></div> : <div className="grid gap-6 md:grid-cols-2">{detail.documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-elm"><div className="flex min-w-0 items-center gap-4"><FileText size={28} className="shrink-0 text-elm" /><div className="min-w-0"><p className="truncate text-sm font-bold text-big-stone">{document.name}</p><p className="text-[10px] uppercase tracking-widest text-slate-400">Dirilis: {document.released_at || '-'}</p></div></div><a href={notaryDocumentUrl(document.id, backendOrigin)} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-elm px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-big-stone"><Download size={16} />Unduh</a></div>)}</div>}
      </section>

      <section ref={timelineRef} className="detail-stagger relative mx-auto mt-12 max-w-4xl">
          <div className="mb-12 text-center"><div className="flex items-center justify-center gap-3"><Clock3 className="text-elm" size={22} /><h2 className="text-xl font-black uppercase tracking-wider text-big-stone">Tahapan pekerjaan</h2></div><p className="mt-2 text-sm text-slate-500">Perbarui tahap dan checklist sesuai progres aktual.</p></div>
          <div className="absolute bottom-8 left-5 top-28 z-0 w-1 overflow-hidden rounded-full bg-slate-200 md:left-6"><div ref={lineFillRef} className="h-full origin-top bg-gradient-to-b from-elm to-orange-400" style={{ transform: 'scaleY(0)' }} /></div>
          <div ref={cometRef} className="absolute left-[18px] top-28 z-10 h-7 w-2 -translate-y-full rounded-full bg-orange-400 opacity-0 shadow-[0_0_15px_rgba(251,146,60,1)] blur-[0.5px] md:left-[22px]" />
          <ol className="relative z-10 m-0 flex list-none flex-col p-0">
          {detail.stages.map((stage, index) => {
            const stageBusy = mutating === `stage-${stage.id}`;
            const requiredIncomplete = stage.checklist_items.some((item) => item.is_required && !item.is_completed);
            const completed = stage.status === 'completed';
            return (
              <li key={stage.id} className="notary-stage-item relative mb-6 flex w-full items-start gap-4 md:gap-8">
              <div className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black md:size-12 ${completed ? 'border-elm bg-elm text-white' : stage.status === 'in_progress' ? 'border-amber-300 bg-amber-100 text-amber-600 ring-4 ring-amber-100' : 'border-slate-200 bg-slate-200 text-slate-500'}`}>{completed ? <CheckCircle2 size={20} /> : index + 1}</div>
              <article className={`mb-6 flex-1 rounded-3xl border bg-white p-6 shadow-sm ${completed ? 'border-emerald-200' : 'border-slate-200'}`}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div><h3 className="text-lg font-black text-big-stone">{stage.name}</h3>{stage.description && <p className="mt-1 text-sm text-slate-500">{stage.description}</p>}{stage.is_final && <span className="mt-2 inline-flex rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">Tahap final — dikelola admin</span>}</div>
                  {!stage.is_final && <button type="button" disabled={stageBusy || (!completed && requiredIncomplete)} onClick={() => completed ? confirmAction('Batalkan penyelesaian tahap ini?', () => onUndoStage(stage)) : confirmAction('Tandai tahap ini selesai?', () => onCompleteStage(stage))} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40 ${completed ? 'border border-slate-200 text-slate-600' : 'bg-elm text-white'}`}>{stageBusy ? <LoaderCircle className="animate-spin" size={15} /> : completed ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}{completed ? 'Batalkan tahap' : 'Selesaikan tahap'}</button>}
                </div>

                {stage.checklist_items.length > 0 && <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">{stage.checklist_items.map((item) => { const busy = mutating === `check-${item.id}`; return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"><div className="flex min-w-0 items-center gap-3">{item.is_completed ? <CheckCircle2 className="shrink-0 text-emerald-600" size={18} /> : <span className="size-[18px] shrink-0 rounded-full border-2 border-slate-300" />}<p className={`text-sm font-semibold ${item.is_completed ? 'text-slate-400 line-through' : 'text-big-stone'}`}>{item.name}{item.is_required && <span className="ml-1 text-red-500">*</span>}</p></div><button type="button" disabled={busy || completed} onClick={() => item.is_completed ? confirmAction('Batalkan checklist ini?', () => onUndoChecklist(item.id)) : onCompleteChecklist(item.id)} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 disabled:opacity-40">{busy ? <LoaderCircle className="animate-spin" size={13} /> : item.is_completed ? 'Batalkan' : 'Selesai'}</button></div>; })}</div>}
                {!completed && requiredIncomplete && <p className="mt-4 text-xs font-semibold text-amber-700">Lengkapi seluruh checklist wajib sebelum menyelesaikan tahap.</p>}
              </article>
              </li>
            );
          })}
          </ol>
      </section>

      {confirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm" role="presentation" onMouseDown={() => setConfirmation(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="mitra-confirm-title" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><AlertCircle size={24} /></div>
            <h2 id="mitra-confirm-title" className="mt-5 text-xl font-black uppercase tracking-tight text-big-stone">Konfirmasi perubahan</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{confirmation.message}</p>
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmation(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-600">Batal</button>
              <button type="button" onClick={() => { const action = confirmation.action; setConfirmation(null); action(); }} className="rounded-xl bg-elm px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white">Ya, lanjutkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
