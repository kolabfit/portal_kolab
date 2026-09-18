import React, { useEffect, useRef, useState } from 'react';
import { Briefcase, Edit3, FileSpreadsheet, Loader2, Plus, RefreshCw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { api } from '../api';
import { Internship, InternshipStatus, StartupTeam, UserRole } from '../types';
import { ModalType } from './Modal';
import { TablePagination } from './TableControls';

interface MemberOption { studentId: string; name: string; role: UserRole; lecturerCode?: string }
interface Props {
  onShowAlert: (title: string, message: string, type: ModalType) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}
type Draft = Pick<Internship, 'studentNim' | 'startupId' | 'startDate' | 'endDate' | 'status'> & {
  fieldSupervisor: string;
  academicSupervisorNip: string;
  academicSupervisor2Nip: string;
};

const statuses: Record<InternshipStatus, { label: string; style: string }> = {
  PLANNED: { label: 'Belum Mulai', style: 'bg-slate-50 text-slate-600 border-slate-200' },
  ONGOING: { label: 'Sedang Magang', style: 'bg-orange-50 text-orange-600 border-orange-100' },
  COMPLETED: { label: 'Selesai', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  CANCELLED: { label: 'Dibatalkan', style: 'bg-red-50 text-red-600 border-red-100' }
};
const emptyDraft = (): Draft => ({ studentNim: '', startupId: '', startDate: '', endDate: '', fieldSupervisor: '', academicSupervisorNip: '', academicSupervisor2Nip: '', status: 'PLANNED' });
const fieldClass = 'w-full min-w-0 px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 focus:ring-4 focus:ring-orange-100/50 transition-all';
const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2';
const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));

