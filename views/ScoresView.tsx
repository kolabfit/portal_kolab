import React, { useEffect, useMemo, useState } from 'react';
import { Award, CalendarCheck, Search, X, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { InternScore, InternScoresResponse, UserRole } from '../types';
import { TablePagination } from '../components/TableControls';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const sourceNames = { socialCredit: 'Social Credit', presence: 'Presensi' } as const;

// Warna nilai: ≥80 hijau, 60–79 kuning, <60 merah. Samakan dengan scoreTone di socialcreditkolab/src/utils.ts.
export const scoreTone = (score: number) => score >= 80 ? 'good' : score >= 60 ? 'mid' : 'low';
const TONE = {
  good: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  mid: { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
  low: { badge: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500' },
};
const ScoreBadge = ({ score, label, size = 'sm' }: { score: number; label?: string; size?: 'sm' | 'lg' }) => (
  <span className={`inline-flex items-baseline gap-1 rounded-xl border font-black ${TONE[scoreTone(score)].badge} ${size === 'lg' ? 'px-4 py-1.5 text-4xl' : 'px-3 py-1 text-sm'}`}>
    {score}{label && <span className={`${size === 'lg' ? 'text-sm' : 'text-[10px]'} opacity-80`}>{label}</span>}
  </span>
);

// Nilai magang: skor Social Credit + KPI Presensi. Mahasiswa melihat dirinya, dosen bimbingannya, admin semua.
const ScoresView: React.FC<{ role: UserRole }> = ({ role }) => {
  const [state, setState] = useState<{ data: InternScoresResponse | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false });
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<InternScore | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const controller = new AbortController();
    setState(s => ({ ...s, loading: true, error: false }));
    api.getScores(controller.signal)
      .then(data => !controller.signal.aborted && setState({ data, loading: false, error: false }))
      .catch(() => !controller.signal.aborted && setState({ data: null, loading: false, error: true }));
    return () => controller.abort();
  }, [revision]);

  const rows = state.data?.data || [];
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter(r => !q || r.name.toLowerCase().includes(q) || r.nim.includes(q) || (r.startupName || '').toLowerCase().includes(q));
  }, [rows, query]);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const failed = state.data ? (Object.keys(sourceNames) as (keyof typeof sourceNames)[]).filter(k => state.data!.sources[k] !== 'ok') : [];
  const subtitle = role === UserRole.STUDENT ? 'Nilai magang saya' : role === UserRole.LECTURER ? `${rows.length} mahasiswa bimbingan` : `${rows.length} mahasiswa magang`;

  return <div className="space-y-8 animate-in fade-in duration-500 pb-20">
    <div><h1 className="text-4xl lg:text-5xl font-black tracking-tighter">Nilai Magang</h1><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{subtitle} · Social Credit & KPI Presensi</p></div>

    {state.loading && <div className="h-48 bg-slate-100 rounded-[2rem] animate-pulse" aria-label="Memuat nilai magang" />}
    {state.error && <div role="alert" className="bg-red-50 text-red-600 p-6 rounded-2xl text-center"><p className="font-bold">Nilai magang belum dapat dimuat.</p><button className="mt-4 bg-white border border-red-200 px-6 py-2 rounded-xl font-bold" onClick={() => setRevision(v => v + 1)}>Coba Lagi</button></div>}
    {failed.length > 0 && <div className="flex items-center gap-3 bg-amber-50 text-amber-700 p-4 rounded-2xl text-sm font-bold"><AlertTriangle size={18} />Data {failed.map(k => sourceNames[k]).join(' & ')} sedang tidak tersedia. Nilai yang tampil mungkin belum lengkap.</div>}

    {!state.loading && !state.error && rows.length === 0 && <div className="py-20 text-center text-xs font-black uppercase tracking-widest text-slate-300"><Award className="mx-auto mb-3" size={30} />{role === UserRole.STUDENT ? 'Belum ada magang yang sedang berjalan atau selesai.' : 'Belum ada mahasiswa magang.'}</div>}

    {role === UserRole.STUDENT && rows[0] && <ScoreDetail row={rows[0]} />}

    {role !== UserRole.STUDENT && rows.length > 0 && <>
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Nama / NIM / Startup..." className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-bold" /></div></div>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[800px]"><thead className="bg-slate-50"><tr>{['Nama', 'NIM', 'Startup', 'Social Credit', 'KPI Presensi', 'Periode Magang'].map(h => <th key={h} className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{paginated.map(r => <tr key={r.nim} onClick={() => setSelected(r)} className="hover:bg-orange-50/30 cursor-pointer">
            <td className="px-6 py-5 font-black text-sm">{r.name}</td>
            <td className="px-6 py-5 text-xs font-bold text-slate-500">{r.nim}</td>
            <td className="px-6 py-5 text-xs font-bold">{r.startupName || '-'}</td>
            <td className="px-6 py-5">{r.socialCredit ? <ScoreBadge score={r.socialCredit.score} label={`(${r.socialCredit.grade})`} /> : <span className="text-slate-300">-</span>}</td>
            <td className="px-6 py-5">{r.presence ? <ScoreBadge score={r.presence.kpiScore} label={r.presence.kpiStatus} /> : <span className="text-slate-300">-</span>}</td>
            <td className="px-6 py-5 text-xs font-bold text-slate-500">{fmtDate(r.internship.startDate)} – {fmtDate(r.internship.endDate)}</td>
          </tr>)}</tbody></table>
        {filtered.length > 0 && <TablePagination page={page} totalPages={Math.ceil(filtered.length / pageSize)} totalRows={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
        {filtered.length === 0 && <div className="py-16 text-center text-xs font-black uppercase tracking-widest text-slate-300">Mahasiswa tidak ditemukan.</div>}
      </div>
    </>}

    {selected && <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
      <div className="bg-slate-50 rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 lg:p-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6"><div><h2 className="text-3xl font-black tracking-tighter">{selected.name}</h2><p className="text-xs font-bold text-slate-400 mt-1">{selected.nim} · {selected.startupName || '-'}{selected.fieldSupervisor ? ` · Pembimbing lapangan: ${selected.fieldSupervisor}` : ''}</p></div><button aria-label="Tutup" onClick={() => setSelected(null)} className="p-2 text-slate-400"><X /></button></div>
        <ScoreDetail row={selected} />
      </div>
    </div>}
  </div>;
};

