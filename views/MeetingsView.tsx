
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, MapPin, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, Clock, Search, X, Save, Edit2, Trash2, User, Eye, FileText, RefreshCw, Video, Users
} from 'lucide-react';
import { Schedule, UserRole } from '../types';
import { parseMeetingLink, meetingPhase } from '../api/lib/meetingLinks.js';
import { api } from '../api';

type Join = { name: string; role: string; joinedAt: string };
const hhmm = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Older entries kept the meeting URL in the location field.
const joinLinkOf = (m: Schedule) => parseMeetingLink(m.meetLink) || parseMeetingLink(m.locationOffline);

const JoinButton: React.FC<{ meeting: Schedule; large?: boolean; onJoined?: (joins: Join[]) => void }> = ({ meeting, large, onJoined }) => {
  const link = joinLinkOf(meeting);
  if (!link) return null;
  // The link opens normally (no popup blocker); the join is recorded alongside it.
  const record = (e: React.MouseEvent) => {
    e.stopPropagation();
    api.postData('joinSchedule', { id: meeting.id }).then((res: any) => res?.joins && onJoined?.(res.joins)).catch(() => {});
  };
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={record}
      className={`inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm ${large ? 'px-8 py-4 rounded-2xl text-xs' : 'px-4 py-2.5 rounded-xl text-[9px]'}`}>
      <Video size={large ? 18 : 14} /> Gabung {link.label}
    </a>
  );
};

// Status from the schedule time plus joins made through the portal's Gabung button. Meet and Zoom do not
// report participants for a plain link, so "Online" means someone joined from the portal.
const MeetingStatus: React.FC<{ meeting: Schedule; now: Date; joins: number }> = ({ meeting, now, joins }) => {
  const info = joinLinkOf(meeting) ? meetingPhase(meeting, now) : null;
  if (!info) return null;
  const [label, tone] = info.phase === 'UPCOMING'
    ? [`Akan datang · mulai ${hhmm(info.start)}`, 'bg-slate-100 text-slate-500']
    : info.phase === 'ENDED'
      ? [`Selesai · ${joins} orang masuk lewat portal`, 'bg-slate-100 text-slate-400']
      : joins > 0
        ? [`Online · ${joins} orang sudah masuk`, 'bg-emerald-100 text-emerald-700']
        : ['Sedang berlangsung · belum ada yang masuk', 'bg-amber-100 text-amber-700'];
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tone}`}>
      <span className={`w-2 h-2 rounded-full ${info.phase === 'LIVE' ? (joins > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse') : 'bg-slate-300'}`} />
      {label}
    </span>
  );
};

interface MeetingsViewProps {
  meetings: Schedule[];
  isAdmin: boolean;
  currentUser: string;
  onRefresh?: () => void;
  onCreate: (data: any) => Promise<boolean>;
  onEdit: (id: string, data: any) => Promise<boolean>;
  onDelete: (id: string) => void;
}

