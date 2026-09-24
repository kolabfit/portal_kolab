import React, { useState } from 'react';
import { X, Globe, Instagram, Linkedin, FileVideo, Users } from 'lucide-react';

const LecturerStartupsView: React.FC<{ startups: any[] }> = ({ startups }) => {
  const [selectedStartup, setSelectedStartup] = useState<any>(null);

  const socialUrl = (value: string, platform: string) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.includes('.')) return `https://${value}`;
    return `https://${platform}.com/${value.replace(/^@/, '')}`;
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <div>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter">Startup Ko+Lab</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Direktori startup dan struktur tim</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {startups.map(startup => (
          <section key={startup.id} className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-center gap-4 mb-7">
              {startup.logoUrl ? (
                <img src={startup.logoUrl} alt={startup.name} className="w-16 h-16 rounded-2xl object-cover bg-slate-50 border border-slate-100" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-2xl">
                  {startup.name[0]}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{startup.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {startup.website && <a href={socialUrl(startup.website, 'www')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-[10px] font-bold transition-colors"><Globe size={12} /> Website</a>}
                  {startup.ig && <a href={socialUrl(startup.ig, 'instagram')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-[10px] font-bold transition-colors"><Instagram size={12} /> Instagram</a>}
                  {startup.tiktok && <a href={socialUrl(startup.tiktok, 'tiktok')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-[10px] font-bold transition-colors"><FileVideo size={12} /> TikTok</a>}
                  {startup.linkedin && <a href={socialUrl(startup.linkedin, 'linkedin')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-[10px] font-bold transition-colors"><Linkedin size={12} /> LinkedIn</a>}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedStartup(startup)}
              className="w-full py-4 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Users size={16} />
              Struktur Tim ({startup.members?.length || 0})
            </button>
          </section>
        ))}
      </div>
      
      {!startups.length && <p className="py-20 text-center text-xs font-black uppercase tracking-widest text-slate-300">Belum ada startup.</p>}

      {selectedStartup && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedStartup(null)}>
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
              <div className="flex items-center gap-5">
                {selectedStartup.logoUrl ? (
                  <img src={selectedStartup.logoUrl} alt={selectedStartup.name} className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-2xl">{selectedStartup.name[0]}</div>
                )}
                <div>
                  <h3 className="text-3xl font-black text-slate-900 leading-tight">{selectedStartup.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Struktur Tim & Anggota</p>
                </div>
              </div>
              <button onClick={() => setSelectedStartup(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
              {['CEO', 'COO', 'CTO', 'CFO', 'CMO', 'MEMBER'].map(position => {
                const members = selectedStartup.members?.filter((m: any) => m.position === position) || [];
                if (!members.length) return null;
                return (
                  <div key={position} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest">{position}</span>
                    <div className="space-y-1">
                      {members.map((m: any, i: number) => (
                        <div key={i} className="font-bold text-slate-700 text-sm flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          {m.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {(!selectedStartup.members || selectedStartup.members.length === 0) && (
                <p className="text-center text-slate-400 font-bold py-10">Belum ada anggota terdaftar.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerStartupsView;
