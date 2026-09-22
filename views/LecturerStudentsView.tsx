import React, { useMemo, useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import { LecturerStudentSummary } from '../types';
import { TablePagination } from '../components/TableControls';

interface Props { students: LecturerStudentSummary[]; onDetail: (nim: string) => Promise<any>; }

const LecturerStudentsView: React.FC<Props> = ({ students, onDetail }) => {
  const [query, setQuery] = useState('');
  const [startup, setStartup] = useState('');
  const [position, setPosition] = useState('');
  const [internship, setInternship] = useState('');
  const [workload, setWorkload] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const filtered = useMemo(() => students.filter(item => {
    const q = query.toLowerCase();
    return (!q || item.name.toLowerCase().includes(q) || item.nim.toLowerCase().includes(q))
      && (!startup || item.startup?.id === startup)
      && (!position || item.startup?.position === position)
      && (!internship || (internship === 'NONE' ? !item.internship : item.internship?.status === internship))
      && (!workload || (workload === '3+' ? item.activeWorkload >= 3 : item.activeWorkload === Number(workload)));
  }), [students, query, startup, position, internship, workload]);
  const startups = [...new Map(students.filter(s => s.startup).map(s => [s.startup!.id, s.startup!.name])).entries()];
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const openDetail = async (nim: string) => setSelected(await onDetail(nim));
  return <div className="space-y-8 animate-in fade-in duration-500 pb-20">
    <div><h1 className="text-4xl lg:text-5xl font-black tracking-tighter">Mahasiswa Ko+Lab</h1><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{students.length} mahasiswa terdaftar</p></div>
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      <div className="relative lg:col-span-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nama / NIM..." className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-bold"/></div>
      <select value={startup} onChange={e => setStartup(e.target.value)} className="px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none"><option value="">Semua Startup</option>{startups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <select value={position} onChange={e => setPosition(e.target.value)} className="px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none"><option value="">Semua Posisi</option>{['CEO','COO','CTO','CFO','CMO','MEMBER'].map(v => <option key={v} value={v}>{v}</option>)}</select>
      <select value={internship} onChange={e => setInternship(e.target.value)} className="px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none"><option value="">Semua Magang</option><option value="NONE">Tidak Magang</option><option value="PLANNED">Akan Magang</option><option value="ONGOING">Sedang Magang</option><option value="COMPLETED">Selesai</option></select>
      <select value={workload} onChange={e => setWorkload(e.target.value)} className="px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none"><option value="">Semua Workload</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3+">3+</option></select>
    </div>
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[850px]"><thead className="bg-slate-50"><tr>{['Name','NIM','Startup','Posisi','Magang','Workload','Status'].map(h => <th key={h} className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{paginated.map(item => <tr key={item.nim} onClick={() => void openDetail(item.nim)} className="hover:bg-orange-50/30 cursor-pointer">
          <td className="px-6 py-5 font-black text-sm">{item.name}</td><td className="px-6 py-5 text-xs font-bold text-slate-500">{item.nim}</td><td className="px-6 py-5 text-xs font-bold">{item.startup?.name || '-'}</td><td className="px-6 py-5 text-xs font-black text-orange-600">{item.startup?.position || '-'}</td><td className="px-6 py-5 text-xs font-bold">{item.internship ? item.internship.status : 'Tidak Magang'}</td><td className="px-6 py-5 text-xs font-black">{item.activeWorkload}</td><td className="px-6 py-5"><span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black">{item.memberStatus}</span></td>
        </tr>)}</tbody></table>
      {filtered.length > 0 && <TablePagination page={currentPage} totalPages={totalPages} totalRows={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />}
      {filtered.length === 0 && <div className="py-20 text-center text-xs font-black uppercase tracking-widest text-slate-300"><Users className="mx-auto mb-3" size={30}/>Mahasiswa tidak ditemukan.</div>}
    </div>
    {selected && <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}><div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-7 lg:p-10" onClick={e => e.stopPropagation()}><div className="flex justify-between items-start mb-8"><div><h2 className="text-3xl font-black tracking-tighter">{selected.identity.name}</h2><p className="text-xs font-bold text-slate-400 mt-1">{selected.identity.nim}</p></div><button onClick={() => setSelected(null)} className="p-2 text-slate-400"><X/></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><Detail label="Status Member" value={selected.identity.memberStatus}/><Detail label="Startup" value={selected.startup?.name || '-'}/><Detail label="Posisi" value={selected.startup?.position || '-'}/><Detail label="Job Desk" value={selected.startup?.jobDesk || '-'}/><Detail label="Magang" value={selected.internship.current?.status || 'Tidak Magang'}/><Detail label="Pembimbing Lapangan" value={selected.internship.current?.field_supervisor || '-'}/></div><Section title="Riwayat Magang">{selected.internship.history.map((row: any) => <p key={row.id} className="text-sm font-bold py-2 border-b border-slate-100">{row.startup_name} · {row.status} · {row.start_date} — {row.end_date}</p>)}</Section><Section title="Workload"><p className="text-sm font-bold mb-3">Active Load: {selected.workload.activeLoad} · Total History: {selected.workload.totalHistory}</p>{selected.workload.active.map((row: any) => <p key={row.id} className="text-sm font-bold py-2 border-b border-slate-100">{row.name} · {row.status}</p>)}</Section></div></div>}
  </div>;
};
const Detail = ({ label, value }: { label: string; value: string }) => <div className="p-4 bg-slate-50 rounded-xl"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="font-black mt-1">{value}</p></div>;
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="mt-8"><h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3">{title}</h3>{children}</section>;
export default LecturerStudentsView;
