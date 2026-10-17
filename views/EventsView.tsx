
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Search, Edit2, 
  Trash2, X, Save, Image as ImageIcon, Loader2, MapPin, Clock, Users, Globe, CheckCircle2, Video, ExternalLink, Sparkles, Monitor, User, ChevronLeft, RefreshCw, Filter
} from 'lucide-react';
import { Event, UserRole } from '../types';
import { api } from '../api';
import DropZone from '../components/DropZone';

interface EventsViewProps {
  events: Event[];
  isAdmin: boolean;
  currentUser: string;
  userEmail?: string;
  onRefresh: () => void;
  onShowAlert: (title: string, msg: string, type: any) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const EventsView: React.FC<EventsViewProps> = ({ events, isAdmin, currentUser, userEmail, onRefresh, onShowAlert, showConfirm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [previewItem, setPreviewItem] = useState<Event | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMeetGenerating, setIsMeetGenerating] = useState(false);
  const [isHandshaking, setIsHandshaking] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);
  const [meetLinkValue, setMeetLinkValue] = useState<string>('');

  const months = [
    { value: 'ALL', label: 'Semua Bulan' },
    { value: '0', label: 'Januari' },
    { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mei' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Desember' }
  ];

  useEffect(() => {
    if (editingItem) {
      setIsOnlineMode(editingItem.locationOnline === 'Yes');
      setMeetLinkValue(editingItem.meetLink || '');
    } else {
      setIsOnlineMode(false);
      setMeetLinkValue('');
    }
  }, [editingItem, showForm]);

