import React, { useEffect, useState } from 'react';
import { UserCircle, Layers, Camera, Upload, Loader2, Briefcase, User, CheckCircle2, Building2, Youtube, Music, Radio, Save } from 'lucide-react';
import { UserProfile, UserRole, StudentJobDesk, LecturerJobDesk, StartupTeam } from '../types';
import CameraCapture from '../components/CameraCapture';
import RetryImage from '../components/RetryImage';

interface ProfileViewProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  startups: StartupTeam[];
  handleProfileUpdate: (e: React.FormEvent) => void;
  onFileUpload: (file: File, oldUrl?: string, folder?: string) => Promise<string | null>;
}

/**
 * ProfileView Component - User Identity Hub V16.9
 * Updated: Added local isSyncing state for premium progress animation on submit.
 */
const ProfileView: React.FC<ProfileViewProps> = ({ profile, setProfile, startups, handleProfileUpdate, onFileUpload }) => {
  const [showCamera, setShowCamera] = useState<'avatar' | 'photoIdCard' | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [imageErrors, setImageErrors] = useState({ avatar: false, photoIdCard: false });
  useEffect(() => { setImageErrors(errors => ({ ...errors, avatar: false })); }, [profile.avatar]);
  useEffect(() => { setImageErrors(errors => ({ ...errors, photoIdCard: false })); }, [profile.photoIdCard]);

  const triggerUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'photoIdCard') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(type);
      try {
        const url = await onFileUpload(file, profile[type], 'folderppid');
        if (url) setProfile({ ...profile, [type]: url });
      } finally {
        setIsUploading(null);
      }
    }
  };

  const handleCameraCapture = async (base64: string, type: 'avatar' | 'photoIdCard') => {
    const res = await fetch(base64);
    const blob = await res.blob();
    const file = new File([blob], `${type}-${Date.now()}.png`, { type: 'image/png' });
    setIsUploading(type);
    try {
      const url = await onFileUpload(file, profile[type], 'folderppid');
      if (url) setProfile({ ...profile, [type]: url });
    } finally {
      setIsUploading(null);
    }
  };

  const toggleLecturerJob = (job: LecturerJobDesk) => {
    const current = profile.lecturerJobDesks || [];
    const updated = current.includes(job) ? current.filter(j => j !== job) : [...current, job];
    setProfile({ ...profile, lecturerJobDesks: updated });
  };

  const toggleStudentStatus = (status: string) => {
    const current = profile.studentStatuses || [];
    const updated = current.includes(status) ? current.filter(s => s !== status) : [...current, status];
    setProfile({ 
      ...profile, 
      studentStatuses: updated,
      studentType: updated.includes('Startup') ? 'STARTUP' : 'NON_STARTUP'
    });
  };

  const onLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      await handleProfileUpdate(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="h-48 bg-slate-900 flex items-center justify-center">
          <h2 className="text-white/10 text-9xl font-black uppercase select-none tracking-tighter">Account</h2>
        </div>

        <div className="px-12 pb-16">
          <div className="relative -mt-24 flex flex-col md:flex-row items-end gap-12 mb-16">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group w-48 h-48 rounded-full border-[10px] border-white shadow-2xl bg-white overflow-hidden">
                {isUploading === 'avatar' ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-600" /></div>
                ) : imageErrors.avatar ? (
                    <p role="alert" className="p-5 text-center text-xs text-red-600">Foto gagal dimuat. Muat ulang halaman untuk mencoba kembali.</p>
                ) : profile.avatar ? (
                    <RetryImage src={profile.avatar} onError={() => setImageErrors(errors => ({ ...errors, avatar: true }))} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                    <UserCircle size={42} className="text-slate-300" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setShowCamera('avatar')} className="p-3 bg-white rounded-full hover:scale-110 transition-transform"><Camera size={20} /></button>
                  <label className="p-3 bg-white rounded-full hover:scale-110 transition-transform cursor-pointer">
                    <Upload size={20} />
                    <input type="file" className="hidden" onChange={(e) => triggerUpload(e, 'avatar')} />
                  </label>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Identity</span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative group w-32 h-44 rounded-2xl border-[6px] border-white shadow-xl bg-slate-50 overflow-hidden flex items-center justify-center">
                {isUploading === 'photoIdCard' ? (
                  <Loader2 className="animate-spin text-orange-600" />
                ) : imageErrors.photoIdCard ? (
                  <p role="alert" className="p-3 text-center text-xs text-red-600">Foto gagal dimuat. Muat ulang halaman untuk mencoba kembali.</p>
                ) : profile.photoIdCard ? (
                  <RetryImage src={profile.photoIdCard} onError={() => setImageErrors(errors => ({ ...errors, photoIdCard: true }))} className="w-full h-full object-cover" alt="ID Scan" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center"><User size={40} /></div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setShowCamera('photoIdCard')} className="p-2.5 bg-white rounded-full"><Camera size={18} /></button>
                  <label className="p-2.5 bg-white rounded-full cursor-pointer">
                    <Upload size={18} /><input type="file" className="hidden" onChange={(e) => triggerUpload(e, 'photoIdCard')} />
                  </label>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Scan</span>
            </div>

            <div className="flex-1 pb-6">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{profile.name}</h2>
              <p className="text-orange-600 font-black text-xs uppercase tracking-widest mt-1">{profile.role} Terminal</p>
            </div>
          </div>

          <form onSubmit={onLocalSubmit} className="space-y-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3"><UserCircle size={18} /> Core Identity</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Official Name</label>
                    <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-orange-100 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Identifier ({profile.role === UserRole.STUDENT ? 'NIM' : 'NIP'})</label>
                    <input type="text" readOnly value={profile.id} className="w-full px-6 py-4 bg-slate-100 border-0 rounded-2xl font-bold text-slate-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Email Address</label>
                    <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-orange-100 transition-all outline-none" />
                  </div>
                </div>

                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3 pt-4"><Radio size={18} /> Multimedia Streaming</h3>
                <div className="space-y-6">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                        <Youtube size={14} className="text-red-600" /> Youtube Playlist Embed HTML
                     </label>
                     <textarea value={profile.youtube || ''} onChange={e => setProfile({...profile, youtube: e.target.value})} placeholder='<iframe width="560" height="315" ...></iframe>' className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-mono text-[10px] focus:ring-4 focus:ring-orange-100 outline-none resize-none" rows={3} />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                        <Music size={14} className="text-emerald-600" /> Spotify Playlist Embed HTML
                     </label>
                     <textarea value={profile.spotify || ''} onChange={e => setProfile({...profile, spotify: e.target.value})} placeholder='<iframe style="border-radius:12px" ...></iframe>' className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-mono text-[10px] focus:ring-4 focus:ring-orange-100 outline-none resize-none" rows={3} />
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3"><Layers size={18} /> Hub Role Config</h3>
                <div className="space-y-8">
                  {profile.role === UserRole.STUDENT ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ecosystem Statuses</label>
                        <div className="flex flex-col gap-2">
                          {['Startup', 'Aslab', 'Member Biasa'].map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => toggleStudentStatus(status)}
                              className={`flex-1 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all flex justify-between items-center ${profile.studentStatuses?.includes(status) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
                              {status}
                              {profile.studentStatuses?.includes(status) && <CheckCircle2 size={16} />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {profile.studentType === 'STARTUP' && (
                        <div className="animate-in slide-in-from-top-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Startup (dikelola admin)</label>
                          <div className="relative">
                            <select value={profile.startupId || ''} disabled className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-orange-100 appearance-none">
                              <option value="">-- Choose Startup Team --</option>
                              {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <Building2 className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} />
                          </div>
                        </div>
                      )}
                    </>
                  ) : profile.role === UserRole.LECTURER ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Lecturer Code (ASD)</label>
                        <input type="text" value={profile.lecturerCode || ''} onChange={e => setProfile({...profile, lecturerCode: e.target.value.toUpperCase()})} placeholder="e.g. ASD" className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-orange-100 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Faculty Roles</label>
                        <div className="grid grid-cols-1 gap-2">
                          {[LecturerJobDesk.PENGURUS, LecturerJobDesk.PEMBINA].map(j => (
                            <button key={j} type="button" onClick={() => toggleLecturerJob(j)} className={`w-full py-4 px-6 rounded-2xl flex items-center justify-between font-black text-[10px] uppercase tracking-widest border-2 transition-all ${profile.lecturerJobDesks?.includes(j) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                              {j}
                              {profile.lecturerJobDesks?.includes(j) && <CheckCircle2 size={16} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-10 bg-slate-50 rounded-[2rem] text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Administrator ROOT Access: Personalisasi streaming akan menjadi fallback global untuk seluruh member.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={isSyncing}
                className={`relative overflow-hidden w-full sm:w-auto px-16 py-6 bg-slate-900 text-white rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 ${isSyncing ? 'cursor-wait opacity-80' : ''}`}
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Syncing Mainframe...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Sync Identity Mainframe
                  </>
                )}
                
                {isSyncing && <div className="btn-progress-line"></div>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showCamera && <CameraCapture onCapture={base64 => handleCameraCapture(base64, showCamera)} onClose={() => setShowCamera(null)} />}
    </div>
  );
};

export default ProfileView;
