import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  FileText,
  LoaderCircle,
  LogOut,
  Package,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  PortalApiError,
  createRuntimeApi,
  customerDocumentUrl,
  type AuthUser,
  type CustomerInvoiceDetail,
  type CustomerInvoiceSummary,
  type CustomerOrderDetail,
  type CustomerOrderSummary,
  type PaymentMethod,
} from '../lib/runtime-api';

interface Props {
  user: AuthUser;
  backendOrigin: string;
  loginHref: string;
  contactHref: string;
  onLogout: () => void;
}

type Tab = 'orders' | 'invoices';
type DetailTarget = { type: 'order' | 'invoice'; id: string } | null;

function money(value: number | string | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function receiptAttached(invoice: CustomerInvoiceSummary | CustomerInvoiceDetail): boolean {
  return invoice.has_payment_receipt ?? Boolean(invoice.payment_receipt);
}

function StatusBadge({ status }: { status: string }) {
  const completed = status === 'completed' || status === 'paid';
  const failed = status === 'canceled' || status === 'cancelled' || status === 'overdue';
  const Icon = completed ? CheckCircle2 : failed ? AlertCircle : Clock3;
  const className = completed
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : failed
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-orange-200 bg-orange-50 text-orange-700';

  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${className}`}><Icon size={12} />{status.replaceAll('_', ' ')}</span>;
}

function RequestError({ error, onRetry, loginHref }: { error: unknown; onRetry: () => void; loginHref: string }) {
  const sessionExpired = error instanceof PortalApiError && error.code === 'SESSION_EXPIRED';
  const forbidden = error instanceof PortalApiError && error.code === 'FORBIDDEN';
  const message = error instanceof Error ? error.message : 'Permintaan tidak dapat diproses.';

  return (
    <div role="alert" className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
      <AlertCircle className="mx-auto text-red-500" size={34} />
      <h3 className="mt-4 text-lg font-black text-big-stone">{sessionExpired ? 'Sesi berakhir' : forbidden ? 'Akses ditolak' : 'Data belum dapat dimuat'}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">{message}</p>
      {sessionExpired ? (
        <a href={loginHref} className="mt-6 inline-flex rounded-xl bg-elm px-5 py-3 text-xs font-bold uppercase tracking-wider text-white">Login kembali</a>
      ) : (
        <button type="button" onClick={onRetry} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-elm px-5 py-3 text-xs font-bold uppercase tracking-wider text-white"><RefreshCw size={15} />Coba lagi</button>
      )}
    </div>
  );
}

export default function CustomerPortalPanel({
  user,
  backendOrigin,
  loginHref,
  contactHref,
  onLogout,
}: Props) {
  const api = useMemo(() => createRuntimeApi({ origin: backendOrigin }), [backendOrigin]);
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoiceSummary[]>([]);
  const [orderDetail, setOrderDetail] = useState<CustomerOrderDetail | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<CustomerInvoiceDetail | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null);

  const loadPortal = useCallback(async () => {
    setDetailTarget(null);
    setLoading(true);
    setError(null);
    try {
      const [orderRows, invoiceRows] = await Promise.all([api.customerOrders(), api.customerInvoices()]);
      setOrders(orderRows);
      setInvoices(invoiceRows);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void loadPortal(); }, [loadPortal]);

  async function openOrder(code: string) {
    setDetailTarget({ type: 'order', id: code });
    setOrderDetail(null);
    setDetailLoading(true);
    setError(null);
    try { setOrderDetail(await api.customerOrderDetail(code)); }
    catch (caught) { setError(caught); }
    finally { setDetailLoading(false); }
  }

  async function openInvoice(number: string) {
    setDetailTarget({ type: 'invoice', id: number });
    setInvoiceDetail(null);
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await api.customerInvoiceDetail(number);
      setInvoiceDetail(detail.invoice);
      setPaymentMethods(detail.paymentMethods);
      setAdminWhatsapp(detail.adminWhatsapp);
    } catch (caught) { setError(caught); }
    finally { setDetailLoading(false); }
  }

  async function uploadReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !invoiceDetail) return;
    setNotice('');
    if (file.size > 7 * 1024 * 1024) {
      setNotice('Ukuran file maksimal 7 MB.');
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      await api.uploadInvoiceReceipt(invoiceDetail.invoice_number, file);
      const refreshed = await api.customerInvoiceDetail(invoiceDetail.invoice_number);
      setInvoiceDetail(refreshed.invoice);
      setInvoices((current) => current.map((row) => row.invoice_number === refreshed.invoice.invoice_number
        ? { ...row, has_payment_receipt: true }
        : row));
      setNotice('Bukti pembayaran berhasil diunggah dan menunggu verifikasi.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Upload gagal. Silakan coba lagi.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function logout() {
    try { await api.logout(); } finally { onLogout(); }
  }

  const unpaid = invoices.filter((invoice) => ['sent', 'overdue'].includes(invoice.status) && !receiptAttached(invoice)).length;
  const retryCurrentRequest = () => {
    if (detailTarget?.type === 'order') void openOrder(detailTarget.id);
    else if (detailTarget?.type === 'invoice') void openInvoice(detailTarget.id);
    else void loadPortal();
  };

  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-28 sm:px-6 lg:px-8 lg:pt-36" aria-label="Portal klien">
      <div className="relative overflow-hidden rounded-3xl bg-big-stone p-7 text-white shadow-xl md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-elm/30 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div><p className="mb-3 inline-flex items-center gap-2 rounded-full border border-elm/30 bg-elm/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-200"><ShieldCheck size={13} />Portal Klien</p><h1 className="text-3xl font-black tracking-tight md:text-5xl">Selamat datang, {user.name}</h1><p className="mt-2 text-sm text-slate-300">Pantau order, dokumen, tagihan, dan bukti pembayaran Anda.</p></div>
          <button type="button" onClick={logout} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/20"><LogOut size={15} />Logout</button>
        </div>
      </div>

      <div className="mt-8 flex gap-3 overflow-x-auto border-b border-slate-200 pb-4">
        <button type="button" onClick={() => { setTab('orders'); setInvoiceDetail(null); setDetailTarget(null); }} className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'orders' ? 'bg-elm text-white' : 'border border-slate-200 bg-white text-slate-600'}`}><Package size={16} />Order saya</button>
        <button type="button" onClick={() => { setTab('invoices'); setOrderDetail(null); setDetailTarget(null); }} className={`relative flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'invoices' ? 'bg-elm text-white' : 'border border-slate-200 bg-white text-slate-600'}`}><CreditCard size={16} />Tagihan{unpaid > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">{unpaid}</span>}</button>
        <a href="#tracking-manual" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">Cari manual</a>
      </div>

      <div className="mt-8">
        {loading && <div className="flex min-h-56 items-center justify-center"><LoaderCircle className="animate-spin text-elm" size={34} /></div>}
        {!loading && error !== null && <RequestError error={error} onRetry={retryCurrentRequest} loginHref={loginHref} />}
        {!loading && !error && detailLoading && <div className="flex min-h-56 items-center justify-center"><LoaderCircle className="animate-spin text-elm" size={34} /></div>}

        {!loading && !error && !detailLoading && tab === 'orders' && orderDetail && (
          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:p-9">
            <button type="button" onClick={() => { setOrderDetail(null); setDetailTarget(null); }} className="mb-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-elm"><ArrowLeft size={15} />Kembali ke daftar</button>
            <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="font-mono text-xs font-bold text-elm">#{orderDetail.tracking_code}</p><h2 className="mt-2 text-2xl font-black text-big-stone md:text-3xl">{orderDetail.title}</h2><p className="mt-2 text-sm text-slate-500">{orderDetail.service_name || '-'}</p></div><StatusBadge status={orderDetail.status} /></div>
            <div className="mt-8"><div className="mb-2 flex justify-between text-xs font-bold"><span>Progres</span><span>{orderDetail.progress || 0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-elm" style={{ width: `${Math.min(100, Number(orderDetail.progress) || 0)}%` }} /></div></div>
            {orderDetail.public_note && <div className="mt-7 rounded-2xl border border-orange-100 bg-orange-50 p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Catatan admin</p><p className="mt-2 text-sm text-slate-700">{orderDetail.public_note}</p></div>}
            {orderDetail.documents.length > 0 && <div className="mt-8"><h3 className="mb-4 flex items-center gap-2 font-black"><FileText size={18} className="text-elm" />Dokumen final</h3><div className="grid gap-3 sm:grid-cols-2">{orderDetail.documents.map((doc) => <a key={doc.id} href={customerDocumentUrl(doc.id, backendOrigin)} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 text-sm font-bold hover:border-elm hover:text-elm"><span>{doc.name}</span><Download size={16} /></a>)}</div></div>}
            {orderDetail.stages.length > 0 && <ol className="mt-8 space-y-3 border-t border-slate-100 pt-8">{orderDetail.stages.map((stage) => <li key={stage.id} className="flex gap-3 rounded-xl border border-slate-100 p-4"><span className={`mt-1 size-3 shrink-0 rounded-full ${stage.status === 'completed' ? 'bg-elm' : stage.status === 'in_progress' ? 'bg-orange-400' : 'bg-slate-200'}`} /><div><h4 className="font-bold text-big-stone">{stage.name}</h4><p className="mt-1 text-xs uppercase tracking-wider text-slate-400">{stage.status.replaceAll('_', ' ')}</p></div></li>)}</ol>}
          </article>
        )}

        {!loading && !error && !detailLoading && tab === 'orders' && !orderDetail && (orders.length ? <div className="grid gap-5 md:grid-cols-2">{orders.map((order) => <button type="button" key={order.id} onClick={() => void openOrder(order.tracking_code)} className="group rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-elm/30"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-bold text-elm">#{order.tracking_code}</span><StatusBadge status={order.status} /></div><h2 className="mt-4 text-xl font-black text-big-stone group-hover:text-elm">{order.title}</h2><p className="mt-2 text-xs text-slate-500">{order.service_name || '-'}</p><div className="mt-6 flex items-center justify-between"><span className="text-xs font-bold text-slate-400">Progres {order.progress || 0}%</span><ChevronRight size={18} className="text-elm" /></div></button>)}</div> : <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center"><Package className="mx-auto text-slate-300" size={34} /><h3 className="mt-4 font-black">Belum ada order</h3></div>)}

        {!loading && !error && !detailLoading && tab === 'invoices' && invoiceDetail && (
          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:p-9">
            <button type="button" onClick={() => { setInvoiceDetail(null); setDetailTarget(null); setNotice(''); }} className="mb-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-elm"><ArrowLeft size={15} />Kembali ke daftar</button>
            <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="font-mono text-xs font-bold text-elm">#{invoiceDetail.invoice_number}</p><h2 className="mt-2 text-2xl font-black text-big-stone">Tagihan layanan</h2><p className="mt-2 text-sm text-slate-500">Order #{invoiceDetail.order?.tracking_code || invoiceDetail.tracking_code || '-'}</p></div><div className="text-right"><StatusBadge status={invoiceDetail.status} /><p className="mt-3 text-3xl font-black">{money(invoiceDetail.total)}</p><p className="mt-1 text-xs text-slate-400">Jatuh tempo {invoiceDetail.due_at || '-'}</p></div></div>
            {invoiceDetail.items && invoiceDetail.items.length > 0 && <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100">{invoiceDetail.items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-slate-100 p-4 last:border-0"><div><p className="text-sm font-bold">{item.description}</p><p className="text-xs text-slate-400">{item.quantity} × {money(item.unit_price)}</p></div><p className="text-sm font-black">{money(item.amount)}</p></div>)}</div>}
            {paymentMethods.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-2">{paymentMethods.map((method) => <div key={method.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{method.bank_name}</p><p className="mt-2 text-lg font-black">{method.account_number}</p><p className="text-xs text-slate-500">a/n {method.account_name}</p></div>)}</div>}
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-elm/10 bg-elm/5 p-5">
              {adminWhatsapp ? <a href={`https://wa.me/${adminWhatsapp.replace(/\D/g, '')}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase">Hubungi admin</a> : <a href={contactHref} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase">Hubungi admin</a>}
              {!['paid', 'cancelled', 'canceled'].includes(invoiceDetail.status) && <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-elm px-4 py-3 text-xs font-bold uppercase text-white ${uploading ? 'pointer-events-none opacity-60' : ''}`}><input type="file" className="sr-only" accept="image/jpeg,image/png,application/pdf" onChange={uploadReceipt} disabled={uploading} />{uploading ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />}{uploading ? 'Mengunggah' : receiptAttached(invoiceDetail) ? 'Ganti bukti' : 'Unggah bukti'}</label>}
              {receiptAttached(invoiceDetail) && <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={15} />Bukti telah dilampirkan</span>}
            </div>
            {notice && <p role="status" className="mt-4 text-sm font-bold text-slate-600">{notice}</p>}
          </article>
        )}

        {!loading && !error && !detailLoading && tab === 'invoices' && !invoiceDetail && (invoices.length ? <div className="space-y-4">{invoices.map((invoice) => <button type="button" key={invoice.id} onClick={() => void openInvoice(invoice.invoice_number)} className="flex w-full flex-col justify-between gap-5 rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:border-elm/30 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs font-bold text-elm">#{invoice.invoice_number}</span><StatusBadge status={invoice.status} />{receiptAttached(invoice) && <span className="text-[10px] font-bold uppercase text-emerald-600">Bukti terlampir</span>}</div><h2 className="mt-3 text-2xl font-black">{money(invoice.total)}</h2><p className="mt-1 text-xs text-slate-400">Jatuh tempo {invoice.due_at || '-'}</p></div><ChevronRight className="text-elm" /></button>)}</div> : <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center"><CreditCard className="mx-auto text-slate-300" size={34} /><h3 className="mt-4 font-black">Belum ada tagihan</h3></div>)}
      </div>
    </section>
  );
}
