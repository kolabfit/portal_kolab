
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Calendar, Info, Tags, Search, Plus, Edit2, Trash2, 
  ChevronLeft, ChevronRight, ArrowUpDown, Filter, Save, X 
} from 'lucide-react';
import { Informasi, Schedule, Article, ArticleCategory, StartupTeam } from '../types';
import { api } from '../api';
import Modal from '../components/Modal';

interface ContentManagementViewProps {
  startups: StartupTeam[];
  onShowAlert: (title: string, msg: string, type: any) => void;
}

const ContentManagementView: React.FC<ContentManagementViewProps> = ({ startups, onShowAlert }) => {
  const [activeTab, setActiveTab] = useState<'informasi' | 'schedules' | 'articles' | 'categories'>('informasi');
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Table Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Delete Confirmation State
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    let result;
    if (activeTab === 'informasi') result = await api.getData('getInformasi');
    else if (activeTab === 'schedules') result = await api.getData('getSchedules');
    else if (activeTab === 'articles') result = await api.getData('getArticles');
    else if (activeTab === 'categories') result = await api.getData('getCategories');
    
    if (activeTab === 'articles' || activeTab === 'categories') {
       const cats = await api.getData('getCategories');
       setCategories(cats || []);
    }

    setData(Array.isArray(result) ? result : []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); setCurrentPage(1); }, [activeTab]);

  const sortedData = useMemo(() => {
    let filtered = data.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    if (sortKey) {
      filtered.sort((a, b) => {
        const valA = String(a[sortKey]);
        const valB = String(b[sortKey]);
        if (sortDir === 'asc') return valA.localeCompare(valB, undefined, { numeric: true });
        return valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return filtered;
  }, [data, searchTerm, sortKey, sortDir]);

  const pagedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleAction = async (type: 'add' | 'edit' | 'delete', id?: string, payload?: any) => {
    setIsLoading(true);
    const actionMap = {
      informasi: 'manageInformasi',
      schedules: 'manageSchedule',
      articles: 'manageArticle',
      categories: 'manageCategory'
    };
    
    const res = await api.postData(actionMap[activeTab], { type, id, data: payload });
    if (res?.status === 'success') {
      onShowAlert('Success', `Mainframe updated: ${type} operation successful.`, 'success');
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
      setConfirmDelete(null);
    } else {
      onShowAlert('Operation Failed', 'Database rejected the request.', 'error');
    }
    setIsLoading(false);
  };

  const renderForm = () => {
    const item = editingItem || {};
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload: any = { ...item };
        fd.forEach((val, key) => {
          if (key === 'tags') payload[key] = String(val).split(',').map(t => t.trim());
          else payload[key] = val;
        });
        handleAction(editingItem ? 'edit' : 'add', editingItem?.id, payload);
      }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeTab !== 'categories' && (
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Judul / Headline</label>
              <input name="title" defaultValue={item.title} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-orange-100 outline-none" />
            </div>
          )}
          
          {activeTab === 'categories' && (
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Kategori Name</label>
              <input name="name" defaultValue={item.name} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-orange-100 outline-none" />
            </div>
          )}

          {activeTab === 'informasi' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Tujuan Segment</label>
                <select name="targetType" defaultValue={item.targetType || 'ALL'} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none">
                  <option value="ALL">Semua Member HUB</option>
                  <option value="ROLE_STUDENT">Khusus Mahasiswa</option>
                  <option value="ROLE_LECTURER">Khusus Dosen</option>
                  <option value="STARTUP_ALL">Semua Tim Startup</option>
                  <option value="STARTUP_SPECIFIC">Spesifik Tim Startup</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Target Value (Startup ID)</label>
                <select name="targetValue" defaultValue={item.targetValue} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none">
                  <option value="">Tidak Ada</option>
                  {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}

          {(activeTab === 'informasi' || activeTab === 'articles') && <input type="date" name="date" required defaultValue={item.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)} className="px-6 py-4 bg-slate-50 rounded-2xl" />}
          {activeTab === 'schedules' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Tanggal</label>
                <input type="date" name="date" defaultValue={item.date} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Waktu</label>
                <input type="time" name="time" defaultValue={item.time} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Lokasi</label>
                <input name="locationOffline" defaultValue={item.locationOffline} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Penyelenggara</label>
                <input name="organizer" defaultValue={item.organizer} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none" />
              </div>
            </>
          )}

          {activeTab === 'articles' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Kategori</label>
                <select name="categoryId" defaultValue={item.categoryId} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Tag (pisahkan koma)</label>
                <input name="tags" defaultValue={item.tags?.join(',')} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none" />
              </div>
            </>
          )}

          {activeTab !== 'categories' && (
             <>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Penulis</label>
                  <input name="author" defaultValue={item.author || 'Administrator'} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Deskripsi / Konten</label>
                  <textarea name={activeTab === 'articles' ? 'content' : 'description'} rows={5} defaultValue={activeTab === 'articles' ? item.content : item.description} required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none resize-none"></textarea>
                </div>
             </>
          )}
        </div>
        <div className="flex gap-4 pt-4">
           <button type="button" onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors">Batal</button>
           <button type="submit" className="flex-1 py-5 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-orange-700 transition-all active:scale-[0.98]"><Save size={18} /> Simpan Perubahan</button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Content Hub</h2>
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={() => setActiveTab('informasi')} className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'informasi' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}><Info size={14} /> Informasi</button>
            <button onClick={() => setActiveTab('schedules')} className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'schedules' ? 'bg-orange-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}><Calendar size={14} /> Schedules</button>
            <button onClick={() => setActiveTab('articles')} className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'articles' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}><FileText size={14} /> Artikel</button>
            <button onClick={() => setActiveTab('categories')} className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-emerald-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}><Tags size={14} /> Kategori Artikel</button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Cari data..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm outline-none font-bold focus:ring-4 focus:ring-orange-100 transition-all" />
          </div>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black shadow-xl active:scale-[0.98] transition-all"><Plus size={18} /> Tambah Baru</button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-6 text-left cursor-pointer group select-none" onClick={() => { setSortDir(sortKey === 'title' || sortKey === 'name' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'); setSortKey(activeTab === 'categories' ? 'name' : 'title'); }}>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Descriptor <ArrowUpDown size={12} /></div>
                </th>
                {activeTab !== 'categories' && (
                  <th className="px-8 py-6 text-left cursor-pointer group select-none" onClick={() => { setSortDir(sortKey === 'author' || sortKey === 'organizer' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'); setSortKey(activeTab === 'schedules' ? 'organizer' : 'author'); }}>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Penulis / PIC <ArrowUpDown size={12} /></div>
                  </th>
                )}
                {activeTab !== 'categories' && (
                  <th className="px-8 py-6 text-left cursor-pointer group select-none" onClick={() => { setSortDir(sortKey === 'date' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'); setSortKey('date'); }}>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Timeline <ArrowUpDown size={12} /></div>
                  </th>
                )}
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-24 text-center text-[10px] font-black text-slate-300 uppercase animate-pulse">Menghubungkan ke Mainframe HUB...</td></tr>
              ) : pagedData.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center text-[10px] font-black text-slate-300 uppercase">Data tidak ditemukan dalam cluster ini.</td></tr>
              ) : pagedData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white transition-all shadow-sm border border-transparent group-hover:border-slate-100">
                        {activeTab === 'informasi' && <Info size={18} className="text-orange-500" />}
                        {activeTab === 'schedules' && <Calendar size={18} className="text-indigo-500" />}
                        {activeTab === 'articles' && <FileText size={18} className="text-emerald-500" />}
                        {activeTab === 'categories' && <Tags size={18} className="text-purple-500" />}
                      </div>
                      <div className="min-w-0">
                         <p className="font-black text-slate-900 text-sm truncate tracking-tight">{item.title || item.name}</p>
                         {activeTab === 'informasi' && <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">{item.targetType}</p>}
                         {activeTab === 'articles' && <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">{categories.find(c => c.id === item.categoryId)?.name}</p>}
                      </div>
                    </div>
                  </td>
                  {activeTab !== 'categories' && <td className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.author || item.organizer}</td>}
                  {activeTab !== 'categories' && <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.date).toLocaleDateString()}</td>}
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => setConfirmDelete({ id: item.id, title: item.title || item.name })} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 bg-white rounded-xl border border-slate-200 disabled:opacity-30 transition-all hover:bg-orange-50 hover:border-orange-200"><ChevronLeft size={16} /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 bg-white rounded-xl border border-slate-200 disabled:opacity-30 transition-all hover:bg-orange-50 hover:border-orange-200"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Entry Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-10 lg:p-14">
                <div className="flex items-center justify-between mb-10">
                   <div>
                     <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{editingItem ? 'Ubah Record HUB' : 'Input Record Baru'}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sinkronisasi Mainframe Database</p>
                   </div>
                   <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors"><X size={20} /></button>
                </div>
                {renderForm()}
             </div>
          </div>
        </div>
      )}

      {/* Destructive Action Confirmation */}
      <Modal 
        isOpen={!!confirmDelete}
        type="confirm"
        title="Hapus Record HUB?"
        message={`Apakah Anda yakin ingin menghapus "${confirmDelete?.title}"? Tindakan ini tidak dapat dibatalkan dari mainframe.`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleAction('delete', confirmDelete?.id)}
      />

      {/* Global Processing Loader */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-white/20 backdrop-blur-[2px] flex justify-center items-center">
          <div className="w-14 h-14 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default ContentManagementView;
