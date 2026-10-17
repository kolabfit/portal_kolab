import { StudentStatusSummary } from './StudentStatusView';
import { StudentStatusState } from '../services/useStudentStatus';

import React, { useState } from 'react';
import { 
  CreditCard, Calendar as CalendarIcon, Clock, MapPin, ChevronRight, 
  TrendingUp, CheckCircle2, Flag, Info, Users, FileText, 
  ShieldCheck, Zap, Megaphone, Rocket, Database, Activity, Target, RefreshCw
} from 'lucide-react';
import VirtualIDCard from '../components/VirtualIDCard';
import { UserProfile, Schedule, AppAssets, Event, NewsInfo, UserRole, Announcement, Informasi, StartupTeam, LecturerOverview } from '../types';

interface DashboardViewProps {
  studentStatus: StudentStatusState;
  profile: UserProfile;
  assets: AppAssets;
  meetings: Schedule[];
  events: Event[];
  news: NewsInfo[];
  announcements: Announcement[];
  informasiList: Informasi[];
  startups: StartupTeam[];
  setActiveTab: (tab: string) => void;
  onRefresh?: () => void;
  lecturerOverview?: LecturerOverview | null;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  studentStatus, profile, assets, meetings, events, news, 
  announcements, informasiList, startups, setActiveTab, onRefresh, lecturerOverview
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const isAdmin = profile.role === UserRole.ADMIN;

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsSyncing(true);
    if (profile.role === UserRole.STUDENT) studentStatus.retry();
    await onRefresh();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [y, m, d] = cleanDate.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      return {
        month: dObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day: d
      };
    } catch (e) {
      return { month: '??', day: '??' };
    }
  };

  const getLatest = (arr: any[]) => (arr && arr.length > 0 ? arr[0] : null);

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 font-['Plus_Jakarta_Sans'] min-w-0">
      {/* HEADER: Responsive Heading with Sync */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-tight">Overview</h1>
          <p className="text-slate-500 font-bold uppercase text-[9px] lg:text-[10px] tracking-[0.2em] sm:tracking-[0.3em] mt-1.5 sm:mt-2 flex items-center gap-2">
            <Activity size={14} className="text-orange-600 shrink-0" />
            <span className="truncate">{isAdmin ? 'System Root Authorized' : 'Member Index Active'} • Hub Pulse: Optimum</span>
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          className="p-3 sm:p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 group shrink-0"
          title="Sync Node"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin text-orange-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
        </button>
      </div>

      {profile.role === UserRole.STUDENT && <StudentStatusSummary state={studentStatus} onOpen={() => setActiveTab('student-status')} />}
      {profile.role === UserRole.LECTURER && lecturerOverview && <div className="space-y-5">
        <div><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Monitoring Dosen</h3><p className="text-xl sm:text-2xl font-black tracking-tight mt-1 sm:mt-2">Profil Ko+Lab Saya</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            ['Total Mahasiswa', lecturerOverview.summary.totalStudents],
            ['Bimbingan Saya', lecturerOverview.summary.totalSupervisions],
            ['Bimbingan Aktif', lecturerOverview.summary.activeSupervisions],
            ['Workload PIC', lecturerOverview.summary.workloadsAsPic],
            ['Workload Aktif', lecturerOverview.summary.activeWorkloads]
          ].map(([label, value]) => <div key={String(label)} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="text-2xl sm:text-3xl font-black mt-2">{value}</p></div>)}
        </div>
        <div className="bg-slate-900 text-white rounded-[2rem] p-5 sm:p-6 lg:p-8 flex flex-wrap gap-x-6 sm:gap-x-10 gap-y-4 sm:gap-y-5"><div><p className="text-[9px] uppercase tracking-widest text-slate-400">Nama</p><p className="font-black mt-1 text-sm sm:text-base">{lecturerOverview.lecturer.name}</p></div><div><p className="text-[9px] uppercase tracking-widest text-slate-400">NIP</p><p className="font-black mt-1 text-sm sm:text-base">{lecturerOverview.lecturer.nip}</p></div><div><p className="text-[9px] uppercase tracking-widest text-slate-400">Kode Dosen</p><p className="font-black mt-1 text-sm sm:text-base">{lecturerOverview.lecturer.code || '-'}</p></div><div><p className="text-[9px] uppercase tracking-widest text-slate-400">Status Member</p><p className="font-black mt-1 text-emerald-400 text-sm sm:text-base">{lecturerOverview.lecturer.isActive ? 'Aktif' : 'Tidak Aktif'}</p></div><div className="flex gap-2 items-end w-full sm:w-auto"><button onClick={() => setActiveTab('lecturer-students')} className="px-4 py-2 bg-orange-600 rounded-xl text-[9px] font-black uppercase">Lihat Mahasiswa</button><button onClick={() => setActiveTab('lecturer-supervisions')} className="px-4 py-2 bg-white/10 rounded-xl text-[9px] font-black uppercase">Bimbingan Saya</button></div></div>
      </div>}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* LEFT COLUMN: IDENTITY */}
        <div className="lg:col-span-4 space-y-8 lg:space-y-10">
          {!isAdmin ? (
            <div className="w-full">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 lg:mb-8 flex items-center gap-2">
                <CreditCard size={16} className="text-orange-600" />
                Identity Terminal
              </h3>
              <div className="max-w-[420px] mx-auto lg:mx-0">
                <VirtualIDCard profile={profile} assets={assets} />
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6 lg:space-y-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-orange-600" />
                Hub Registry
              </h3>
              
              <div className="bg-slate-900 rounded-[2.5rem] lg:rounded-[3.5rem] p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                <Database className="absolute -bottom-10 -right-10 text-white/5 group-hover:scale-110 transition-transform duration-1000" size={240} />
                <div className="relative space-y-8 lg:space-y-10">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest">Mainframe</span>
                    <TrendingUp size={20} className="text-emerald-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 lg:gap-x-8 gap-y-8 lg:gap-y-10">
                    <div className="space-y-1">
                      <p className="text-[8px] lg:text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-orange-500" /> Users</p>
                      <p className="text-3xl lg:text-4xl font-black tracking-tighter">{assets.memberCount || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] lg:text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Rocket size={12} className="text-indigo-500" /> Startups</p>
                      <p className="text-3xl lg:text-4xl font-black tracking-tighter">{startups.length}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] lg:text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Megaphone size={12} className="text-rose-500" /> Signal</p>
                      <p className="text-3xl lg:text-4xl font-black tracking-tighter">{announcements.length}</p>
                    </div>
                  </div>

                  <button onClick={() => setActiveTab('settings')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">
                    System Hub <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-8 border border-slate-100 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2"><Rocket size={14} className="text-orange-600" /> Ecosystem</h4>
                 </div>
                 <div className="space-y-3 lg:space-y-4">
                    {startups.slice(0, 3).map(s => (
                       <div key={s.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm text-[9px] font-black text-orange-600 shrink-0">{s.name[0]}</div>
                             <span className="text-[10px] font-black text-slate-900 truncate">{s.name}</span>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 shrink-0">{s.memberCount || 0}</span>
                       </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 space-y-8 lg:space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* SCHEDULE SECTION */}
            <section className="bg-white rounded-[2.5rem] lg:rounded-[3rem] p-7 lg:p-10 border border-slate-100 shadow-sm relative overflow-hidden group h-full flex flex-col">
              <div className="flex items-center justify-between mb-8 lg:mb-10">
                <h3 className="font-black text-slate-900 text-xl lg:text-2xl tracking-tighter flex items-center gap-3">
                  <CalendarIcon size={24} className="text-orange-600" /> Schedule
                </h3>
                <button onClick={() => setActiveTab('schedule')} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-600 transition-all"><ChevronRight size={18}/></button>
              </div>
              <div className="space-y-4 lg:space-y-6 flex-1">
                {meetings.length === 0 ? (
                  <p className="text-center py-10 text-slate-300 font-bold text-[10px] uppercase tracking-widest">Void Cluster</p>
                ) : (
                  meetings.slice(0, 2).map(m => {
                    const dObj = formatDisplayDate(m.date);
                    return (
                      <div key={m.id} className="p-4 bg-slate-50/50 rounded-2xl flex items-center gap-4 hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100 cursor-pointer group/item">
                        <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-100 shadow-sm shrink-0 group-hover/item:bg-slate-900 group-hover/item:text-white transition-all">
                          <span className="text-[8px] font-black uppercase">{dObj.month}</span>
                          <span className="text-xl font-black leading-none">{dObj.day}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-slate-900 truncate tracking-tight">{m.title}</h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2"><Clock size={10} className="text-orange-600" /> {m.time}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* BROADCAST SECTION */}
            <section className="bg-slate-900 rounded-[2.5rem] lg:rounded-[3rem] p-7 lg:p-10 text-white shadow-xl relative overflow-hidden h-full flex flex-col">
               <Megaphone size={120} className="absolute -bottom-8 -right-8 text-white/5 pointer-events-none" />
               <div className="flex items-center justify-between mb-8 lg:mb-10">
                <h3 className="font-black text-white text-xl lg:text-2xl tracking-tighter flex items-center gap-3">
                  <Megaphone size={24} className="text-rose-500" /> Broadcast
                </h3>
                <button onClick={() => setActiveTab('announcements')} className="p-2 bg-white/5 text-slate-400 rounded-xl hover:text-white transition-all"><ChevronRight size={18}/></button>
              </div>
              <div className="space-y-4 flex-1 relative z-10">
                {announcements.length === 0 ? (
                  <p className="text-center py-10 text-slate-600 font-bold text-[10px] uppercase tracking-widest">No Signals</p>
                ) : (
                  announcements.slice(0, 2).map(ann => (
                    <div key={ann.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest truncate">{ann.author}</span>
                           <span className="text-[8px] font-bold text-slate-500 uppercase">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xs font-black text-white line-clamp-1 tracking-tight">{ann.title}</h4>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
             <section className="md:col-span-7 bg-white rounded-[2.5rem] lg:rounded-[3.5rem] p-7 lg:p-10 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-8 lg:mb-10">
                   <h3 className="font-black text-slate-900 text-xl lg:text-2xl tracking-tighter flex items-center gap-3">
                     <Target size={24} className="text-indigo-600" /> Informasi
                   </h3>
                </div>
                <div className="space-y-4 lg:space-y-5">
                   {informasiList.slice(0, 3).map(inf => (
                      <div key={inf.id} className="flex gap-4 p-5 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Info size={18}/></div>
                         <div className="min-w-0">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight line-clamp-1">{inf.title}</h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{inf.targetType} • {inf.date}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </section>

             <section className="md:col-span-5 bg-orange-600 rounded-[2.5rem] lg:rounded-[3.5rem] p-7 lg:p-10 text-white shadow-xl flex flex-col justify-between overflow-hidden relative min-h-[300px]">
                <FileText className="absolute -top-10 -left-10 text-white/10" size={140} />
                <div className="relative z-10">
                   <h3 className="text-[10px] font-black text-orange-200 uppercase tracking-[0.3em] mb-6 lg:mb-8">Latest Knowledge</h3>
                   {getLatest(news) ? (
                     <div className="space-y-4">
                        <h4 className="text-2xl lg:text-3xl font-black tracking-tighter leading-tight line-clamp-2">{(getLatest(news) as any).title}</h4>
                        <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-black">{(getLatest(news) as any).author?.[0]}</div>
                           <span className="text-[9px] font-black text-orange-100 uppercase tracking-widest">{(getLatest(news) as any).author}</span>
                        </div>
                     </div>
                   ) : <p className="text-[10px] font-bold text-white/40 uppercase">Awaiting Indexing...</p>}
                </div>
                <button onClick={() => setActiveTab('article')} className="mt-8 w-full py-4.5 bg-black text-white rounded-2xl lg:rounded-3xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-3 relative z-10">
                   Explore Hub <ChevronRight size={14}/>
                </button>
             </section>
          </div>

          {/* EVENT TERBARU */}
          <section className="bg-white rounded-[2.5rem] lg:rounded-[3.5rem] p-7 lg:p-10 border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-8 lg:mb-10">
                <h3 className="font-black text-slate-900 text-xl lg:text-2xl tracking-tighter flex items-center gap-3">
                  <Flag size={24} className="text-orange-600" /> Event Hub
                </h3>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.slice(0, 3).map(evt => (
                   <div key={evt.id} className="relative aspect-[16/10] sm:aspect-[4/3] rounded-[2rem] overflow-hidden group cursor-pointer" onClick={() => setActiveTab('events')}>
                      {evt.image ? <img src={evt.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={evt.title} /> : <div className="w-full h-full bg-slate-100" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5 lg:p-6">
                         <h5 className="text-white font-black text-sm lg:text-base tracking-tight line-clamp-1">{evt.title}</h5>
                         <p className="text-orange-400 text-[8px] font-black uppercase tracking-widest mt-1">{evt.date}</p>
                      </div>
                   </div>
                ))}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