function ScoreDetail({ row }: { row: InternScore }) {
  const sc = row.socialCredit, p = row.presence;
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start mb-5"><div><h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center gap-2"><Award size={14} />Social Credit Score</h3><p className="text-xs font-bold text-slate-400 mt-1">Rata-rata berbobot aspek penilaian</p></div>
        {sc && <ScoreBadge score={sc.score} label={`(${sc.grade})`} size="lg" />}</div>
      {!sc ? <p className="text-sm font-bold text-slate-400">Belum ada data di aplikasi Social Credit (cek NIM).</p>
        : <div className="space-y-3">{sc.aspects.map(a => <Bar key={a.name} label={`${a.name} (${a.weight}%)`} value={a.value} />)}</div>}
    </section>
    <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start mb-5"><div><h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2"><CalendarCheck size={14} />KPI Presensi</h3><p className="text-xs font-bold text-slate-400 mt-1">{p ? `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}` : 'Periode magang'}</p></div>
        {p && <div className="text-right"><ScoreBadge score={p.kpiScore} size="lg" /><span className="block text-[10px] mt-1 text-slate-400 uppercase tracking-widest">{p.kpiStatus}</span></div>}</div>
      {!p ? <p className="text-sm font-bold text-slate-400">Belum ada data di aplikasi Presensi (cek NIM).</p>
        : <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">{([
          ['Tepat waktu', p.ontime], ['Telat', `${p.late}× · ${p.totalLateMinutes} mnt`], ['Alpha', p.alpha],
          ['Izin / sakit', p.izinSakit], ['Tanpa laporan', p.missingDailyReports],
          ['Laporan harian', `${p.reports.approved} ✓ · ${p.reports.disapproved} ✗ · ${p.reports.pending} pending`],
        ] as [string, string | number][]).map(([label, value]) => <div key={label} className="p-3 bg-slate-50 rounded-xl"><dt className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</dt><dd className="font-black text-sm mt-1">{value}</dd></div>)}</dl>}
    </section>
  </div>;
}

const Bar = ({ label, value }: { label: string; value: number }) => <div>
  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1"><span>{label}</span><ScoreBadge score={value} /></div>
  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className={`${TONE[scoreTone(value)].bar} h-full rounded-full`} style={{ width: `${value}%` }} /></div>
</div>;

export default ScoresView;