  /**
   * Filter & Sort Engine V3.0
   * 1. Search Query Match
   * 2. Month Selector Filter
   * 3. Newest First Sort (Kronologis Terbalik)
   */
  const filtered = useMemo(() => {
    let result = (Array.isArray(events) ? events : []);
    
    if (searchTerm) {
      result = result.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (selectedMonth !== 'ALL') {
      result = result.filter(e => {
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && d.getMonth() === parseInt(selectedMonth);
      });
    }

    // Sort Descending: Tanggal Terbaru di atas
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, searchTerm, selectedMonth]);

  const handleDeleteEvent = (id: string, title: string) => {
    showConfirm('Purge Transmission?', `Hapus permanent "${title}" dari mainframe database?`, async () => {
      setIsProcessing(true);
      const res = await api.postData('manageEvent', { type: 'delete', id });
      setIsProcessing(false);
      if (res?.status === 'success') { 
        onRefresh(); 
        onShowAlert('Success', 'Event telah dimusnahkan.', 'success'); 
      }
    });
  };

  const handleCreateMeet = async () => {
    const form = document.querySelector('#event-form') as HTMLFormElement;
    if (!form) return;
    const fd = new FormData(form);
    const title = fd.get('title') as string;
    const date = fd.get('date') as string;
    const time = fd.get('time') as string;
    if (!title || !date || !time) { onShowAlert('Data Incomplete', 'Lengkapi data transmisi sebelum generate Meet.', 'error'); return; }
    setIsMeetGenerating(true);
    const res = await api.generateMeetLink(title, `${date}T${time}:00`, fd.get('description') as string);
    setIsMeetGenerating(false);
    if (res?.status === 'success') { setMeetLinkValue(res.url); onShowAlert('Synced', 'Google Meet Hub Online.', 'success'); }
    else onShowAlert('Meet gagal', res?.message || 'Layanan Meet tidak tersedia.', 'error');
  };

  const handleJoinMeet = async (meetLink: string) => {
    if (!userEmail) {
      window.open(meetLink, '_blank');
      return;
    }
    setIsHandshaking(true);
    try {
      // Auto-Invite Protocol Handshake
      await api.autoInviteToMeet(meetLink, userEmail);
    } catch (e) {
      console.warn("Handshake bypassed due to node timeout.");
    }
    setIsHandshaking(false);
    window.open(meetLink, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    const fd = new FormData(e.currentTarget);
    const eventId = editingItem?.id || `evt-${Date.now()}`;
    let finalImageUrl = editingItem?.image || '';
    if (imagePreview && imagePreview.startsWith('data:')) {
        const resF = await fetch(imagePreview);
        const blob = await resF.blob();
        const file = new File([blob], `${eventId}.png`, { type: 'image/png' });
        const resCdn = await api.uploadFileCdn(file, 'EVENT', eventId, 'public');
        if (resCdn?.status === 'success') finalImageUrl = resCdn.asset?.deliveryUrl || resCdn.asset?.url || '';
        else { onShowAlert('Upload gagal', resCdn?.message || 'Gambar belum tersimpan.', 'error'); setIsProcessing(false); return; }
      }
      const payload = {
      title: fd.get('title'), date: fd.get('date'), time: fd.get('time'), image: finalImageUrl,
      description: fd.get('description'), locationOffline: isOnlineMode ? '' : fd.get('locationOffline'),
      locationOnline: isOnlineMode ? 'Yes' : 'No', maxParticipants: Number(fd.get('maxParticipants')),
      status: fd.get('status'), tags: String(fd.get('tags')).split(',').map(t => t.trim()),
      meetLink: isOnlineMode ? meetLinkValue : '', author: editingItem ? editingItem.author : (isAdmin ? 'ROOT' : currentUser)
    };
    const res = await api.postData('manageEvent', { type: editingItem ? 'edit' : 'add', id: eventId, data: payload });
    if (res?.status === 'success') { 
      onRefresh(); 
      setShowForm(false); 
      setEditingItem(null); 
      onShowAlert('Transmission Success', 'Data event berhasil dipublish ke HUB.', 'success'); 
    }
    setIsProcessing(false);
  };

  if (previewItem) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
        <button onClick={() => setPreviewItem(null)} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 w-fit">
          <ChevronLeft size={16} /> Kembali ke Galeri
        </button>

        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
           <div className="w-full h-[450px] relative bg-slate-900 overflow-hidden">
              {previewItem.image ? (
                <img src={previewItem.image} className="w-full h-full object-cover" alt={previewItem.title} />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <ImageIcon size={120} className="text-slate-800 animate-pulse" />
                </div>
              )}
              
              <div className="absolute top-10 left-10">
                 <span className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl border border-white/20 backdrop-blur-md ${previewItem.status === 'OPEN' ? 'bg-emerald-500/90 text-white' : 'bg-slate-900/90 text-white'}`}>
                    {previewItem.status === 'OPEN' ? 'Registration Open' : 'Closed / Ended'}
                 </span>
              </div>
           </div>

           <div className="p-12 lg:p-20 space-y-12">
              <div className="space-y-6">
                 <div className="flex flex-wrap gap-3">
                    {previewItem.tags?.map(t => (
                      <span key={t} className="px-5 py-2 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-orange-100">
                        #{t}
                      </span>
                    ))}
                 </div>
                 <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-[0.95]">{previewItem.title}</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-10 py-12 border-y border-slate-50">
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline Date</p>
                    <div className="flex items-center gap-3 font-black text-lg text-slate-900">
                       <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm"><CalendarIcon size={18}/></div>
                       {previewItem.date}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Start Time</p>
                    <div className="flex items-center gap-3 font-black text-lg text-slate-900">
                       <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm"><Clock size={18}/></div>
                       {previewItem.time || '08:00'}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Access Point</p>
                    <div className="flex items-center gap-3 font-black text-lg text-slate-900 truncate">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${previewItem.locationOnline === 'Yes' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {previewItem.locationOnline === 'Yes' ? <Video size={18}/> : <MapPin size={18}/>}
                       </div>
                       {previewItem.locationOnline === 'Yes' ? 'Digital Stream' : (previewItem.locationOffline || 'TBD')}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Capacity</p>
                    <div className="flex items-center gap-3 font-black text-lg text-slate-900">
                       <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm"><Users size={18}/></div>
                       {previewItem.maxParticipants} Seats
                    </div>
                 </div>
              </div>

              <div className="space-y-10">
                 <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div> Agenda & Brief Context
                    </h4>
                    <p className="text-2xl text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">
                       {previewItem.description}
                    </p>
                 </div>

                 {previewItem.locationOnline === "Yes" && previewItem.meetLink && (
                   <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-8 group">
                      <div className="flex items-center gap-6">
                         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform ${isHandshaking ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'}`}>
                            {isHandshaking ? <RefreshCw className="animate-spin" size={32}/> : <Video size={32}/>}
                         </div>
                         <div>
                            <h5 className="font-black text-emerald-900 text-xl tracking-tight">Access Secure Link</h5>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">
                              {isHandshaking ? "Bypassing moderasi join..." : "Authorized Member Cluster Only"}
                            </p>
                         </div>
                      </div>
                      <button 
                        onClick={() => previewItem.meetLink && handleJoinMeet(previewItem.meetLink)}
                        disabled={isHandshaking}
                        className="w-full md:w-auto px-10 py-5 bg-white text-emerald-600 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                      >
                         {isHandshaking ? "Handshaking..." : "Join Transmission"} <ExternalLink size={18}/>
                      </button>
                   </div>
                 )}
              </div>

              <div className="pt-12 border-t border-slate-50 flex items-center justify-between text-slate-300">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-black text-[10px]">{previewItem.author?.[0] || 'A'}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest">PUBLISHED BY {previewItem.author || 'System'}</span>
                 </div>
                 <span className="text-[9px] font-bold uppercase tracking-widest">Protocol ID: {previewItem.id}</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8">
        <div><h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">Events</h2><p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Flagship events & Workshops Hub</p></div>
        <div className="flex flex-wrap gap-4">
          
          <div className="relative w-full md:w-48 group">
            <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full pl-14 pr-8 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-xs appearance-none cursor-pointer focus:ring-4 focus:ring-orange-100 transition-all"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Identity Query..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold focus:ring-4 focus:ring-orange-100 transition-all" />
          </div>

          {(isAdmin || currentUser !== 'GUEST') && (
            <button onClick={() => { setEditingItem(null); setImagePreview(null); setShowForm(true); }} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-xl transition-all"><Plus size={18} /> New Entry</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {filtered.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
              <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.4em]">Empty Event Registry</p>
            </div>
         ) : filtered.map(evt => {
           // DELETE PERMISSION: Hanya pemilik event (author) atau Admin
           const canDelete = isAdmin || (evt.author === currentUser);
           const canEdit = isAdmin || (evt.author === currentUser);

           return (
            <div key={evt.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl transition-all group flex flex-col cursor-pointer" onClick={() => setPreviewItem(evt)}>
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  {evt.image ? <img src={evt.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={48} /></div>}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                     <span className="px-3 py-1 bg-white/90 backdrop-blur text-[8px] font-black uppercase tracking-widest rounded-lg border border-white shadow-sm">BY {evt.author}</span>
                  </div>
                </div>
                <div className="p-7 flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight line-clamp-2">{evt.title}</h3>
                  <div className="space-y-2 mb-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2"><CalendarIcon size={14} className="text-orange-600" /> {evt.date}</div>
                      <div className="flex items-center gap-2"><MapPin size={14} className="text-orange-600" /> {evt.locationOnline === "Yes" ? 'Digital stream' : (evt.locationOffline || 'TBD')}</div>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="mt-auto flex items-center justify-end pt-5 border-t border-slate-50 gap-2" onClick={e => e.stopPropagation()}>
                        {canEdit && <button onClick={() => { setEditingItem(evt); setImagePreview(evt.image || null); setShowForm(true); }} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-slate-50"><Edit2 size={16} /></button>}
                        {canDelete && <button onClick={() => handleDeleteEvent(evt.id, evt.title)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-slate-50"><Trash2 size={16} /></button>}
                    </div>
                  )}
                </div>
            </div>
           );
         })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95 my-auto max-h-[95vh] overflow-y-auto scrollbar-hide">
             <div className="flex justify-between mb-8">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{editingItem ? 'Edit Entry' : 'New Entry'}</h3>
                <button onClick={() => setShowForm(false)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X size={24} /></button>
             </div>
             <form id="event-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                   <div className="lg:col-span-5"><DropZone onFileSelect={(f) => { const r = new FileReader(); r.onload = (ev) => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); }} currentValue={imagePreview || undefined} isImage className="min-h-[300px]" /></div>
                   <div className="lg:col-span-7 space-y-4">
                      <input name="title" defaultValue={editingItem?.title} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all shadow-inner" placeholder="Headline Identification" />
                      <div className="grid grid-cols-2 gap-4">
                         <input name="date" type="date" defaultValue={editingItem?.date} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                         <input name="time" type="time" defaultValue={editingItem?.time || '08:00'} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                      </div>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl shadow-inner border border-slate-100">
                         <button type="button" onClick={() => setIsOnlineMode(false)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!isOnlineMode ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>Offline Venue</button>
                         <button type="button" onClick={() => setIsOnlineMode(true)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isOnlineMode ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Digital Stream</button>
                      </div>
                      {!isOnlineMode ? (
                        <input name="locationOffline" defaultValue={editingItem?.locationOffline} placeholder="Source Venue" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all shadow-inner" />
                      ) : (
                        <div className="flex gap-2">
                           <input value={meetLinkValue} onChange={e => setMeetLinkValue(e.target.value)} placeholder="Meet Access Token" className="flex-1 px-6 py-4 bg-emerald-50 rounded-2xl font-bold outline-none border border-transparent focus:border-emerald-200 transition-all shadow-inner"/>
                           <button type="button" onClick={handleCreateMeet} disabled={isMeetGenerating} className="px-6 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100">
                             {isMeetGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16}/>}
                           </button>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Registry Status</label>
                            <select name="status" defaultValue={editingItem?.status || 'OPEN'} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                               <option value="OPEN">Open Access</option>
                               <option value="CLOSED">Restricted / Ended</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Max Load</label>
                            <input name="maxParticipants" type="number" defaultValue={editingItem?.maxParticipants || 100} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                         </div>
                      </div>
                   </div>
                </div>
                <textarea name="description" defaultValue={editingItem?.description} rows={4} required className="w-full px-6 py-4 bg-slate-50 rounded-3xl font-bold outline-none resize-none border border-transparent focus:border-orange-100 transition-all shadow-inner" placeholder="Brief Narrative Context..." />
                <button type="submit" disabled={isProcessing} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-[0.98]">
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                  Commit Transmission
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;



