'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowUpRight, BarChart3, CalendarDays, CircleHelp, Download, LayoutDashboard, LogOut, Package, RefreshCw, Search, ShieldCheck, ShoppingBag, Store, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type Daily = { date: string; personal: number; business: number; uniqueUsers: number; logins: number };
interface Metrics {
  generatedAt: string; timeZone: string; trackingSince: string | null;
  period: { days: number; from: string; to: string };
  totals: { people: number; businesses: number; verifiedBusinesses: number; businessProducts: number; reservedProducts: number };
  activity: { today: Daily; uniqueUsers: number; logins: number };
  daily: Daily[];
  sales: { available: boolean; confirmedUnits: number | null; revenue: number | null; currency: string; reason: string };
  businesses: { id: string; name: string; isVerified: boolean; createdAt: string; publishedProducts: number; soldUnits: number | null; revenue: number | null }[];
}
const number = (value: number) => new Intl.NumberFormat('es-PE').format(value);
const dateLabel = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Users }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3"><span className="text-sm font-medium text-slate-500">{label}</span><span className="rounded-xl bg-orange-50 p-2 text-orange-600"><Icon size={19} /></span></div>
    <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p>
  </article>;
}
function AccessChart({ daily, trackingSince }: { daily: Daily[]; trackingSince: string | null }) {
  const [selected, setSelected] = useState<Daily | null>(null);
  const max = Math.max(1, ...daily.map(day => Math.max(day.personal, day.business)));
  const ticks = Math.min(4, max);
  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><div className="flex gap-5"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-orange-500" />Personas</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-slate-800" />Negocios</span></div><span>Usuarios únicos por día · Lima</span></div>
    <div className="relative h-60 pl-8">
      <div aria-hidden="true" className="absolute inset-0 bottom-6 left-0 flex flex-col justify-between">{Array.from({ length: ticks + 1 }, (_, i) => <div key={i} className="flex items-center gap-3 text-[10px] text-slate-400"><span className="w-5 text-right">{Math.ceil(max * (ticks - i) / ticks)}</span><span className="h-px flex-1 bg-slate-100" /></div>)}</div>
      <div className="absolute bottom-6 left-9 right-0 top-0 flex items-end gap-px sm:gap-1">{daily.map(day => {
        const tracked = trackingSince !== null && day.date >= trackingSince;
        return <button key={day.date} type="button" onClick={() => setSelected(day)} onFocus={() => setSelected(day)} onMouseEnter={() => setSelected(day)}
          aria-label={`${dateLabel(day.date)}: ${tracked ? `${day.personal} personas, ${day.business} negocios, ${day.logins} ingresos` : 'sin historial de accesos'}`}
          className={`relative flex h-full min-w-0 flex-1 items-end justify-center gap-px rounded-t px-px hover:bg-slate-100 focus:outline focus:outline-2 focus:outline-orange-400 ${!tracked ? 'bg-slate-50' : ''}`}>
          <span className="w-1/2 rounded-t-sm bg-orange-500" style={{ height: `${day.personal / max * 100}%`, minHeight: tracked && !day.personal ? 2 : 0 }} /><span className="w-1/2 rounded-t-sm bg-slate-800" style={{ height: `${day.business / max * 100}%`, minHeight: tracked && !day.business ? 2 : 0 }} />
        </button>;
      })}</div>
      <div aria-hidden="true" className="absolute bottom-0 left-9 right-0 flex justify-between text-[10px] text-slate-400"><span>{dateLabel(daily[0].date)}</span><span>{dateLabel(daily[Math.floor(daily.length / 2)].date)}</span><span>{dateLabel(daily[daily.length - 1].date)}</span></div>
    </div>
    <p aria-live="polite" className="mt-4 min-h-5 text-xs text-slate-500">{selected ? `${dateLabel(selected.date)} · ${trackingSince && selected.date >= trackingSince ? `${selected.personal} personas · ${selected.business} negocios · ${selected.logins} inicios de sesión` : 'Sin historial registrado'}` : 'Selecciona un día para consultar su detalle.'}</p>
  </div>;
}

