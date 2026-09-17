
import React, { useEffect, useState } from 'react';
import { 
  Trash2, Search, Rocket, HardDrive, 
  Plus, X, Save, UserPlus, Edit3, Loader2, CheckCircle2, UserCircle, Globe, Instagram, Lock, Unlock, Users, ShieldAlert, Fingerprint, BookOpen, User, Filter, Briefcase, Building2, RefreshCw
} from 'lucide-react';
import { api } from '../api';
import { StartupTeam, UserRole, UserProfile, StudentJobDesk } from '../types';
import DropZone from '../components/DropZone';

interface MemberManagementViewProps {
  startups: StartupTeam[];
  onRefresh?: () => void;
  onShowAlert: (title: string, msg: string, type: any) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const MemberManagementView: React.FC<MemberManagementViewProps> = ({ startups, onRefresh, onShowAlert, showConfirm }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<'members' | 'startups'>('members');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole.STUDENT | UserRole.LECTURER>('ALL');
  
  // Modal & Popup States
  const [showAddMember, setShowAddMember] = useState(false);
  const [showStartupModal, setShowStartupModal] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; item?: StartupTeam }>({ isOpen: false, mode: 'add' });
  const [editingQuota, setEditingQuota] = useState<any | null>(null);
  const [editingIdentity, setEditingIdentity] = useState<any | null>(null);
  
