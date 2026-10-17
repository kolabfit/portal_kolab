import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Edit2, Trash2, X, Globe, 
  MapPin, Phone, Users, AppWindow, Save, Loader2 
} from 'lucide-react';
import { api } from '../api';
import { Mitra, MitraMember, MitraApp, UserRole } from '../types';
import DropZone from '../components/DropZone';

interface MitraViewProps {
  userRole: UserRole;
  onShowAlert: (title: string, msg: string, type: 'success' | 'error') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const getLogoUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://portal.kolab.top/api');
  const cleaned = url.startsWith('/api/') ? url.slice(4) : (url.startsWith('/') ? url : `/${url}`);
  return `${apiBase}${cleaned}`;
};

const MitraView: React.FC<MitraViewProps> = ({ userRole, onShowAlert, showConfirm }) => {
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [selectedMitra, setSelectedMitra] = useState<Mitra | null>(null);
  const [editingMitra, setEditingMitra] = useState<Partial<Mitra> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const isLecturer = userRole === UserRole.LECTURER || userRole === UserRole.ADMIN;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMitras(searchTerm);
      setMitras(data);
    } catch (error: any) {
      onShowAlert('Gagal', error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleOpenForm = (mitra?: Mitra) => {
    if (mitra) {
      setEditingMitra(mitra);
      setImagePreview(mitra.logo || null);
      setSelectedFile(null);
    } else {
      setEditingMitra({
        name: '',
        address: '',
        phone: '',
        description: '',
        headName: '',
        logo: '',
        website: '',
        members: [],
        apps: []
      });
      setImagePreview(null);
      setSelectedFile(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMitra(null);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const handleDelete = (mitra: Mitra) => {
    showConfirm('Hapus Mitra', `Yakin ingin menghapus ${mitra.name}? Data tidak dapat dikembalikan.`, async () => {
      try {
        await api.deleteMitra(mitra.id);
        onShowAlert('Berhasil', 'Mitra telah dihapus.', 'success');
        loadData();
        if (selectedMitra?.id === mitra.id) setSelectedMitra(null);
      } catch (error: any) {
        onShowAlert('Gagal', error.message, 'error');
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMitra?.name) return onShowAlert('Validasi', 'Nama mitra wajib diisi.', 'error');
    
    setIsProcessing(true);
    try {
      let finalLogo = editingMitra.logo || '';
      if (selectedFile) {
        const uploadRes = await api.uploadFileCdn(
          selectedFile, 
          'MITRA_LOGO',
          editingMitra.id,
          'public'
        );
        if (!uploadRes?.asset) {
          throw new Error(uploadRes?.message || 'Upload logo gagal. Silakan coba lagi.');
        }
        // Gunakan CDN deliveryUrl jika ada, fallback ke URL absolut proxy
        const apiBase = import.meta.env.VITE_API_BASE_URL
          || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://portal.kolab.top/api');
        finalLogo = uploadRes.asset.deliveryUrl
          || `${apiBase}/assets/${uploadRes.asset.id}/access`;
      } else if (!imagePreview) {
        finalLogo = '';
      }

      const payload = {
        ...editingMitra,
        logo: finalLogo
      };

      if (editingMitra.id) {
        await api.updateMitra(editingMitra.id, payload);
        onShowAlert('Berhasil', 'Data mitra diperbarui.', 'success');
      } else {
        await api.createMitra(payload);
        onShowAlert('Berhasil', 'Mitra baru ditambahkan.', 'success');
      }
      handleCloseForm();
      loadData();
    } catch (error: any) {
      onShowAlert('Gagal', error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const addMember = () => {
    if (!editingMitra) return;
    setEditingMitra({
      ...editingMitra,
      members: [...(editingMitra.members || []), { name: '', role: '' }]
    });
  };

  const updateMember = (index: number, field: 'name' | 'role', value: string) => {
    if (!editingMitra || !editingMitra.members) return;
    const newMembers = [...editingMitra.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setEditingMitra({ ...editingMitra, members: newMembers });
  };

  const removeMember = (index: number) => {
    if (!editingMitra || !editingMitra.members) return;
    const newMembers = [...editingMitra.members];
    newMembers.splice(index, 1);
    setEditingMitra({ ...editingMitra, members: newMembers });
  };

  const addApp = () => {
    if (!editingMitra) return;
    setEditingMitra({
      ...editingMitra,
      apps: [...(editingMitra.apps || []), { name: '', url: '' }]
    });
  };

  const updateApp = (index: number, field: 'name' | 'url', value: string) => {
    if (!editingMitra || !editingMitra.apps) return;
    const newApps = [...editingMitra.apps];
    newApps[index] = { ...newApps[index], [field]: value };
    setEditingMitra({ ...editingMitra, apps: newApps });
  };

  const removeApp = (index: number) => {
    if (!editingMitra || !editingMitra.apps) return;
    const newApps = [...editingMitra.apps];
    newApps.splice(index, 1);
    setEditingMitra({ ...editingMitra, apps: newApps });
  };

  const ensureUrlScheme = (url: string) => {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter">Mitra Ko+Lab</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Daftar Mitra dan Kolaborator</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari mitra..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold w-full sm:w-64 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
            />
          </div>
          {isLecturer && (
            <button 
              onClick={() => handleOpenForm()} 
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg hover:shadow-orange-500/25"
            >
              <Plus size={18} /> Tambah Mitra
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-orange-600" size={40} />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Mitra...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mitras.map(mitra => (
            <section key={mitra.id} className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group" onClick={() => setSelectedMitra(mitra)}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {mitra.logo ? (
                    <img 
                      src={getLogoUrl(mitra.logo)} 
                      alt={mitra.name} 
                      className="w-16 h-16 rounded-2xl object-cover bg-slate-50 border border-slate-100" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-2xl">
                      {mitra.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2">{mitra.name}</h2>
                    {mitra.headName && <p className="text-xs font-bold text-slate-500 mt-1">Ketua: {mitra.headName}</p>}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 font-medium line-clamp-3 mb-6 leading-relaxed">
                {mitra.description || 'Tidak ada deskripsi.'}
              </p>

              <div className="flex flex-wrap gap-2 mt-auto">
                {mitra.website && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold"><Globe size={12} /> Website</span>
                )}
                {mitra.members && mitra.members.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold"><Users size={12} /> {mitra.members.length} Anggota</span>
                )}
                {mitra.apps && mitra.apps.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold"><AppWindow size={12} /> {mitra.apps.length} Aplikasi</span>
                )}
              </div>
              
              {isLecturer && (
                <div className="mt-6 pt-6 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenForm(mitra); }}
                    className="flex-1 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(mitra); }}
                    className="flex-1 py-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              )}
            </section>
          ))}
          {!mitras.length && <div className="col-span-full py-20 text-center text-xs font-black uppercase tracking-widest text-slate-300">Belum ada data mitra.</div>}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedMitra && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                {selectedMitra.logo ? (
                  <img 
                    src={getLogoUrl(selectedMitra.logo)} 
                    alt={selectedMitra.name} 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-100 shrink-0" 
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-xl sm:text-2xl shrink-0">
                    {selectedMitra.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{selectedMitra.name}</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">Detail Mitra</p>
                </div>
              </div>
              <button onClick={() => setSelectedMitra(null)} className="p-2 sm:p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><MapPin size={16} /></div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Alamat</span>
                    <p className="text-sm font-bold text-slate-700">{selectedMitra.address || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Phone size={16} /></div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nomor Handphone</span>
                    <p className="text-sm font-bold text-slate-700">{selectedMitra.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Building2 size={16} /></div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nama Ketua / Penanggung Jawab</span>
                    <p className="text-sm font-bold text-slate-700">{selectedMitra.headName || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Globe size={16} /></div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Website</span>
                    {selectedMitra.website ? (
                      <a href={ensureUrlScheme(selectedMitra.website)} target="_blank" rel="noreferrer" className="text-sm font-bold text-orange-600 hover:underline">{selectedMitra.website}</a>
                    ) : (
                      <p className="text-sm font-bold text-slate-700">-</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Deskripsi</span>
                <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 p-5 rounded-2xl">
                  {selectedMitra.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 flex items-center gap-2"><Users size={14} /> Daftar Anggota</span>
                {selectedMitra.members && selectedMitra.members.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMitra.members.map((member, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{member.name}</span>
                        {member.role && <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">{member.role}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400 italic">Belum ada data anggota.</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 flex items-center gap-2"><AppWindow size={14} /> Daftar Aplikasi</span>
                {selectedMitra.apps && selectedMitra.apps.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMitra.apps.map((app, i) => (
                      <a key={i} href={ensureUrlScheme(app.url)} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 hover:border-orange-300 rounded-xl p-4 flex items-center justify-between group transition-colors">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-orange-600 transition-colors">{app.name}</span>
                        <Globe size={14} className="text-slate-300 group-hover:text-orange-600" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400 italic">Belum ada data aplikasi.</p>
                )}
              </div>
            </div>
            {isLecturer && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button onClick={() => { setSelectedMitra(null); handleOpenForm(selectedMitra); }} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors">
                  <Edit2 size={16} /> Edit Mitra
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORM MODAL (LECTURER & ADMIN ONLY) */}
      {showForm && editingMitra && isLecturer && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{editingMitra.id ? 'Edit Mitra' : 'Mitra Baru'}</h3>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">Isi formulir data mitra</p>
              </div>
              <button onClick={handleCloseForm} className="p-2 sm:p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Logo Mitra</label>
                <DropZone 
                  onFileSelect={(file) => {
                    setSelectedFile(file);
                    const reader = new FileReader();
                    reader.onload = (e) => setImagePreview(e.target?.result as string);
                    reader.readAsDataURL(file);
                  }} 
                  accept="image/*" 
                  currentValue={imagePreview || undefined}
                  isImage
                  className="w-full"
                />
                {imagePreview && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setSelectedFile(null);
                        setEditingMitra(prev => prev ? { ...prev, logo: '' } : null);
                      }}
                      className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Hapus Logo
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Nama Mitra *</label>
                <input 
                  type="text" 
                  value={editingMitra.name || ''} 
                  onChange={e => setEditingMitra({ ...editingMitra, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Contoh: PT KoLab Inovasi"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Ketua / Penanggung Jawab</label>
                <input 
                  type="text" 
                  value={editingMitra.headName || ''} 
                  onChange={e => setEditingMitra({ ...editingMitra, headName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Nama ketua atau PIC"
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Nomor HP</label>
                  <input 
                    type="text" 
                    value={editingMitra.phone || ''} 
                    onChange={e => setEditingMitra({ ...editingMitra, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="+62..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Website</label>
                  <input 
                    type="url" 
                    value={editingMitra.website || ''} 
                    onChange={e => setEditingMitra({ ...editingMitra, website: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Alamat</label>
                <textarea 
                  value={editingMitra.address || ''} 
                  onChange={e => setEditingMitra({ ...editingMitra, address: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold min-h-[80px] focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  placeholder="Alamat lengkap mitra..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Deskripsi</label>
                <textarea 
                  value={editingMitra.description || ''} 
                  onChange={e => setEditingMitra({ ...editingMitra, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium min-h-[120px] focus:ring-2 focus:ring-orange-500 outline-none resize-y"
                  placeholder="Deskripsi profil mitra..."
                />
              </div>

              {/* Dynamic Members */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daftar Anggota</label>
                  <button type="button" onClick={addMember} className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <Plus size={14} /> Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {editingMitra.members?.map((member, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input 
                        type="text" placeholder="Nama Anggota" value={member.name}
                        onChange={e => updateMember(i, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-orange-500"
                      />
                      <input 
                        type="text" placeholder="Peran / Role" value={member.role}
                        onChange={e => updateMember(i, 'role', e.target.value)}
                        className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-orange-500"
                      />
                      <button type="button" onClick={() => removeMember(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!editingMitra.members || editingMitra.members.length === 0) && <p className="text-xs text-slate-400 font-bold italic">Belum ada anggota ditambahkan.</p>}
                </div>
              </div>

              {/* Dynamic Apps */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aplikasi / Portofolio</label>
                  <button type="button" onClick={addApp} className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <Plus size={14} /> Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {editingMitra.apps?.map((app, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input 
                        type="text" placeholder="Nama Aplikasi" value={app.name}
                        onChange={e => updateApp(i, 'name', e.target.value)}
                        className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-orange-500"
                      />
                      <input 
                        type="url" placeholder="https://" value={app.url}
                        onChange={e => updateApp(i, 'url', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-orange-500"
                      />
                      <button type="button" onClick={() => removeApp(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!editingMitra.apps || editingMitra.apps.length === 0) && <p className="text-xs text-slate-400 font-bold italic">Belum ada aplikasi ditambahkan.</p>}
                </div>
              </div>

            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={handleCloseForm} disabled={isProcessing} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={isProcessing} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-70">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isProcessing ? (editingMitra.id ? 'Menyimpan perubahan...' : 'Menyimpan...') : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MitraView;