// Embedded as the third Management User tab, with the existing alert/confirm flow.
const InternshipManagement: React.FC<Props> = ({ onShowAlert, showConfirm }) => {
  const [items, setItems] = useState<Internship[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [startups, setStartups] = useState<StartupTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [startupFilter, setStartupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState({ student: '', startup: '', period: '', fieldSupervisor: '', academicSupervisor: '', status: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Internship | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const mutationPending = useRef(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [records, people, teams] = await Promise.all([
      api.getData('getInternships'), api.postData('getAllMembers', {}), api.getData('getStartups')
    ]);
    const valid = Array.isArray(records) && Array.isArray(people) && Array.isArray(teams);
    if (valid) {
      setItems(records); setMembers(people); setStartups(teams);
    } else {
      onShowAlert('Gagal memuat magang', 'Data magang atau pilihan anggota/startup belum dapat dimuat. Silakan refresh.', 'error');
    }
    setLoadError(!valid);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const students = members.filter(member => member.role === UserRole.STUDENT);
  const lecturers = members.filter(member => member.role === UserRole.LECTURER);
  const studentOptions = students.filter(member => member.studentId === draft.studentNim ||
    `${member.name} ${member.studentId}`.toLowerCase().includes(studentSearch.trim().toLowerCase()));
  const filtered = items.filter(item =>
    `${item.studentName || ''} ${item.studentNim}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (startupFilter === 'ALL' || item.startupId === startupFilter) &&
    (statusFilter === 'ALL' || item.status === statusFilter) &&
    `${item.studentName || ''} ${item.studentNim}`.toLowerCase().includes(columnFilters.student.toLowerCase()) &&
    `${item.startupName || ''} ${item.startupId}`.toLowerCase().includes(columnFilters.startup.toLowerCase()) &&
    `${item.startDate} ${item.endDate}`.toLowerCase().includes(columnFilters.period.toLowerCase()) &&
    String(item.fieldSupervisor || '').toLowerCase().includes(columnFilters.fieldSupervisor.toLowerCase()) &&
    `${item.academicSupervisorName || ''} ${item.academicSupervisorNip || ''}`.toLowerCase().includes(columnFilters.academicSupervisor.toLowerCase()) &&
    String(item.status || '').toLowerCase().includes(columnFilters.status.toLowerCase()));
  const pageSize = 10;
  const pagedItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  useEffect(() => { setPage(1); }, [search, startupFilter, statusFilter, columnFilters]);

  const openForm = (item?: Internship) => {
    setEditing(item || null);
    setStudentSearch('');
    setDraft(item ? {
      studentNim: item.studentNim, startupId: item.startupId, startDate: item.startDate,
      endDate: item.endDate, fieldSupervisor: item.fieldSupervisor || '',
      academicSupervisorNip: item.academicSupervisorNip || '',
      academicSupervisor2Nip: item.academicSupervisor2Nip || '', status: item.status
    } : emptyDraft());
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationPending.current) return;
    mutationPending.current = true; setSaving(true);
    try {
      const result = await api.postData('manageInternship', { type: editing ? 'edit' : 'add', id: editing?.id, data: draft });
      if (result?.status !== 'success') {
        onShowAlert('Gagal menyimpan magang', result?.message || 'Data magang belum tersimpan.', 'error');
        return;
      }
      setFormOpen(false);
      onShowAlert('Magang tersimpan', 'Data magang berhasil disimpan.', 'success');
      await load();
    } finally { mutationPending.current = false; setSaving(false); }
  };

  const remove = (item: Internship) => {
    showConfirm('Hapus data magang?', `Hapus data magang ${item.studentName || item.studentNim} di ${item.startupName || item.startupId}?`, async () => {
      if (mutationPending.current) return;
      mutationPending.current = true; setSaving(true);
      try {
        const result = await api.postData('manageInternship', { type: 'delete', id: item.id });
        if (result?.status !== 'success') {
          onShowAlert('Gagal menghapus magang', result?.message || 'Data magang belum dihapus.', 'error');
          return;
        }
        onShowAlert('Magang dihapus', 'Data magang berhasil dihapus.', 'success');
        await load();
      } finally { mutationPending.current = false; setSaving(false); }
    });
  };

  const previewImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try { setImportPreview(await api.internshipImportPreview(importFile)); }
    catch (error) { onShowAlert('Import Magang', error instanceof Error ? error.message : 'Preview import gagal.', 'error'); }
    finally { setImporting(false); }
  };
  const commitImport = async () => {
    if (!importPreview?.rows?.length) return;
    setImporting(true);
    try {
      const result = await api.internshipImportCommit(importPreview.rows);
      onShowAlert('Import Magang', `${result.imported} data magang berhasil diimport.`, 'success');
      setImportPreview(null); setImportFile(null); await load();
    } catch (error) { onShowAlert('Import Magang', error instanceof Error ? error.message : 'Import gagal.', 'error'); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 min-w-0">
          <div className="relative min-w-0 sm:w-64">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input aria-label="Cari mahasiswa magang" placeholder="Cari nama / NIM..." value={search} onChange={event => setSearch(event.target.value)} className="w-full pl-12 pr-5 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold focus:ring-4 focus:ring-orange-100" />
          </div>
          <select aria-label="Filter startup" value={startupFilter} onChange={event => setStartupFilter(event.target.value)} className="min-w-0 px-5 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm font-bold text-xs outline-none focus:ring-4 focus:ring-orange-100">
            <option value="ALL">Semua Startup</option>
            {startups.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select aria-label="Filter status magang" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="min-w-0 px-5 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm font-bold text-xs outline-none focus:ring-4 focus:ring-orange-100">
            <option value="ALL">Semua Status</option>
            {Object.entries(statuses).map(([value, status]) => <option key={value} value={value}>{status.label}</option>)}
          </select>
        </div>
        <div className="flex gap-4 items-center">
          <button type="button" aria-label="Refresh magang" title="Refresh magang" disabled={loading || saving} onClick={() => void load()} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all disabled:opacity-50">
            <RefreshCw size={20} className={loading ? 'animate-spin text-orange-600' : ''} />
          </button>
          <button type="button" onClick={async () => { try { const blob = await api.downloadInternshipTemplate(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'template-data-magang-kolab.xlsx'; link.click(); URL.revokeObjectURL(url); } catch (error) { onShowAlert('Template Magang', error instanceof Error ? error.message : 'Template gagal diunduh.', 'error'); } }} className="px-5 py-4 bg-white border border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><FileSpreadsheet size={17} /> Template</button>
          <label className="px-5 py-4 bg-white border border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer"><Upload size={17} /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => { setImportFile(event.target.files?.[0] || null); setImportPreview(null); }} /></label>
          {importFile && <button type="button" disabled={importing} onClick={() => void previewImport()} className="px-5 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">{importing ? 'Memproses...' : 'Preview Import'}</button>}
          <button type="button" disabled={loading || saving || loadError} onClick={() => openForm()} className="px-6 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50">
            <Plus size={18} /> Tambah Magang
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]" aria-label="Daftar magang">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {['Mahasiswa', 'Startup', 'Periode', 'Pembimbing Lapangan', 'Pembimbing Akademik', 'Status', 'Aksi'].map(title => <th key={title} scope="col" className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</th>)}
            </tr>
            <tr className="bg-white border-b border-slate-100">
              {[
                ['student', 'Filter mahasiswa'], ['startup', 'Filter startup'], ['period', 'Filter periode'],
                ['fieldSupervisor', 'Filter pembimbing lapangan'], ['academicSupervisor', 'Filter pembimbing akademik'], ['status', 'Filter status']
              ].map(([key, placeholder]) => <th key={key} className="px-6 py-3"><input aria-label={placeholder} placeholder="Filter..." value={columnFilters[key as keyof typeof columnFilters]} onChange={event => setColumnFilters(filters => ({ ...filters, [key]: event.target.value }))} className="w-full min-w-[110px] px-3 py-2 rounded-xl bg-slate-50 text-xs outline-none" /></th>)}
              <th className="px-6 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading || loadError || !filtered.length ? <tr><td colSpan={7} className="px-6 py-24 text-center font-bold text-sm text-slate-400" role="status">
                {loading ? 'Memuat data magang...' : loadError ? 'Data belum dapat dimuat. Gunakan tombol refresh untuk mencoba lagi.' : items.length ? 'Tidak ada magang yang sesuai pencarian.' : 'Belum ada data magang. Klik Tambah Magang untuk memulai.'}
              </td></tr> : pagedItems.map(item => <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-6"><div className="font-black text-slate-900">{item.studentName || 'Mahasiswa tidak tersedia'}</div><div className="text-[11px] font-bold text-slate-400 font-mono mt-1">{item.studentNim}</div></td>
                <td className="px-6 py-6 text-sm font-bold text-slate-700">{item.startupName || `Startup tidak tersedia (${item.startupId})`}</td>
                <td className="px-6 py-6 text-xs font-bold text-slate-500 whitespace-nowrap">{formatDate(item.startDate)}<span className="block text-[10px] text-slate-300 my-1">s/d</span>{formatDate(item.endDate)}</td>
                <td className="px-6 py-6 text-sm font-bold text-slate-500 break-words">{item.fieldSupervisor || 'Belum ditentukan'}</td>
                <td className="px-6 py-6 text-sm font-bold text-slate-500">
                  <div className="mb-2">
                    {item.academicSupervisorName || (item.academicSupervisorNip ? 'Dosen tidak tersedia' : 'Belum ditentukan')}
                    {item.academicSupervisorNip && <div className="text-[10px] text-slate-400 mt-0.5">{item.academicSupervisorNip}{item.academicSupervisorCode && ` / ${item.academicSupervisorCode}`}</div>}
                  </div>
                  {item.academicSupervisor2Nip && (
                    <div className="pt-2 border-t border-slate-100">
                      {item.academicSupervisor2Name || 'Dosen tidak tersedia'}
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.academicSupervisor2Nip}{item.academicSupervisor2Code && ` / ${item.academicSupervisor2Code}`}</div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex border whitespace-nowrap ${statuses[item.status]?.style || statuses.PLANNED.style}`}>{statuses[item.status]?.label || item.status}</span></td>
                <td className="px-6 py-6"><div className="flex gap-2">
                  <button type="button" aria-label={`Edit magang ${item.studentNim}`} disabled={saving} onClick={() => openForm(item)} className="p-3 bg-white text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl shadow-sm disabled:opacity-50"><Edit3 size={18} /></button>
                  <button type="button" aria-label={`Hapus magang ${item.studentNim}`} disabled={saving} onClick={() => remove(item)} className="p-3 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl shadow-sm disabled:opacity-50"><Trash2 size={18} /></button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalRows={filtered.length} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {formOpen && <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div role="dialog" aria-modal="true" aria-labelledby="internship-form-title" className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-6 sm:p-10 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-4"><div className="w-12 h-12 shrink-0 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><Briefcase size={24} /></div><h3 id="internship-form-title" className="text-2xl font-black text-slate-900 tracking-tight">{editing ? 'Edit Magang' : 'Tambah Magang'}</h3></div>
            <button type="button" aria-label="Tutup form magang" disabled={saving} onClick={() => setFormOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 disabled:opacity-50"><X size={22} /></button>
          </div>
          <form onSubmit={save} className="space-y-6">
            <fieldset disabled={saving} className="grid grid-cols-1 sm:grid-cols-2 gap-5 min-w-0">
              <div className="sm:col-span-2">
                <label htmlFor="internship-student-search" className={labelClass}>Cari mahasiswa</label>
                <input id="internship-student-search" autoFocus type="search" placeholder="Cari nama atau NIM mahasiswa..." value={studentSearch} onChange={event => setStudentSearch(event.target.value)} className={fieldClass + ' mb-3'} />
                <label htmlFor="internship-student" className={labelClass}>Mahasiswa *</label>
                <select id="internship-student" required value={draft.studentNim} onChange={event => setDraft({ ...draft, studentNim: event.target.value })} className={fieldClass}>
                  <option value="">Pilih mahasiswa</option>
                  {draft.studentNim && !students.some(s => s.studentId === draft.studentNim) && <option value={draft.studentNim} disabled>Mahasiswa tidak tersedia ({draft.studentNim})</option>}
                  {studentOptions.map(student => <option key={student.studentId} value={student.studentId}>{student.name} — {student.studentId}</option>)}
                </select>
                {!studentOptions.length && <p className="text-xs text-slate-400 mt-2">Tidak ada mahasiswa yang sesuai pencarian.</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="internship-startup" className={labelClass}>Startup tempat magang *</label>
                <select id="internship-startup" required value={draft.startupId} onChange={event => setDraft({ ...draft, startupId: event.target.value })} className={fieldClass}>
                  <option value="">Pilih startup</option>
                  {draft.startupId && !startups.some(s => s.id === draft.startupId) && <option value={draft.startupId} disabled>Startup tidak tersedia ({draft.startupId})</option>}
                  {startups.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div><label htmlFor="internship-start" className={labelClass}>Tanggal mulai *</label><input id="internship-start" type="date" required min="1000-01-01" max="9999-12-31" value={draft.startDate} onChange={event => setDraft({ ...draft, startDate: event.target.value })} className={fieldClass} /></div>
              <div><label htmlFor="internship-end" className={labelClass}>Tanggal selesai *</label><input id="internship-end" type="date" required min={draft.startDate || '1000-01-01'} max="9999-12-31" value={draft.endDate} onChange={event => setDraft({ ...draft, endDate: event.target.value })} className={fieldClass} /></div>
              <div className="sm:col-span-2"><label htmlFor="internship-field" className={labelClass}>Pembimbing lapangan</label><input id="internship-field" maxLength={150} value={draft.fieldSupervisor} onChange={event => setDraft({ ...draft, fieldSupervisor: event.target.value })} className={fieldClass} placeholder="Nama pembimbing lapangan" /></div>
              <div className="sm:col-span-2">
                <label htmlFor="internship-academic" className={labelClass}>Pembimbing akademik 1</label>
                <select id="internship-academic" value={draft.academicSupervisorNip} onChange={event => setDraft({ ...draft, academicSupervisorNip: event.target.value })} className={fieldClass}>
                  <option value="">Belum ditentukan</option>
                  {draft.academicSupervisorNip && !lecturers.some(l => l.studentId === draft.academicSupervisorNip) && <option value={draft.academicSupervisorNip} disabled>Dosen tidak tersedia ({draft.academicSupervisorNip})</option>}
                  {lecturers.map(lecturer => <option key={lecturer.studentId} value={lecturer.studentId}>{lecturer.name} — {lecturer.studentId}{lecturer.lecturerCode ? ` / ${lecturer.lecturerCode}` : ''}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="internship-academic2" className={labelClass}>Pembimbing akademik 2</label>
                <select id="internship-academic2" value={draft.academicSupervisor2Nip} onChange={event => setDraft({ ...draft, academicSupervisor2Nip: event.target.value })} className={fieldClass}>
                  <option value="">Belum ditentukan (Opsional)</option>
                  {draft.academicSupervisor2Nip && !lecturers.some(l => l.studentId === draft.academicSupervisor2Nip) && <option value={draft.academicSupervisor2Nip} disabled>Dosen tidak tersedia ({draft.academicSupervisor2Nip})</option>}
                  {lecturers.map(lecturer => <option key={lecturer.studentId} value={lecturer.studentId}>{lecturer.name} — {lecturer.studentId}{lecturer.lecturerCode ? ` / ${lecturer.lecturerCode}` : ''}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label htmlFor="internship-status" className={labelClass}>Status magang *</label><select id="internship-status" required value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as InternshipStatus })} className={fieldClass}>{Object.entries(statuses).map(([value, status]) => <option key={value} value={value}>{status.label}</option>)}</select></div>
            </fieldset>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 disabled:opacity-50">Batal</button>
              <button type="submit" disabled={saving} className="flex-1 py-5 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-orange-700 disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? 'Menyimpan...' : 'Simpan Magang'}</button>
            </div>
          </form>
        </div>
      </div>}
      {importPreview && <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl p-8 max-h-[90vh] overflow-auto"><div className="flex justify-between items-center mb-6"><div><h3 className="text-2xl font-black">Preview Import Magang</h3><p className="text-xs font-bold text-slate-400 mt-2">{importPreview.totalRows} baris · valid {importPreview.rows.filter((row: any) => row.validationStatus === 'VALID').length}</p></div><button type="button" onClick={() => setImportPreview(null)} className="p-3 bg-slate-50 rounded-xl"><X size={20} /></button></div><div className="overflow-auto border rounded-2xl"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Baris</th><th className="p-3 text-left">NIM</th><th className="p-3 text-left">Startup</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Keterangan</th></tr></thead><tbody>{importPreview.rows.map((row: any) => <tr key={row.rowNumber} className="border-t"><td className="p-3">{row.rowNumber}</td><td className="p-3 font-mono">{row.studentNim}</td><td className="p-3">{row.startupId}</td><td className={`p-3 font-black ${row.validationStatus === 'VALID' ? 'text-emerald-600' : 'text-red-600'}`}>{row.validationStatus}</td><td className="p-3">{row.errors?.join(', ') || '-'}</td></tr>)}</tbody></table></div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setImportPreview(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase tracking-widest">Batal</button><button type="button" disabled={importing || importPreview.rows.some((row: any) => row.validationStatus !== 'VALID')} onClick={() => void commitImport()} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-50">{importing ? 'Mengimport...' : 'Konfirmasi Import'}</button></div></div></div>}
    </div>
  );
};
export default InternshipManagement;
