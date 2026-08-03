import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
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
  ShieldCheck,
  Users2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${statusClass(status)}`}>{status.replaceAll('_', ' ')}</span>;
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
        <>
          <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-center">
            <div><span className="inline-flex items-center gap-2 rounded-full bg-elm/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-elm"><Building2 size={13} />Portal Resmi Mitra Notaris</span><h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-big-stone md:text-5xl">Dasbor Mitra</h1><p className="mt-2 max-w-xl text-sm text-slate-500">{copy('description', 'Kelola order dan staf kantor notaris.')}</p></div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex size-11 items-center justify-center rounded-xl bg-elm/10 text-elm"><Building2 size={22} /></div><div><p className="text-sm font-black">{user?.name}</p><p className="text-[10px] font-bold uppercase tracking-wider text-elm">{user?.role?.replaceAll('_', ' ')}</p></div><button type="button" onClick={logout} className="ml-3 rounded-xl p-3 text-slate-400 hover:bg-slate-100 hover:text-red-500" aria-label="Logout"><LogOut size={18} /></button></div>
          </header>

          <div className="mt-8 flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex gap-2"><button type="button" onClick={() => setTab('orders')} className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'orders' ? 'bg-elm text-white' : 'text-slate-500'}`}><Building2 size={16} />{copy('tabOrders', 'Order Kantor')}</button>{user?.role === 'notaris' && <button type="button" onClick={() => setTab('staff')} className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'staff' ? 'bg-elm text-white' : 'text-slate-500'}`}><Users2 size={16} />{copy('tabStaff', 'Staf Saya')}</button>}</div>
            {tab === 'orders' && <div className="flex items-center gap-2 overflow-x-auto"><Filter size={16} className="shrink-0 text-slate-400" />{(['all', 'pending', 'in_progress', 'completed'] as StatusFilter[]).map((status) => <button type="button" key={status} onClick={() => setFilter(status)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${filter === status ? 'bg-big-stone text-white' : 'bg-slate-50 text-slate-500'}`}>{copy(status === 'all' ? 'filterAll' : status === 'pending' ? 'filterPending' : status === 'in_progress' ? 'filterInProgress' : 'filterCompleted', status.replaceAll('_', ' '))}</button>)}</div>}
          </div>

          <section className="mt-8">
            {loading && <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="animate-spin text-elm" size={36} /></div>}
            {!loading && error !== null && <PortalFailure error={error} retry={() => void loadDashboard()} loginHref={loginHref} />}
            {!loading && error === null && tab === 'orders' && <OrderList orders={filteredOrders} staff={staff} principal={user?.role === 'notaris'} mutating={mutating} onOpen={openOrder} onAssign={assign} emptyTitle={copy('noOrders', 'Belum ada order')} />}
            {!loading && error === null && tab === 'staff' && user?.role === 'notaris' && <StaffList staff={staff} mutating={mutating} onToggle={(row) => void mutate(`staff-${row.id}`, async () => { const active = await api.toggleNotaryStaff(row.id); setStaff((rows) => rows.map((item) => item.id === row.id ? { ...item, is_active: active } : item)); })} copy={copy} />}
            {notice && !selectedOrder && <p role="status" className="mt-5 text-center text-sm font-bold text-slate-600">{notice}</p>}
          </section>
        </>
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
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {orders.map((order) => {
        const assignmentBusy = mutating === `assign-${order.id}`;
        return (
          <article key={order.id} className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <button type="button" onClick={() => onOpen(order.tracking_code)} className="flex flex-1 flex-col text-left">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-elm">{order.tracking_code}</span>
                <StatusBadge status={order.status} />
              </div>
              <h2 className="mt-5 text-xl font-black leading-tight text-big-stone">{order.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{order.service_name || 'Layanan legalitas'}</p>
              <div className="mt-6">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Progress</span><span>{Math.round(Number(order.progress) || 0)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-elm" style={{ width: `${Math.min(100, Math.max(0, Number(order.progress) || 0))}%` }} /></div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p><p className="mt-1 text-sm font-bold text-big-stone">{order.customer_name || '-'}</p></div>
                <ChevronRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-elm" size={22} />
              </div>
            </button>

            {principal && (
              <label className="mt-5 block border-t border-slate-100 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Penanggung jawab
                <div className="relative mt-2">
                  <select
                    value={order.assigned_staff_id ?? ''}
                    disabled={assignmentBusy}
                    onChange={(event) => void onAssign(order, event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-9 text-sm font-semibold normal-case tracking-normal text-big-stone outline-none focus:border-elm disabled:opacity-60"
                  >
                    <option value="">Belum ditugaskan</option>
                    {staff.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                  {assignmentBusy && <LoaderCircle className="absolute right-3 top-3 animate-spin text-elm" size={17} />}
                </div>
              </label>
            )}
          </article>
        );
      })}
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
  if (staff.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
        <Users2 className="mx-auto text-slate-300" size={42} />
        <h2 className="mt-4 text-xl font-black text-big-stone">{copy('noStaff', 'Belum ada staf notaris')}</h2>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {staff.map((row) => {
        const busy = mutating === `staff-${row.id}`;
        return (
          <div key={row.id} className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 last:border-0 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-big-stone"><Users2 size={20} /></div>
              <div><p className="font-black text-big-stone">{row.name}</p><p className="mt-1 text-xs text-slate-500">{row.email}</p></div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggle(row)}
              className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider disabled:opacity-60 ${row.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
            >
              {busy ? <LoaderCircle className="animate-spin" size={14} /> : row.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {row.is_active ? copy('active', 'Aktif') : copy('inactive', 'Nonaktif')}
            </button>
          </div>
        );
      })}
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
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoaderCircle className="animate-spin text-elm" size={38} /></div>;
  if (error !== null) return <><button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><ArrowLeft size={16} />Kembali</button><PortalFailure error={error} retry={onRetry} loginHref={loginHref} /></>;
  if (!detail) return null;

  const progress = Math.min(100, Math.max(0, Number(detail.progress) || 0));

  function confirmAction(message: string, action: () => void) {
    if (window.confirm(message)) action();
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-7 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 hover:border-elm hover:text-elm"><ArrowLeft size={16} />{copy('back', 'Kembali ke order')}</button>

      <header className="rounded-3xl bg-big-stone p-7 text-white shadow-xl md:p-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div><p className="font-mono text-xs font-bold uppercase tracking-widest text-elm-light">{detail.tracking_code}</p><h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">{detail.title}</h1><p className="mt-3 text-sm text-white/60">{detail.service_name || 'Layanan legalitas'}</p></div>
          <StatusBadge status={detail.status} />
        </div>
        <div className="mt-8"><div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/60"><span>Progress pekerjaan</span><span>{Math.round(progress)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-elm-light" style={{ width: `${progress}%` }} /></div></div>
      </header>

      {notice && <p role="status" className="mt-5 rounded-2xl border border-elm/20 bg-elm/5 px-5 py-4 text-center text-sm font-bold text-elm">{notice}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-big-stone"><ShieldCheck className="text-elm" size={18} />Informasi customer</h2>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama</dt><dd className="mt-1 font-bold text-big-stone">{detail.customer_name || '-'}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telepon</dt><dd className="mt-1 font-bold text-big-stone">{detail.customer_phone || '-'}</dd></div>{detail.assigned_staff_name && <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Staf ditugaskan</dt><dd className="mt-1 font-bold text-big-stone">{detail.assigned_staff_name}</dd></div>}</dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-big-stone"><FileText className="text-elm" size={18} />Dokumen final</h2>
            <div className="mt-5 space-y-3">
              {detail.documents.length === 0 && <p className="text-sm text-slate-500">Belum ada dokumen yang dirilis.</p>}
              {detail.documents.map((document) => <a key={document.id} href={notaryDocumentUrl(document.id, backendOrigin)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold text-big-stone hover:border-elm hover:text-elm"><span className="min-w-0 truncate">{document.name}</span><Download className="shrink-0" size={17} /></a>)}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <div className="flex items-center gap-3"><Clock3 className="text-elm" size={22} /><div><h2 className="text-xl font-black text-big-stone">Tahapan pekerjaan</h2><p className="text-sm text-slate-500">Perbarui tahap dan checklist sesuai progres aktual.</p></div></div>
          {detail.stages.map((stage, index) => {
            const stageBusy = mutating === `stage-${stage.id}`;
            const requiredIncomplete = stage.checklist_items.some((item) => item.is_required && !item.is_completed);
            const completed = stage.status === 'completed';
            return (
              <article key={stage.id} className={`rounded-3xl border bg-white p-6 shadow-sm ${completed ? 'border-emerald-200' : 'border-slate-200'}`}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex gap-4"><div className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{completed ? <CheckCircle2 size={20} /> : index + 1}</div><div><h3 className="text-lg font-black text-big-stone">{stage.name}</h3>{stage.description && <p className="mt-1 text-sm text-slate-500">{stage.description}</p>}{stage.is_final && <span className="mt-2 inline-flex rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">Tahap final — dikelola admin</span>}</div></div>
                  {!stage.is_final && <button type="button" disabled={stageBusy || (!completed && requiredIncomplete)} onClick={() => completed ? confirmAction('Batalkan penyelesaian tahap ini?', () => onUndoStage(stage)) : confirmAction('Tandai tahap ini selesai?', () => onCompleteStage(stage))} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40 ${completed ? 'border border-slate-200 text-slate-600' : 'bg-elm text-white'}`}>{stageBusy ? <LoaderCircle className="animate-spin" size={15} /> : completed ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}{completed ? 'Batalkan tahap' : 'Selesaikan tahap'}</button>}
                </div>

                {stage.checklist_items.length > 0 && <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">{stage.checklist_items.map((item) => { const busy = mutating === `check-${item.id}`; return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"><div className="flex min-w-0 items-center gap-3">{item.is_completed ? <CheckCircle2 className="shrink-0 text-emerald-600" size={18} /> : <span className="size-[18px] shrink-0 rounded-full border-2 border-slate-300" />}<p className={`text-sm font-semibold ${item.is_completed ? 'text-slate-400 line-through' : 'text-big-stone'}`}>{item.name}{item.is_required && <span className="ml-1 text-red-500">*</span>}</p></div><button type="button" disabled={busy || completed} onClick={() => item.is_completed ? confirmAction('Batalkan checklist ini?', () => onUndoChecklist(item.id)) : onCompleteChecklist(item.id)} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 disabled:opacity-40">{busy ? <LoaderCircle className="animate-spin" size={13} /> : item.is_completed ? 'Batalkan' : 'Selesai'}</button></div>; })}</div>}
                {!completed && requiredIncomplete && <p className="mt-4 text-xs font-semibold text-amber-700">Lengkapi seluruh checklist wajib sebelum menyelesaikan tahap.</p>}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
