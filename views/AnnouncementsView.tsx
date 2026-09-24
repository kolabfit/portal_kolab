import React, { useState } from 'react';
import { Megaphone, Send, Trash2, Loader2 } from 'lucide-react';
import { Announcement, StartupTeam, UserRole } from '../types';
import { api } from '../api';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  startups: StartupTeam[];
  onRefresh: () => void;
  isAdmin: boolean;
  currentUser: string;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

/**
 * AnnouncementsView Component
 * Mengelola sistem siaran Hub.
 * UPDATED V6.3.0: Added micro-animations for button processing states.
 */
const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  startups,
  onRefresh,
  isAdmin,
  userRole,
  userStartupId,
  currentUser,
  onShowAlert,
  showConfirm
}) => {
  const [targetType, setTargetType] = useState<'ALL' | 'ROLE' | 'STARTUP'>('ALL');
  const [targetValue, setTargetValue] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const baseList = Array.isArray(announcements) ? announcements : [];
  const announcementsList = React.useMemo(() => {
    if (isAdmin) return baseList;
    return baseList.filter(ann => {
      const { type, value } = ann.target || { type: 'ALL' };
      if (type === 'ALL') return true;
      if (type === 'ROLE' && value === userRole) return true;
      if (type === 'STARTUP' && value === userStartupId) return true;
      return false;
    });
  }, [baseList, isAdmin, userRole, userStartupId]);

  
  const getTargetLabel = (target?: { type: string, value?: string }) => {
    if (!target || target.type === 'ALL') return 'GLOBAL HUB';
    if (target.type === 'ROLE') return `ROLE ${(target.value || '').replace('ROLE_', '')}`;
    if (target.type === 'STARTUP') {
      const startup = startups.find(s => s.id === target.value);
      return startup ? `STARTUP: ${startup.name}` : `STARTUP: ${target.value}`;
    }
    return `${target.type} ${target.value || ''}`;
  };

  const handlePublish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPublishing(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.postData('addAnnouncement', {
        author: currentUser,
        title: fd.get('title'),
        content: fd.get('content'),
        targetType: targetType,
        targetValue: targetValue
      });
      if (res?.status === 'success') {
        onRefresh();
        (e.target as HTMLFormElement).reset();
        setTargetType('ALL');
        setTargetValue('');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      'Purge Transmission?',
      'Apakah Anda yakin ingin menghapus transmisi siaran ini secara permanen dari mainframe?',
      async () => {
        const res = await api.postData('deleteAnnouncement', { id });
        if(res?.status === 'success') { onRefresh(); onShowAlert('Transmission Purged', 'Broadcast berhasil dihapus dari mainframe!', 'success'); }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-4">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Broadcast</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Official Hub Transmission Terminal</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {isAdmin && (
          <div className="lg:col-span-5 space-y-8">
            <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden">
              <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
                <Megaphone size={28} className="text-orange-600" />
                Terminal
              </h2>
              <form onSubmit={handlePublish} className="space-y-8 relative">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Headline</label>
                    <input name="title" disabled={isPublishing} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold disabled:opacity-50" placeholder="Message title..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Target Layer</label>
                      <select 
                        disabled={isPublishing}
                        value={targetType} 
                        onChange={(e) => { setTargetType(e.target.value as any); setTargetValue(''); }} 
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none appearance-none disabled:opacity-50"
                      >
                        <option value="ALL">Everyone</option>
                        <option value="ROLE">By Role</option>
                        <option value="STARTUP">By Startup</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Value Filter</label>
                      {targetType === 'ALL' ? (
                        <div className="px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-400 text-xs">Global HUB</div>
                      ) : targetType === 'ROLE' ? (
                        <select disabled={isPublishing} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none disabled:opacity-50">
                           <option value="">Select Role</option>
                           <option value={UserRole.STUDENT}>Mahasiswa</option>
                           <option value={UserRole.LECTURER}>Dosen</option>
                        </select>
                      ) : (
                        <select disabled={isPublishing} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none disabled:opacity-50">
                           <option value="">Select Startup</option>
                           {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Content</label>
                  <textarea disabled={isPublishing} name="content" rows={6} required className="w-full px-6 py-5 bg-slate-50 rounded-2xl focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold resize-none disabled:opacity-50" placeholder="Transmission details..."></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isPublishing}
                  className={`relative overflow-hidden w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 hover:bg-orange-700 active:scale-95 transition-all ${isPublishing ? 'cursor-wait opacity-80' : ''}`}
                >
                  {isPublishing ? (
                    <>
                       <Loader2 size={20} className="animate-spin" />
                       Broadcasting Signal...
                    </>
                  ) : (
                    <>
                       <Send size={20} />
                       Push Transmission
                    </>
                  )}
                  
                  {isPublishing && <div className="btn-progress-line"></div>}
                </button>
              </form>
            </section>
          </div>
        )}

        <div className={isAdmin ? "lg:col-span-7 space-y-8" : "lg:col-span-12 space-y-8"}>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Transmission Feed</h2>
          <div className="space-y-8 max-h-[850px] overflow-y-auto pr-4 scrollbar-hide">
            {announcementsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No transmissions active.</p>
              </div>
            ) : (
              announcementsList.map(ann => {
                const canManage = isAdmin || (ann.author === currentUser);
                return (
                  <div key={ann.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-orange-600 text-2xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                          {ann.author[0]}
                        </div>
                        <div>
                          <h4 className="font-black text-lg text-slate-900 tracking-tight">{ann.author}</h4>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(ann.createdAt).toLocaleDateString()} • System Official</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-1.5 bg-orange-50 text-orange-600 text-[9px] font-black rounded-xl uppercase tracking-widest">
                          {getTargetLabel(ann.target)}
                        </span>
                        {canManage && <button onClick={() => handleDelete(ann.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">{ann.title}</h5>
                      <p className="text-slate-500 font-bold leading-relaxed">{ann.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsView;