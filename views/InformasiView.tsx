
import React, { useState, useMemo } from 'react';
import { 
  Info, Plus, Search, Trash2, Edit2, X, Save, 
  Users, Rocket, ShieldCheck, Calendar, ArrowRight, Loader2, Target,
  UserCheck, GraduationCap, Briefcase, ChevronLeft, User, RefreshCw
} from 'lucide-react';
import { Informasi, StartupTeam, UserRole } from '../types';
import { api } from '../api';

interface InformasiViewProps {
  list: Informasi[];
  isAdmin: boolean;
  userRole: UserRole;
  userStartupId?: string | null;
  currentUser: string;
  startups: StartupTeam[];
  onRefresh?: () => void;
  onShowAlert: (t: string, m: string, ty: any) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const InformasiView: React.FC<InformasiViewProps> = ({ 
  list, 
  isAdmin, 
  userRole,
  userStartupId,
  currentUser,
  startups, 
  onRefresh, 
  onShowAlert, 
  showConfirm 
}) => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Informasi | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<Informasi | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [targetType, setTargetType] = useState<Informasi['targetType']>('ALL');

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsSyncing(true);
    await onRefresh();
    setTimeout(() => setIsSyncing(false), 600);
  };

      const filtered = useMemo(() => {
    let baseList = Array.isArray(list) ? list : [];
    if (!isAdmin) {
      if (userRole === UserRole.STUDENT) {
         baseList = baseList.filter(i => {
           if (['ALL', 'ROLE_STUDENT', 'STARTUP_ALL'].includes(i.targetType)) return true;
           if (i.targetType === 'STARTUP_SPECIFIC') {
             return i.targetValue === userStartupId;
           }
           return false;
         });
      } else if (userRole === UserRole.LECTURER) {
         baseList = baseList.filter(i => ['ALL', 'ROLE_LECTURER'].includes(i.targetType));
      }
    }
    
    return baseList.filter(i => 
      i.title.toLowerCase().includes(search.toLowerCase()) || 
      i.description.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [list, search, isAdmin, userRole, userStartupId]);

  const handleDelete = (id: string, title: string) => {
    showConfirm('Hapus Informasi?', `Hapus "${title}"?`, async () => {
      setIsProcessing(true);
      const res = await api.postData('manageInformasi', { type: 'delete', id });
      if (res?.status === 'success') {
        onRefresh?.();
        onShowAlert('Success', 'Data dihapus.', 'success');
      }
      setIsProcessing(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get('title'),
      date: fd.get('date'),
      description: fd.get('description'),
      author: editingItem ? editingItem.author : currentUser,
      targetType: fd.get('targetType'),
      targetValue: fd.get('targetValue') || ''
    };
    const res = await api.postData('manageInformasi', { type: editingItem ? 'edit' : 'add', id: editingItem?.id, data: payload });
    if (res?.status === 'success') {
      onRefresh?.();
      setShowForm(false);
      setEditingItem(null);
      onShowAlert('Success', 'Informasi disinkronkan.', 'success');
    }
    setIsProcessing(false);
  };

  const getTargetIcon = (type: string) => {
    switch(type) {
      case 'STARTUP_ALL': case 'STARTUP_SPECIFIC': return <Rocket size={14} />;
      case 'ROLE_LECTURER': return <GraduationCap size={14} />;
      case 'ROLE_STUDENT': return <Users size={14} />;
      default: return <Target size={14} />;
    }
  };

  if (selectedInfo) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
        <button onClick={() => setSelectedInfo(null)} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors">
          <ChevronLeft size={16} /> Back to Stream
        </button>
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10">
          <div className="flex justify-between items-start">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 shadow-lg">
              <Info size={32} />
            </div>
            <div className="px-6 py-2 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3 border border-slate-100">
              {getTargetIcon(selectedInfo.targetType)} {selectedInfo.targetType}
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">{selectedInfo.title}</h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">{selectedInfo.author[0]}</div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedInfo.author}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <Calendar size={14} /> {selectedInfo.date}
              </div>
            </div>
          </div>
          <p className="text-xl text-slate-500 font-bold leading-relaxed border-t border-slate-50 pt-10">
            {selectedInfo.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8">
        <div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">Informasi</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Targeted ecosystem information & updates</p>
        </div>
        <div className="flex flex-wrap gap-4">
           <button 
            onClick={handleRefresh}
            className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 group"
            title="Sync Node"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin text-orange-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
           <div className="relative w-full md:w-80">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
             <input type="text" placeholder="Scan informasi..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold" />
           </div>
           {isAdmin && (
             <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-all">
               <Plus size={18} /> Tambah Informasi
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {filtered.map(info => {
          const canManage = isAdmin || (info.author === currentUser);
          return (
            <div key={info.id} onClick={() => setSelectedInfo(info)} className="bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-8">
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-slate-900 group-hover:text-white transition-all">
                      <Info size={24} />
                    </div>
                    <div className="px-5 py-2 bg-slate-50 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      {getTargetIcon(info.targetType)} {info.targetType}
                    </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-orange-600 transition-colors leading-tight line-clamp-2">{info.title}</h3>
                <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8 line-clamp-3">{info.description}</p>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black">{info.author[0]}</div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{info.author}</span>
                </div>
                {canManage && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingItem(info); setTargetType(info.targetType); setShowForm(true); }} className="p-2 text-slate-300 hover:text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(info.id, info.title)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-12 animate-in zoom-in-95">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-slate-900">{editingItem ? 'Edit Informasi' : 'Tambah Informasi'}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-300 hover:text-red-500"><X size={24} /></button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-6">
                <input name="title" defaultValue={editingItem?.title} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="Headline Title" />
                <div className="grid grid-cols-2 gap-4">
                  <input name="date" type="date" defaultValue={editingItem?.date?.slice(0, 10) || new Date().toISOString().split('T')[0]} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                  <select name="targetType" defaultValue={editingItem?.targetType || 'ALL'} onChange={(e) => setTargetType(e.target.value as any)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                    <option value="ALL">Everyone</option>
                    <option value="STARTUP_ALL">All Startups</option>
                    <option value="STARTUP_SPECIFIC">Specific Startup</option>
                    <option value="ROLE_LECTURER">Lecturers</option>
                    <option value="ROLE_STUDENT">Students</option>
                  </select>
                </div>
                {targetType === 'STARTUP_SPECIFIC' && (
                  <select name="targetValue" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none animate-in fade-in">
                    <option value="">-- Pilih Startup --</option>
                    {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <textarea name="description" defaultValue={editingItem?.description} rows={5} required className="w-full px-6 py-4 bg-slate-50 rounded-3xl font-bold outline-none resize-none" placeholder="Content details..." />
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Push Transmission</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InformasiView;


