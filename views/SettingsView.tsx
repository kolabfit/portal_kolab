import React, { useState } from 'react';
import { Shield, Save, HardDrive, Layout, Youtube, Music, Loader2 } from 'lucide-react';
import { AppAssets, FileCategory } from '../types';
import DropZone from '../components/DropZone';

interface SettingsViewProps {
  assets: AppAssets;
  setAssets: React.Dispatch<React.SetStateAction<AppAssets>>;
  onAssetUpload: (file: File, oldUrl?: string, folderType?: string) => Promise<string | null>;
  onSaveAssets: () => void;
}

/**
 * SettingsView Component
 * Terminal manajemen konfigurasi sistem dan kebijakan branding HUB.
 * Updated: Added isSaving local state for progress micro-animations.
 */
const SettingsView: React.FC<SettingsViewProps> = ({ assets, setAssets, onAssetUpload, onSaveAssets }) => {
  const [isSaving, setIsSaving] = useState(false);
  
  const handleFileSelect = async (file: File, key: keyof AppAssets) => {
    const folderType = key === 'logoUrl' ? 'asetweb' : 'folderppid';
    const url = await onAssetUpload(file, assets[key] as string, folderType);
    if (url) setAssets({ ...assets, [key]: url });
  };

  const updatePolicy = (role: 'studentPolicy' | 'lecturerPolicy', key: string, value: any) => {
    const current = assets[role] || { defaultQuota: 0, maxUploadSize: 0, allowedCategories: [] };
    setAssets({ ...assets, [role]: { ...current, [key]: value } });
  };

  const toggleCategory = (role: 'studentPolicy' | 'lecturerPolicy', cat: FileCategory) => {
    const current = assets[role] || { defaultQuota: 0, maxUploadSize: 0, allowedCategories: [] };
    const categories = current.allowedCategories || [];
    const updated = categories.includes(cat) ? categories.filter(c => c !== cat) : [...categories, cat];
    updatePolicy(role, 'allowedCategories', updated);
  };

  const handleGlobalSave = async () => {
    setIsSaving(true);
    try {
      await onSaveAssets();
    } finally {
      setIsSaving(false);
    }
  };

  const categories: FileCategory[] = ['image', 'document', 'pdf', 'video', 'archive', 'other'];
  const bytesToMB = (bytes: number) => Math.round(bytes / (1024 * 1024)) || 0;
  const mbToBytes = (mb: number) => mb * 1024 * 1024;

  return (
    <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-right-8 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">System</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1.5 sm:mt-2">Global HUB Strategic Terminal</p>
        </div>
        <div className="bg-amber-100 text-amber-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center gap-3 border border-amber-200/50 shadow-sm shadow-amber-100/50 self-start sm:self-auto">
           <Shield size={18} className="animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest">Root Authority Bridged</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <section className="bg-white p-6 sm:p-8 lg:p-12 rounded-[2rem] sm:rounded-[3rem] lg:rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 sm:space-y-12">
           <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3 sm:gap-4 tracking-tight">
             <Layout className="text-orange-600" /> Branding Strategic
           </h3>
           <div className="space-y-8 sm:space-y-10">
              <DropZone 
                label="HUB Official Logo (Sector: asetweb)" 
                onFileSelect={(f) => handleFileSelect(f, 'logoUrl')} 
                currentValue={assets.logoUrl} 
                isImage 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                 <DropZone 
                    label="ID Card Front (Sector: ppid)" 
                    onFileSelect={(f) => handleFileSelect(f, 'bgFront')} 
                    currentValue={assets.bgFront} 
                    isImage 
                 />
                 <DropZone 
                    label="ID Card Back (Sector: ppid)" 
                    onFileSelect={(f) => handleFileSelect(f, 'bgBack')} 
                    currentValue={assets.bgBack} 
                    isImage 
                 />
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                  <Save size={14} className="text-orange-600" /> Global Fallback Streams
                </h4>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                         <Youtube size={12} className="text-red-600"/> Admin Youtube Embed
                      </label>
                      <textarea 
                         value={assets.adminYoutube || ''} 
                         onChange={e => setAssets({ ...assets, adminYoutube: e.target.value })}
                         placeholder='<iframe ...></iframe>'
                         className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-mono text-[10px] focus:ring-4 focus:ring-orange-100 outline-none resize-none" rows={3} 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                         <Music size={12} className="text-emerald-600"/> Admin Spotify Embed
                      </label>
                      <textarea 
                         value={assets.adminSpotify || ''} 
                         onChange={e => setAssets({ ...assets, adminSpotify: e.target.value })}
                         placeholder='<iframe ...></iframe>'
                         className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-mono text-[10px] focus:ring-4 focus:ring-orange-100 outline-none resize-none" rows={3} 
                      />
                   </div>
                </div>
              </div>
           </div>
        </section>

        <section className="bg-white p-6 sm:p-8 lg:p-12 rounded-[2rem] sm:rounded-[3rem] lg:rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 sm:space-y-12">
           <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3 sm:gap-4 tracking-tight">
             <HardDrive className="text-orange-600" /> Storage Cluster Policy
           </h3>
           <div className="space-y-8 sm:space-y-10">
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Student Hierarchy Tier</h4>
                    <span className="text-[8px] font-bold text-slate-300">Convert to Bytes Logic</span>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Default Quota (MB)</span>
                       <input type="number" value={bytesToMB(assets.studentPolicy?.defaultQuota || 0)} onChange={e => updatePolicy('studentPolicy', 'defaultQuota', mbToBytes(Number(e.target.value)))} className="w-full bg-transparent border-0 font-black text-lg text-slate-900 mt-1 focus:ring-0" />
                    </div>
                    <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max File Size (MB)</span>
                       <input type="number" value={bytesToMB(assets.studentPolicy?.maxUploadSize || 0)} onChange={e => updatePolicy('studentPolicy', 'maxUploadSize', mbToBytes(Number(e.target.value)))} className="w-full bg-transparent border-0 font-black text-lg text-slate-900 mt-1 focus:ring-0" />
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-2 px-2">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => toggleCategory('studentPolicy', cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${assets.studentPolicy?.allowedCategories?.includes(cat) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {cat}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Faculty Hierarchy Tier</h4>
                    <span className="text-[8px] font-bold text-slate-300">Convert to Bytes Logic</span>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Default Quota (MB)</span>
                       <input type="number" value={bytesToMB(assets.lecturerPolicy?.defaultQuota || 0)} onChange={e => updatePolicy('lecturerPolicy', 'defaultQuota', mbToBytes(Number(e.target.value)))} className="w-full bg-transparent border-0 font-black text-lg text-slate-900 mt-1 focus:ring-0" />
                    </div>
                    <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max File Size (MB)</span>
                       <input type="number" value={bytesToMB(assets.lecturerPolicy?.maxUploadSize || 0)} onChange={e => updatePolicy('lecturerPolicy', 'maxUploadSize', mbToBytes(Number(e.target.value)))} className="w-full bg-transparent border-0 font-black text-lg text-slate-900 mt-1 focus:ring-0" />
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-2 px-2">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => toggleCategory('lecturerPolicy', cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${assets.lecturerPolicy?.allowedCategories?.includes(cat) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {cat}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </section>
      </div>

      <div className="pt-10 border-t border-slate-100 flex justify-end">
         <button 
           onClick={handleGlobalSave} 
           disabled={isSaving}
           className={`relative overflow-hidden px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all flex items-center gap-4 active:scale-95 ${isSaving ? 'cursor-wait opacity-80' : ''}`}
          >
           {isSaving ? (
             <>
               <Loader2 size={20} className="animate-spin" />
               Deploying Infrastructure...
             </>
           ) : (
             <>
               <Save size={20} /> 
               Deploy Mainframe Changes
             </>
           )}
           
           {isSaving && <div className="btn-progress-line"></div>}
         </button>
      </div>
    </div>
  );
};

export default SettingsView;