  // New User Lifecycle State
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.STUDENT);
  const [newStudentType, setNewStudentType] = useState<'STARTUP' | 'NON_STARTUP'>('NON_STARTUP');

  // Operation Latency States
  const [isProcessingStartup, setIsProcessingStartup] = useState(false);
  const [isProcessingAdd, setIsProcessingAdd] = useState(false);
  const [startupLogoPreview, setStartupLogoPreview] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsSyncing(true);
    await fetchMembers();
    if (onRefresh) await onRefresh();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const result = await api.postData('getAllMembers', {});
      if (Array.isArray(result)) {
        const parsedMembers = result.map(m => ({
          ...m,
          isActive: m.isActive === true || String(m.isActive).toUpperCase() === 'TRUE' || m.isActive === 1 || String(m.isActive) === '1',
          isApproved: m.isApproved === true || String(m.isApproved).toUpperCase() === 'TRUE' || m.isApproved === 1 || String(m.isApproved) === '1'
        }));
        setMembers(parsedMembers);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error("Critical failure during member directory pull", err);
      setMembers([]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || 
                         m.studentId?.toString().toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingAdd(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      role: newUserRole,
      id: fd.get('id'),
      name: fd.get('name'),
      password: fd.get('password'),
      lecturerCode: fd.get('lecturerCode'),
      studentType: newUserRole === UserRole.STUDENT ? newStudentType : undefined,
      startupId: newUserRole === UserRole.STUDENT && newStudentType === 'STARTUP' ? fd.get('startupId') : '',
      studentJobDesk: newUserRole === UserRole.STUDENT ? fd.get('studentJobDesk') : ''
    };

    const res = await api.postData('register', data);
    if(res?.status === 'success') {
      onShowAlert('User Registered', 'User baru telah berhasil diindeks ke mainframe database.', 'success');
      setShowAddMember(false);
      fetchMembers();
    } else {
      onShowAlert('Registry Error', res?.message || 'Gagal mendaftarkan user.', 'error');
    }
    setIsProcessingAdd(false);
  };

  const handleStartupAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingStartup(true);
    const fd = new FormData(e.currentTarget);
    
    let logoUrl = startupLogoPreview || showStartupModal.item?.logoUrl || '';
    if (startupLogoPreview && startupLogoPreview.startsWith('data:')) {
       const uploadRes = await api.postData('uploadFile', { 
         data: startupLogoPreview.split(',')[1], 
         fileName: `logo-startup-${Date.now()}.png`, 
         mimeType: startupLogoPreview.match(/^data:([^;]+);/)?.[1] || 'image/png',
         folderType: 'asetweb'
       });
       if (uploadRes?.status === 'success') logoUrl = uploadRes.url;
       else { onShowAlert('Upload gagal', uploadRes?.message || 'Logo belum tersimpan.', 'error'); setIsProcessingStartup(false); return; }
    }

    const payload = {
      ...showStartupModal.item,
      name: fd.get('name'),
      website: fd.get('website'),
      ig: fd.get('ig'),
      logoUrl: logoUrl
    };

    const res = await api.postData('manageStartup', { 
      type: showStartupModal.mode, 
      id: showStartupModal.item?.id, 
      data: payload 
    });

    if(res?.status === 'success') {
      onShowAlert('Startup Synced', `Data startup berhasil disinkronkan.`, 'success');
      setShowStartupModal({ isOpen: false, mode: 'add' });
      setStartupLogoPreview(null);
      onRefresh?.();
    }
    setIsProcessingStartup(false);
  };

  const handleUpdateIdentity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const isS = editingIdentity.role === UserRole.STUDENT;
    const data: any = {
      name: fd.get('name'),
      password: fd.get('password') || undefined, 
    };

    if (isS) {
      data.studentType = fd.get('studentType');
      data.startupId = fd.get('startupId');
      data.studentJobDesk = fd.get('studentJobDesk');
    } else {
      data.lecturerCode = fd.get('lecturerCode');
    }

    const res = await api.postData('manageMember', { 
      type: 'updateIdentity', 
      targetId: editingIdentity.studentId, 
      role: editingIdentity.role,
      data
    });

    if(res?.status === 'success') {
      onShowAlert('Identity Synchronized', 'Identitas user telah diperbarui.', 'success');
      setEditingIdentity(null);
      fetchMembers();
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Management User</h2>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setActiveView('members')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'members' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'}`}>User Directory</button>
            <button onClick={() => setActiveView('startups')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'startups' ? 'bg-orange-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'}`}>Startup Cluster</button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <button 
            onClick={handleRefresh}
            className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 group"
            title="Sync Node"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin text-orange-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
          <div className="flex gap-3">
            {activeView === 'members' && (
              <div className="relative group">
                <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  value={roleFilter} 
                  onChange={e => setRoleFilter(e.target.value as any)}
                  className="pl-14 pr-8 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-xs appearance-none cursor-pointer focus:ring-4 focus:ring-orange-100 transition-all min-w-[140px]"
                >
                  <option value="ALL">All Roles</option>
                  <option value={UserRole.STUDENT}>Student</option>
                  <option value={UserRole.LECTURER}>Lecturer</option>
                </select>
              </div>
            )}
            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Identity Query..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
          </div>

          {activeView === 'members' ? (
            <button onClick={() => { setNewStudentType('NON_STARTUP'); setShowAddMember(true); }} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"><UserPlus size={18}/> New User</button>
          ) : (
            <button onClick={() => { setStartupLogoPreview(null); setShowStartupModal({ isOpen: true, mode: 'add' }); }} className="px-6 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-orange-700 transition-all active:scale-95"><Rocket size={18}/> New Startup</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {activeView === 'members' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">NIM / NIP</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Startup</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">JobDesk</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-32 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-[0.3em]">Accessing Identity Mainframe...</td></tr>
                ) : filteredMembers.length === 0 ? (
                  <tr><td colSpan={6} className="py-32 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">No users found in this sector</td></tr>
                ) : filteredMembers.map(m => {
                  const isAccountActive = m.isActive && m.isApproved;
                  const startupName = startups.find(s => s.id === m.startupId)?.name || 'Global Registry';
                  return (
                    <tr key={m.studentId} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-[11px] text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-sm">{m.name ? m.name[0] : '?'}</div>
                           <div className="flex flex-col">
                              <span className="font-black text-slate-900 tracking-tight leading-none">{m.name}</span>
                              <span className="text-[8px] font-bold text-orange-600 uppercase tracking-widest mt-1">{m.role}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">{m.studentId}</td>
                      <td className="px-10 py-6">
                         {m.role === UserRole.STUDENT ? (
                           <span className={`text-[10px] font-black uppercase tracking-tight ${m.studentType === 'STARTUP' ? 'text-indigo-600' : 'text-slate-300'}`}>
                             {m.studentType === 'STARTUP' ? startupName : 'NON-STARTUP'}
                           </span>
                         ) : <span className="text-slate-200">---</span>}
                      </td>
                      <td className="px-10 py-6">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{m.studentJobDesk || m.lecturerCode || 'Standard'}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border ${isAccountActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-red-50 text-red-600 border-red-100/50'}`}>
                          {isAccountActive ? <Unlock size={12} /> : <Lock size={12} />}
                          {isAccountActive ? 'Active' : 'Locked'}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingIdentity(m)} className="p-3 bg-white text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all shadow-sm"><Edit3 size={18} /></button>
                            <button onClick={() => setEditingQuota(m)} className="p-3 bg-white text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"><HardDrive size={18} /></button>
                            <button onClick={() => {
                               showConfirm('Purge User?', `Hapus identitas "${m.name}"?`, async () => {
                                  await api.postData('manageMember', { type: 'delete', targetId: m.studentId, role: m.role });
                                  fetchMembers();
                               });
                            }} className="p-3 bg-white text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-10 gap-8">
            {startups.map(s => (
              <div key={s.id} className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all group">
                 <div className="flex items-start justify-between mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden text-orange-600 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-100">
                       {s.logoUrl ? <img src={s.logoUrl} className="w-full h-full object-contain p-2" /> : <Rocket size={40} />}
                    </div>
                    <span className="text-[11px] font-black text-slate-900 uppercase">{s.id}</span>
                 </div>
                 <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-2 leading-tight">{s.name}</h4>
                 <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">
                    <Users size={14} className="text-orange-600" /> {s.memberCount || 0} Members
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => { setStartupLogoPreview(s.logoUrl || null); setShowStartupModal({ isOpen: true, mode: 'edit', item: s }); }} className="flex-1 py-3.5 bg-white text-slate-900 border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm">Edit</button>
                    <button onClick={() => {
                       showConfirm('Purge Startup?', `Hapus tim "${s.name}"?`, async () => {
                          await api.postData('manageStartup', { type: 'delete', id: s.id });
                          onRefresh?.();
                       });
                    }} className="p-3.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"><Trash2 size={16} /></button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 my-auto">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add New HUB Member</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Initial Protocol V7.3</p>
                </div>
                <button onClick={() => setShowAddMember(false)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X size={24} /></button>
             </div>
             
             <div className="p-1.5 bg-slate-50 rounded-[1.5rem] flex gap-2 mb-8">
                <button type="button" onClick={() => setNewUserRole(UserRole.STUDENT)} className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${newUserRole === UserRole.STUDENT ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Mahasiswa</button>
                <button type="button" onClick={() => setNewUserRole(UserRole.LECTURER)} className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${newUserRole === UserRole.LECTURER ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Dosen</button>
              </div>

             <form onSubmit={handleAddMember} className="space-y-6">
                <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Name</label>
                        <input name="name" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{newUserRole === UserRole.STUDENT ? "NIM" : "NIP"}</label>
                        <input name="id" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                      </div>
                   </div>

                   {newUserRole === UserRole.STUDENT && (
                     <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100/50 space-y-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-orange-600 uppercase ml-2">Student Ecosystem Tier</label>
                           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-orange-100">
                              <button type="button" onClick={() => setNewStudentType('STARTUP')} className={`flex-1 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${newStudentType === 'STARTUP' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Rocket size={14}/> Startup</button>
                              <button type="button" onClick={() => setNewStudentType('NON_STARTUP')} className={`flex-1 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${newStudentType === 'NON_STARTUP' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><User size={14}/> Non-Startup</button>
                           </div>
                        </div>

                        {newStudentType === 'STARTUP' && (
                          <div className="space-y-1 animate-in slide-in-from-top-2">
                             <label className="text-[9px] font-black text-orange-600 uppercase ml-2">Startup Cluster</label>
                             <select name="startupId" required className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl font-bold outline-none">
                                <option value="">-- Pilih Tim --</option>
                                {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                          </div>
                        )}

                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-orange-600 uppercase ml-2">Official JobDesk</label>
                           <select name="studentJobDesk" className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl font-bold outline-none appearance-none">
                              <option value="Non Jobdesk">Member Biasa</option>
                              <option value="Asisten Lab">Asisten Lab (ASLAB)</option>
                              <option value="PIC Lab">PIC Lab (PIC)</option>
                           </select>
                        </div>
                     </div>
                   )}

                   {newUserRole === UserRole.LECTURER && (
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Faculty Identifier (ASD)</label>
                        <input name="lecturerCode" required placeholder="e.g. ASD" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                     </div>
                   )}

                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Mainframe Security Token (Password)</label>
                      <input name="password" type="password" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                   </div>
                </div>
                <button type="submit" disabled={isProcessingAdd} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-black mt-4">
                  {isProcessingAdd ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} 
                  Registry Identity Mainframe
                </button>
             </form>
          </div>
        </div>
      )}

      {editingIdentity && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 my-auto max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl"><ShieldAlert size={28} /></div>
                   <div className="flex flex-col">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Identity Override</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Authority Control Protocol V7.3</p>
                   </div>
                </div>
                <button onClick={() => setEditingIdentity(null)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleUpdateIdentity} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block px-2">Authorized Full Name</label>
                      <input name="name" defaultValue={editingIdentity.name} required className="w-full px-7 py-5 bg-slate-50 rounded-[1.8rem] font-bold outline-none focus:ring-4 focus:ring-orange-100/50 transition-all" />
                   </div>
                   
                   {editingIdentity.role === UserRole.STUDENT ? (
                     <>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase px-2">Ecosystem Routing</label>
                          <select name="studentType" defaultValue={editingIdentity.studentType || 'NON_STARTUP'} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-orange-100/50">
                             <option value="NON_STARTUP">Non-Startup Member</option>
                             <option value="STARTUP">Startup Member</option>
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase px-2">Startup Assignment</label>
                          <select name="startupId" defaultValue={editingIdentity.startupId} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                             <option value="">Global HUB Cluster</option>
                             {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block px-2">Official JobDesk Assignment</label>
                           <select name="studentJobDesk" defaultValue={editingIdentity.studentJobDesk} className="w-full px-7 py-5 bg-slate-50 rounded-[1.8rem] font-bold outline-none">
                              <option value="Non Jobdesk">Non-Jobdesk</option>
                              <option value="Asisten Lab">Asisten Lab (ASLAB)</option>
                              <option value="PIC Lab">PIC Lab (PIC)</option>
                           </select>
                        </div>
                     </>
                   ) : (
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block px-2">Lecturer Identifier Code</label>
                        <input name="lecturerCode" defaultValue={editingIdentity.lecturerCode} className="w-full px-7 py-5 bg-slate-50 rounded-[1.8rem] font-bold outline-none" />
                     </div>
                   )}

                   <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-red-500 uppercase mb-3 block px-2 flex items-center gap-1.5"><Lock size={12}/> Security Override Token</label>
                      <input name="password" type="password" placeholder="Leave blank to maintain current" className="w-full px-7 py-5 bg-slate-50 border-l-8 border-red-500 rounded-[1.8rem] font-bold outline-none shadow-sm" />
                   </div>
                </div>
                
                <button type="submit" className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:bg-black"><Save size={22} /> Commit Identity Overrides</button>
             </form>
          </div>
        </div>
      )}

      {editingQuota && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Storage Cluster Control</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Binary Capacity Allocation</p>
                </div>
                <button onClick={() => setEditingQuota(null)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"><X size={24} /></button>
             </div>
             
             <form onSubmit={async (e) => {
               e.preventDefault();
               const fd = new FormData(e.currentTarget);
               const qMB = Number(fd.get('q'));
               const mMB = Number(fd.get('m'));
               const res = await api.postData('updateMemberStorage', {
                 targetId: editingQuota.studentId, role: editingQuota.role,
                 customQuota: qMB * 1024 * 1024, customMaxUpload: mMB * 1024 * 1024
               });
               if(res?.status === 'success') {
                 onShowAlert('Storage Sync', 'Kebijakan penyimpanan diperbarui.', 'success');
                 setEditingQuota(null);
                 fetchMembers();
               }
             }} className="space-y-8">
                <div className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-2">Total Disk Allocation (MB)</label>
                      <input name="q" type="number" defaultValue={(editingQuota.customQuota || 0) / (1024 * 1024)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-400 transition-all" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-2">Max Transfer Rate / File (MB)</label>
                      <input name="m" type="number" defaultValue={(editingQuota.customMaxUpload || 0) / (1024 * 1024)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-400 transition-all" />
                   </div>
                </div>
                <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"><Save size={18} /> Sync Storage Policy</button>
             </form>
          </div>
        </div>
      )}

      {showStartupModal.isOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 lg:p-12 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{showStartupModal.mode === 'add' ? 'New Startup' : 'Startup Identity'}</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ecosystem Branding Terminal</p>
                </div>
                <button onClick={() => setShowStartupModal({ isOpen: false, mode: 'add' })} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleStartupAction} className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Visual Branding (Sector: asetweb)</label>
                   <DropZone 
                     onFileSelect={(f) => {
                       const r = new FileReader();
                       r.onload = (ev) => setStartupLogoPreview(ev.target?.result as string);
                       r.readAsDataURL(f);
                     }}
                     currentValue={startupLogoPreview || undefined}
                     isImage
                     className="min-h-[140px]"
                   />
                </div>
                
                <div className="space-y-5">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Team Identifier</label>
                     <input name="name" defaultValue={showStartupModal.item?.name} required placeholder="Startup Narrative Name" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:border-orange-400" />
                   </div>
                   <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Official Website</label>
                        <input name="website" defaultValue={showStartupModal.item?.website} placeholder="HTTPS://" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Social Hub</label>
                        <input name="ig" defaultValue={showStartupModal.item?.ig} placeholder="@Handle" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none text-xs" />
                      </div>
                   </div>
                </div>
                
                <button type="submit" disabled={isProcessingStartup} className="w-full py-6 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-orange-700 mt-2">
                  {isProcessingStartup ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                  {showStartupModal.mode === 'add' ? 'Deploy Startup' : 'Commit Changes'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagementView;