export default function MetricsDashboard() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState('30');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const revision = useRef(0);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !isLoading && !user) router.replace('/login');
    else if (mounted && user && user.role !== 'ADMIN') router.replace('/');
  }, [mounted, isLoading, user, router]);
  const load = useCallback(async () => {
    if (!token || user?.role !== 'ADMIN') return;
    const id = ++revision.current; setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/metrics?days=${days}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las métricas');
      if (id === revision.current) setMetrics(data);
    } catch (error) { if (id === revision.current) { setMetrics(null); setError(error instanceof Error ? error.message : 'Error de conexión'); } }
    finally { if (id === revision.current) setLoading(false); }
  }, [token, user?.role, days]);
  useEffect(() => { setMetrics(null); void load(); return () => { revision.current++; }; }, [load]);
  const exportCsv = () => {
    if (!metrics) return;
    const csv = '\uFEFF' + ['Fecha,Personas_unicas,Negocios_unicos,Usuarios_unicos,Inicios_de_sesion,Estado', ...metrics.daily.map(day => metrics.trackingSince && day.date >= metrics.trackingSince ? `${day.date},${day.personal},${day.business},${day.uniqueUsers},${day.logins},Registrado` : `${day.date},,,,,Sin historial`)].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `promexa-accesos-${metrics.period.from}-${metrics.period.to}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  if (!mounted || isLoading || !user || user.role !== 'ADMIN') return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Verificando acceso a la intranet...</div>;
  const rows = metrics?.businesses.filter(business => business.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))) || [];
  return <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
      <Link href="/admin" className="flex h-24 items-center gap-3 px-7"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-xl font-bold text-white">P</span><div><strong className="text-lg tracking-tight">PROMEXA</strong><span className="block text-[10px] font-semibold uppercase tracking-[.22em] text-slate-400">Intranet</span></div></Link>
      <div className="px-7 pb-3 pt-6 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Administración</div>
      <nav className="space-y-2 px-4 text-sm"><Link aria-current="page" href="/admin" className="flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 font-semibold text-orange-700"><LayoutDashboard size={18} />Resumen y métricas</Link><Link href="/admin/usuarios" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-500 hover:bg-slate-50"><Users size={18} />Gestión de usuarios</Link><Link href="/admin/moderacion" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-500 hover:bg-slate-50"><ShieldCheck size={18} />Moderación</Link></nav>
      <div className="mt-auto space-y-3 border-t border-slate-100 p-6"><Link href="/" className="flex items-center justify-between text-sm text-slate-500">Ir a Promexa<ArrowUpRight size={16} /></Link><button onClick={() => { logout(); router.replace('/login'); }} className="flex items-center gap-2 text-sm text-slate-500"><LogOut size={16} />Cerrar sesión</button></div>
    </aside>
    <div className="lg:ml-60">
      <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8"><div className="flex items-center gap-2 text-sm text-slate-500"><BarChart3 size={17} /><span>Intranet</span><span className="mx-1 text-slate-300">/</span><span className="font-medium text-slate-800">Métricas</span></div><div className="flex items-center gap-3"><span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:block">Acceso administrativo</span><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white" title={user.name}>{user.name.slice(0, 2).toUpperCase()}</span><button className="text-slate-400 lg:hidden" aria-label="Cerrar sesión" onClick={() => { logout(); router.replace('/login'); }}><LogOut size={18} /></button></div></header>
      <main className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-orange-600">Visión general</p><h1 className="text-3xl font-bold tracking-tight">La actividad de tu comunidad</h1><p className="mt-2 text-sm text-slate-500">Accesos de usuarios y actividad de los negocios en un solo lugar.</p></div><div className="flex items-center gap-2"><button disabled={loading} onClick={load} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Actualizar</button><button disabled={!metrics || loading} onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40"><Download size={15} />Exportar accesos</button></div></div>
        <nav className="flex gap-4 text-sm text-slate-500 lg:hidden"><Link href="/admin/usuarios">Usuarios</Link><Link href="/admin/moderacion">Moderación</Link><Link href="/">Ir a Promexa</Link></nav>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-slate-500"><CalendarDays size={16} /><label htmlFor="metrics-period">Periodo</label><select id="metrics-period" value={days} onChange={event => setDays(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800">{['7', '30', '90'].map(value => <option key={value} value={value}>Últimos {value} días</option>)}</select></div><p className="text-xs text-slate-400">{metrics ? `Actualizado ${new Date(metrics.generatedAt).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })} · Lima` : 'Hora de Lima (UTC−5)'}</p></div>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={load} className="ml-3 font-semibold underline">Reintentar</button></div>}
        {loading && !metrics && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">Consultando métricas...</div>}
        {metrics && <>
          <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Usuarios que ingresaron hoy" value={number(metrics.activity.today.uniqueUsers)} detail={`${number(metrics.activity.today.logins)} inicios de sesión · personas y negocios`} icon={Activity} /><Stat label="Personas registradas" value={number(metrics.totals.people)} detail="Cuentas personales de la comunidad" icon={Users} /><Stat label="Cuentas de negocio" value={number(metrics.totals.businesses)} detail={`${number(metrics.totals.verifiedBusinesses)} negocios verificados`} icon={Store} /><Stat label="Productos de negocios" value={number(metrics.totals.businessProducts)} detail={`${number(metrics.totals.reservedProducts)} reservados actualmente`} icon={Package} /></section>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Ingresos diarios de usuarios</h2><p className="mt-1 text-xs text-slate-500">Una cuenta se cuenta una vez por día, aunque inicie sesión varias veces.</p></div><div className="text-right"><p className="text-2xl font-bold">{number(metrics.activity.uniqueUsers)}</p><p className="text-[11px] text-slate-400">usuarios únicos en el periodo</p></div></div><AccessChart key={days} daily={metrics.daily} trackingSince={metrics.trackingSince} /><div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500"><CircleHelp size={15} className="mt-px shrink-0" /><p>{metrics.trackingSince ? `Primer acceso registrado: ${dateLabel(metrics.trackingSince)}. Los días anteriores no tienen historial.` : 'El registro comenzará con el próximo inicio de sesión de una persona o negocio. No hay historial previo.'} Las sesiones administrativas no se incluyen.</p></div></section>
            <section className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white"><span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-white/10"><ShoppingBag size={21} /></span><h2 className="text-lg font-semibold">Ventas de los negocios</h2><span className="mt-3 inline-block rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-[11px] font-medium text-orange-200">Próxima integración</span><div className="mt-7 space-y-5"><div><p className="text-xs text-slate-400">Unidades vendidas</p><p className="mt-1 text-3xl font-semibold text-slate-500">—</p></div><div><p className="text-xs text-slate-400">Importe de ventas (PEN)</p><p className="mt-1 text-3xl font-semibold text-slate-500">—</p></div></div><p className="mt-7 border-t border-white/10 pt-5 text-xs leading-relaxed text-slate-400">{metrics.sales.reason} Un producto publicado o reservado todavía no representa una venta.</p></section>
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="text-lg font-semibold">Actividad por negocio</h2><p className="mt-1 text-xs text-slate-500">Catálogo actual de cada cuenta. Las ventas se mostrarán al confirmar compras.</p></div><div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input aria-label="Buscar negocio" placeholder="Buscar negocio..." value={search} onChange={event => setSearch(event.target.value)} className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" /></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Negocio</th><th className="px-6 py-3">Verificación</th><th className="px-6 py-3 text-right">Productos publicados</th><th className="px-6 py-3 text-right">Unidades vendidas</th><th className="px-6 py-3 text-right">Importe de ventas</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(business => <tr key={business.id} className="hover:bg-slate-50/70"><td className="px-6 py-4"><Link href={`/perfil/${business.id}`} className="flex items-center gap-3 font-medium hover:text-orange-600"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700"><Store size={17} /></span>{business.name}<ArrowUpRight size={14} className="text-slate-300" /></Link></td><td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${business.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{business.isVerified ? 'Verificado' : 'Pendiente'}</span></td><td className="px-6 py-4 text-right font-medium">{number(business.publishedProducts)}</td><td className="px-6 py-4 text-right text-slate-400">No disponible</td><td className="px-6 py-4 text-right text-slate-400">No disponible</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-10 text-center text-sm text-slate-500">{search ? 'No se encontraron negocios con ese nombre.' : 'Todavía no hay cuentas de negocio registradas.'}</p>}</div><div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">{rows.length} de {metrics.businesses.length} negocios · El catálogo muestra el estado actual; los accesos corresponden al periodo seleccionado.</div></section>
          <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"><summary className="cursor-pointer font-medium text-slate-700">Cómo se calculan estas métricas</summary><div className="mt-3 space-y-2 text-xs leading-relaxed"><p>Un ingreso es un inicio de sesión correcto o el acceso automático tras registrarse. Recargar páginas o restaurar una sesión existente no suma otro ingreso.</p><p>Usuarios únicos del periodo: cada cuenta se cuenta una sola vez entre {dateLabel(metrics.period.from)} y {dateLabel(metrics.period.to)}. Inicios de sesión registrados: {number(metrics.activity.logins)}.</p><p>Ventas e importes permanecen sin datos hasta que una compra se confirme mediante la futura integración de pagos.</p></div></details>
        </>}
        <footer className="pb-4 text-xs text-slate-400">Promexa · Intranet administrativa</footer>
      </main>
    </div>
  </div>;
}