const MeetingsView: React.FC<MeetingsViewProps> = ({ meetings, isAdmin, currentUser, onRefresh, onCreate, onEdit, onDelete }) => {
  const [viewType, setViewType] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [previewItem, setPreviewItem] = useState<Schedule | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [previewJoins, setPreviewJoins] = useState<Join[]>([]);
  const [joinCounts, setJoinCounts] = useState<Record<string, number>>({});
  const joinsOf = (m: Schedule) => joinCounts[m.id] ?? m.joinCount ?? 0;
  const noteJoins = (m: Schedule) => (joins: Join[]) => {
    setJoinCounts(counts => ({ ...counts, [m.id]: joins.length }));
    if (previewItem?.id === m.id) setPreviewJoins(joins);
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // The detail view lists who joined, refreshed every 30 seconds while it is open.
  useEffect(() => {
    if (!previewItem || !joinLinkOf(previewItem)) { setPreviewJoins([]); return; }
    let active = true;
    const load = () => api.postData('getScheduleJoins', { id: previewItem.id }).then((res: any) => {
      if (active && res?.joins) { setPreviewJoins(res.joins); setJoinCounts(counts => ({ ...counts, [previewItem.id]: res.joins.length })); }
    }).catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [previewItem]);
  const [meetLinkValue, setMeetLinkValue] = useState('');
  const detectedLink = parseMeetingLink(meetLinkValue);

  const openForm = (item: Schedule | null) => {
    const legacy = item && !item.meetLink ? parseMeetingLink(item.locationOffline) : null;
    setEditingItem(item ? { ...item, locationOffline: legacy ? '' : item.locationOffline } : null);
    setIsOnline(!!item && (!!item.locationOnline || !!legacy));
    setMeetLinkValue(item ? (item.meetLink || legacy?.url || '') : '');
    setShowForm(true);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsSyncing(true);
    await onRefresh();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateDate = (direction: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + direction);
    setCurrentDate(next);
  };

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const filteredMeetings = useMemo(() => {
    const raw = (Array.isArray(meetings) ? meetings : []);
    const authorized = raw;
    
    return authorized.filter(m => 
      m.title.toLowerCase().includes(filterText.toLowerCase()) || 
      m.organizer.toLowerCase().includes(filterText.toLowerCase())
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [meetings, filterText, isAdmin, currentUser]);

  const renderCalendar = () => {
    const totalDays = daysInMonth(currentDate.getMonth(), currentDate.getFullYear());
    const startOffset = firstDayOfMonth(currentDate.getMonth(), currentDate.getFullYear());
    const days = [];

    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`pad-${i}`} className="h-20 lg:h-32 bg-slate-50/30 border border-slate-100/50"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayMeetings = filteredMeetings.filter(m => {
        const mDate = m.date.includes('T') ? m.date.split('T')[0] : m.date;
        return mDate === dStr;
      });

      days.push(
        <div key={day} className={`h-20 lg:h-32 border border-slate-100 p-2 lg:p-3 hover:bg-slate-50 transition-colors group relative overflow-y-auto scrollbar-hide ${dayMeetings.length > 0 ? 'bg-orange-50/50' : 'bg-white'}`}>
          <span className={`text-[10px] lg:text-xs font-black transition-colors ${dayMeetings.length > 0 ? 'text-orange-600' : 'text-slate-400 group-hover:text-orange-600'}`}>{day}</span>
          <div className="mt-1 lg:mt-2 space-y-1">
            {dayMeetings.map(m => (
              <div 
                key={m.id} 
                onClick={() => setPreviewItem(m)}
                className={`px-1.5 py-0.5 border-l-2 text-[7px] lg:text-[9px] font-black text-white truncate rounded-r cursor-pointer shadow-sm ${m.organizer === 'Administrator' ? 'bg-slate-900 border-slate-600' : 'bg-orange-600 border-orange-800 hover:bg-orange-700'}`}
              >
                {m.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(fd.entries());
    if (isOnline && !detectedLink) return;
    data.locationOnline = isOnline;
    data.meetLink = isOnline ? detectedLink!.url : '';
    if (!editingItem) {
      (data as any).author = currentUser;
    } else {
      (data as any).author = editingItem.author;
    }
    const saved = editingItem ? await onEdit(editingItem.id, data) : await onCreate(data);
    if (!saved) return;
    setShowForm(false);
    setEditingItem(null);
  };

  if (previewItem) {
    return (
      <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
        <button onClick={() => setPreviewItem(null)} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="bg-white p-8 lg:p-20 rounded-[2.5rem] lg:rounded-[4rem] border border-slate-100 shadow-xl space-y-8 lg:space-y-12">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
             <div className="w-16 h-16 lg:w-24 lg:h-24 bg-orange-50 rounded-2xl lg:rounded-[2rem] flex items-center justify-center text-orange-600 shadow-lg shrink-0">
                <CalendarIcon size={32} className="lg:hidden" />
                <CalendarIcon size={48} className="hidden lg:block" />
             </div>
             <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                <span className={`px-5 py-2 rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border text-center ${previewItem.organizer === 'Administrator' ? 'bg-slate-900 text-white border-slate-800' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                   Organized by {previewItem.organizer}
                </span>
                { (isAdmin || previewItem.author === currentUser) && (
                   <button onClick={() => { openForm(previewItem); setPreviewItem(null); }} className="px-5 py-2 bg-blue-50 text-blue-600 rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all">
                      <Edit2 size={12} /> Edit Schedule
                   </button>
                )}
             </div>
          </div>

          <div className="space-y-6">
             <h2 className="text-3xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-tight lg:leading-[0.95]">{previewItem.title}</h2>
             <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-8 text-slate-400 font-black uppercase tracking-widest text-[10px] lg:text-xs border-y border-slate-50 py-8 lg:py-10">
                <div className="flex items-center gap-3"><div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-slate-50 flex items-center justify-center text-orange-600 shrink-0"><CalendarIcon size={16}/></div> {previewItem.date}</div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-slate-50 flex items-center justify-center text-orange-600 shrink-0"><Clock size={16}/></div> {previewItem.time}</div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-slate-50 flex items-center justify-center text-orange-600 shrink-0"><MapPin size={16}/></div> {joinLinkOf(previewItem) ? (previewItem.meetLink ? previewItem.locationOffline || 'Online' : 'Online') : previewItem.locationOffline || 'TBD'}</div>
             </div>
             <div className="flex flex-col sm:flex-row sm:items-center gap-4">
               <JoinButton meeting={previewItem} large onJoined={noteJoins(previewItem)} />
               <MeetingStatus meeting={previewItem} now={now} joins={joinsOf(previewItem)} />
             </div>
             {joinLinkOf(previewItem) && (
               <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><Users size={14} className="text-emerald-600" /> Masuk lewat portal ({previewJoins.length})</div>
                 {previewJoins.length === 0
                   ? <p className="text-xs font-bold text-slate-400">Belum ada yang masuk lewat tombol Gabung.</p>
                   : <ul className="flex flex-wrap gap-2">{previewJoins.map(j => <li key={j.name + j.joinedAt} className="px-3 py-1.5 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-700">{j.name} <span className="text-slate-400">· {hhmm(new Date(j.joinedAt))}</span></li>)}</ul>}
                 <p className="text-[10px] font-bold text-slate-400">Hanya yang masuk lewat tombol Gabung di portal yang tercatat. Yang membuka link langsung di Google Meet atau Zoom tidak terlihat.</p>
               </div>
             )}
          </div>

          <div className="space-y-6 lg:space-y-8">
             <div className="flex items-center gap-4 text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-slate-900">
                <FileText size={16} className="text-orange-600" /> Agenda
             </div>
             <p className="text-lg lg:text-2xl text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">
                {previewItem.description || "No specific briefing provided."}
             </p>
          </div>

          <div className="pt-8 border-t border-slate-50 flex items-center justify-between text-slate-300">
             <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest">TRANSMISSION ID: {previewItem.id}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
        <div>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">Schedule</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-6">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
              <button onClick={() => setViewType('month')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'month' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Month</button>
              <button onClick={() => setViewType('list')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>List</button>
            </div>
            <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-slate-100 sm:min-w-[240px]">
              <button onClick={() => navigateDate(-1)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-slate-50 rounded-lg transition-all"><ChevronLeft size={18} /></button>
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest text-center px-4">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button onClick={() => navigateDate(1)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-slate-50 rounded-lg transition-all"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          <button 
            onClick={handleRefresh}
            className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 group"
            title="Sync Node"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin text-orange-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
          <div className="relative group w-full sm:w-64">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input type="text" placeholder="Query..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full pl-12 pr-5 py-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none font-bold text-xs focus:ring-4 focus:ring-orange-100 transition-all" />
          </div>
          {(isAdmin || currentUser !== 'GUEST') && (
            <button onClick={() => openForm(null)} className="w-full sm:w-auto px-6 py-3.5 bg-orange-600 text-white rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-orange-700 transition-all active:scale-95"><Plus size={18} /> Input Schedule</button>
          )}
        </div>
      </div>

      {viewType === 'month' ? (
        <div className="bg-white rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-sm overflow-x-auto p-3 sm:p-4 lg:p-8 animate-in fade-in duration-500">
          <div className="min-w-[320px]">
            <div className="grid grid-cols-7 border-b border-slate-100 pb-3 mb-3">
              {dayNames.map(d => <div key={d} className="text-center text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 border-t border-l border-slate-100 rounded-xl lg:rounded-2xl overflow-hidden">
              {renderCalendar()}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-6">
          {filteredMeetings.length === 0 ? (
            <div className="py-24 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.4em]">Empty Registry</div>
          ) : (
            filteredMeetings.map(m => {
               const [y, mon, d] = (m.date.includes('T') ? m.date.split('T')[0] : m.date).split('-').map(Number);
               const canManage = isAdmin || (m.author === currentUser);
               return (
                  <div key={m.id} className="bg-white p-5 lg:p-8 rounded-3xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-5 lg:gap-8 group hover:shadow-xl transition-all">
                    <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl flex flex-col items-center justify-center text-white shrink-0 ${m.organizer === 'Administrator' ? 'bg-slate-900 shadow-lg shadow-slate-200' : 'bg-orange-600 shadow-lg shadow-orange-100'}`}>
                       <span className="text-[10px] font-black uppercase tracking-tighter">{d}</span>
                       <span className="text-[8px] font-black uppercase opacity-50">{monthNames[mon-1].substring(0,3)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-lg lg:text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors truncate tracking-tight">{m.title}</h4>
                       <div className="flex flex-wrap items-center gap-4 mt-2 text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Clock size={12} className="text-orange-600" /> {m.time}</span>
                          <MeetingStatus meeting={m} now={now} joins={joinsOf(m)} />
                          <span className="flex items-center gap-1.5"><MapPin size={12} className="text-orange-600" /> {joinLinkOf(m) ? (m.meetLink ? m.locationOffline || 'Online' : 'Online') : m.locationOffline || 'TBD'}</span>
                       </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center items-center">
                       <JoinButton meeting={m} onJoined={noteJoins(m)} />
                       <button onClick={() => setPreviewItem(m)} className="p-2.5 text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all shadow-sm border border-slate-50"><Eye size={18}/></button>
                       {canManage && (
                         <>
                           <button onClick={() => openForm(m)} className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-slate-50"><Edit2 size={18}/></button>
                           <button onClick={() => onDelete(m.id)} className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-slate-50"><Trash2 size={18}/></button>
                         </>
                       )}
                    </div>
                  </div>
               );
            })
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 lg:p-10 animate-in zoom-in-95 my-auto">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{editingItem ? 'Edit Entry' : 'New Entry'}</h3>
                <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 text-slate-400 hover:text-red-500"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Title</label>
                    <input name="title" defaultValue={editingItem?.title} required placeholder="Signal identifier..." className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Date</label>
                        <input name="date" type="date" defaultValue={editingItem?.date ? (editingItem.date.includes('T') ? editingItem.date.split('T')[0] : editingItem.date) : ''} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Time</label>
                        <input name="time" type="time" defaultValue={editingItem?.time} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                      </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="schedule-end-time" className="text-[9px] font-black text-slate-400 uppercase ml-2">Jam selesai (opsional, bawaan 2 jam)</label>
                    <input id="schedule-end-time" name="endTime" type="time" defaultValue={editingItem?.endTime || ''} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Lokasi offline</label>
                    <input name="locationOffline" defaultValue={editingItem?.locationOffline} placeholder={isOnline ? 'Opsional, isi jika juga ada ruang offline' : 'Ruang / alamat'} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                  </div>
                  <label className="flex items-center gap-3 px-2 cursor-pointer">
                    <input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                    <span className="text-xs font-black text-slate-700">Meeting online (Google Meet / Zoom)</span>
                  </label>
                  {isOnline && (
                    <div className="space-y-1">
                      <label htmlFor="schedule-meet-link" className="text-[9px] font-black text-slate-400 uppercase ml-2">Link meeting</label>
                      <input id="schedule-meet-link" value={meetLinkValue} onChange={e => setMeetLinkValue(e.target.value)} required placeholder="https://meet.google.com/... atau https://zoom.us/j/..." className="w-full px-5 py-4 bg-emerald-50 rounded-2xl font-bold outline-none border border-transparent focus:border-emerald-200 transition-all" />
                      <p role="status" className={`text-[10px] font-bold ml-2 ${detectedLink ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {detectedLink ? `Terdeteksi: ${detectedLink.label}` : meetLinkValue ? 'Hanya link Google Meet atau Zoom yang diterima.' : 'Tempel link Google Meet atau Zoom.'}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Organizer</label>
                    <input name="organizer" defaultValue={editingItem?.organizer || (isAdmin ? 'Administrator' : currentUser)} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" placeholder="Source identifier..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Briefing Notes</label>
                    <textarea name="description" defaultValue={editingItem?.description} placeholder="Protocol details..." rows={3} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none resize-none border border-transparent focus:border-orange-100 transition-all" />
                  </div>
                </div>
                <button type="submit" disabled={isOnline && !detectedLink} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"><Save size={18} /> Commit Changes</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsView;
