
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FolderOpen, FileText, Download, Trash2, Upload, RefreshCw, Search, 
  ChevronRight, Plus, Grid, List, FileImage, 
  FileVideo, FileArchive, File as FileIcon, MoreVertical, 
  X, FolderPlus, Activity, HardDrive, Server, Database, Music, Table, Cpu, Play, Edit3, Copy, Clipboard, Info, Share2, ShieldCheck, Check, ZoomIn, ZoomOut, Maximize2,
  Layout, Save, Loader2
} from 'lucide-react';
import { RepoItem, UserProfile, GlobalRepoStats, AppAssets, FileCategory, UserRole } from '../types';
import { api } from '../api';
import { TablePagination } from '../components/TableControls';

interface RepoViewProps {
  profile: UserProfile;
  onShowAlert: (title: string, msg: string, type: any) => void;
  isAdmin?: boolean;
  assets?: AppAssets;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const RepoView: React.FC<RepoViewProps> = ({ profile, onShowAlert, isAdmin, assets, showConfirm }) => {
  const [items, setItems] = useState<RepoItem[]>([]);
  const [stats, setStats] = useState<GlobalRepoStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const fetching = useRef(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string>('ROOT');
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string, name: string}[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableFilters, setTableFilters] = useState({ descriptor: '', capacity: '' });
  
  // Modal States
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState<RepoItem | null>(null);
  const [showPasteModal, setShowPasteModal] = useState<{ item: RepoItem } | null>(null);
  const [uploadData, setUploadData] = useState<{file: File | null, label: string}>({ file: null, label: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Interaction States
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: RepoItem } | null>(null);
  const [clipboard, setClipboard] = useState<{ action: 'copy', item: RepoItem } | null>(null);
  const [previewItem, setPreviewItem] = useState<RepoItem | null>(null);
  
  // Preview Controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  const fetchData = useCallback(async (background = false) => {
    if (fetching.current) return;
    fetching.current = true;
    if (!background) setIsLoading(true);
    setIsSyncing(true);
    try {
      const payload = isAdmin ? {} : { id: profile.id, role: profile.role };
      const endpoint = isAdmin ? 'getAdminRepoData' : 'getRepoFiles';
      const result = await api.postData(endpoint, payload);
      if (result && result.items) {
        setItems(result.items);
        setStats(result.globalStats);
        setSyncMessage(result.cdnSync?.status === 'unavailable'
          ? result.cdnSync.message : result.cdnSync?.status === 'success' ? 'Tersinkron dengan CDN · pembaruan otomatis setiap 30 detik' : '');
        setPreviewItem(previous => previous ? result.items.find((item: RepoItem) => item.id === previous.id) || null : null);
      } else if (Array.isArray(result)) {
        setItems(result);
      } else setSyncMessage('Sinkronisasi tertunda. Daftar terakhir tetap ditampilkan.');
    } catch (err) {
      console.error("Repository Sync Failure", err);
      setSyncMessage('Sinkronisasi tertunda. Daftar terakhir tetap ditampilkan.');
    } finally {
      fetching.current = false;
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [isAdmin, profile.id, profile.role]);

  useEffect(() => {
    void fetchData();
    const refresh = () => { if (document.visibilityState === 'visible') void fetchData(true); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [fetchData]);

  useEffect(() => {
    if (!isLoading && currentFolder !== 'ROOT' && !currentFolder.startsWith('VIRTUAL_') &&
        !currentFolder.startsWith('OWNER_') && !items.some(item => item.id === currentFolder)) {
      setCurrentFolder('ROOT');
      setBreadcrumbs([]);
    }
  }, [items, currentFolder, isLoading]);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const displayItems = useMemo(() => {
    if (!isAdmin) return items.filter(i => i.parentId === currentFolder);
    if (currentFolder === 'ROOT') {
      return [
        { id: 'VIRTUAL_REPO_DOSEN', name: 'Folder Dosen', type: 'FOLDER', category: 'folder', date: 'Enterprise Storage', size: 0, url: '', parentId: 'ROOT', mimeType: 'folder' },
        { id: 'VIRTUAL_REPO_MEMBER', name: 'Folder Member', type: 'FOLDER', category: 'folder', date: 'Enterprise Storage', size: 0, url: '', parentId: 'ROOT', mimeType: 'folder' },
        { id: 'VIRTUAL_REPO_ADMIN', name: 'Folder Admin', type: 'FOLDER', category: 'folder', date: 'System Core Storage', size: 0, url: '', parentId: 'ROOT', mimeType: 'folder' }
      ] as RepoItem[];
    }
    if (currentFolder === 'VIRTUAL_REPO_DOSEN' || currentFolder === 'VIRTUAL_REPO_MEMBER') {
       const roleFilter = currentFolder === 'VIRTUAL_REPO_DOSEN' ? UserRole.LECTURER : UserRole.STUDENT;
       const owners = Array.from(new Set(items.filter(i => i.role === roleFilter).map(i => i.ownerId)));
       return owners.map(oid => ({ id: `OWNER_${oid}`, name: `Folder: ${oid}`, type: 'FOLDER', category: 'folder', date: 'Member Hub', size: 0, url: '', parentId: currentFolder, mimeType: 'folder' } as RepoItem));
    }
    if (currentFolder.startsWith('OWNER_')) {
       const oid = currentFolder.replace('OWNER_', '');
       return items.filter(i => i.ownerId === oid && i.parentId === 'ROOT');
    }
    if (currentFolder === 'VIRTUAL_REPO_ADMIN') return items.filter(i => i.role === UserRole.ADMIN && i.parentId === 'ROOT');
    return items.filter(i => i.parentId === currentFolder);
  }, [items, currentFolder, isAdmin]);

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase();
    return displayItems.filter(i => i.name.toLowerCase().includes(term))
      .filter(i => i.name.toLowerCase().includes(tableFilters.descriptor.toLowerCase()))
      .filter(i => `${i.type === 'FILE' ? formatSize(i.size) : '---'} ${i.type}`.toLowerCase().includes(tableFilters.capacity.toLowerCase()));
  }, [displayItems, search, tableFilters]);
  const pagedItems = filteredItems.slice((tablePage - 1) * 10, tablePage * 10);
  const tableTotalPages = Math.ceil(filteredItems.length / 10);
  useEffect(() => { setTablePage(1); }, [search, currentFolder, tableFilters, viewMode]);

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const label = fd.get('label') as string;
    if (!label) return;
    setIsProcessing(true);
    const res = await api.postData('createFolder', { id: profile.id, role: profile.role, isAdmin, name: label, parentId: currentFolder });
    if(res?.status === 'success') {
      onShowAlert('Folder Dibuat', `Folder "${label}" telah didaftarkan.`, 'success');
      setShowFolderModal(false);
      fetchData();
    }
    setIsProcessing(false);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.label) return;
    
    setIsProcessing(true);
    setUploadProgress(10);
    
    const reader = new FileReader();
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 5 : prev));
    }, 400);

    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await api.postData('uploadToRepo', {
        id: profile.id, role: profile.role, isAdmin,
        data: base64, fileName: uploadData.file!.name, label: uploadData.label,
        mimeType: uploadData.file!.type, parentId: currentFolder
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if(res?.status === 'success') {
        onShowAlert('File Diupload', 'Transmisi file berhasil diindeks.', 'success');
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadData({ file: null, label: '' });
          setUploadProgress(0);
          fetchData();
        }, 500);
      } else {
        setUploadProgress(0);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(uploadData.file);
  };

  const handleRenameConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showRenameModal) return;
    const fd = new FormData(e.currentTarget);
    const newName = fd.get('newName') as string;
    if (newName && newName !== showRenameModal.name) {
      setIsProcessing(true);
      const res = await api.postData('renameRepoItem', { id: showRenameModal.id, newName });
      if(res?.status === 'success') {
        onShowAlert('Label Diperbarui', 'Nama file telah berhasil diubah.', 'success');
        setShowRenameModal(null);
        fetchData();
      } else onShowAlert('Gagal mengubah nama', res?.message || 'CDN belum dapat memperbarui file.', 'error');
      setIsProcessing(false);
    } else setShowRenameModal(null);
  };

  const handlePasteConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showPasteModal) return;
    const fd = new FormData(e.currentTarget);
    const newName = fd.get('newName') as string;
    setIsProcessing(true);
    const res = await api.postData('copyRepoItem', { 
      id: showPasteModal.item.id, 
      newParentId: currentFolder, 
      role: profile.role, 
      id_owner: profile.id,
      newName: newName 
    });
    if (res?.status === 'success') {
      setClipboard(null);
      setShowPasteModal(null);
      onShowAlert('File Disalin', 'File telah direplikasi ke folder ini.', 'success');
      fetchData();
    }
    setIsProcessing(false);
  };

  const handleContextMenu = (e: React.MouseEvent, item: RepoItem) => {
    if (item.id.startsWith('VIRTUAL') || item.id.startsWith('OWNER')) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const getIcon = (cat: string, type: string) => {
    if (type === 'FOLDER') return <FolderOpen size={24} />;
    switch (cat) {
      case 'image': return <FileImage size={24} />;
      case 'pdf': return <FileText size={24} />;
      case 'sound': return <Music size={24} />;
      case 'video': return <Play size={24} />;
      case 'archive': return <FileArchive size={24} />;
      case 'spreadsheet': return <Table size={24} />;
      default: return <FileIcon size={24} />;
    }
  };

  const navigateTo = (item: RepoItem) => {
    setBreadcrumbs([...breadcrumbs, { id: item.id, name: item.name }]);
    setCurrentFolder(item.id);
  };

  const quotaLimit = profile.customQuota ?? (profile.role === UserRole.LECTURER ? (assets?.lecturerPolicy?.defaultQuota || 1073741824) : (assets?.studentPolicy?.defaultQuota || 524288000));
  const usedSpace = stats?.usedSpace || 0;
  const usagePercent = Math.min(100, Math.round((usedSpace / quotaLimit) * 100));

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in duration-700 pb-20 select-none relative font-['Plus_Jakarta_Sans']">
      
      {/* MAIN REPOSITORY WORKSPACE */}
      <div className="flex-1 space-y-10 min-w-0">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="flex-1">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">Repository</h2>
            {syncMessage && <p role="status" className="mt-3 text-xs text-slate-500">{syncMessage}</p>}
            <div className="flex items-center gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
               <button onClick={() => { setCurrentFolder('ROOT'); setBreadcrumbs([]); }} className={`p-4 rounded-[1.5rem] transition-all shadow-sm ${currentFolder === 'ROOT' ? 'bg-orange-600 text-white' : 'bg-white border border-slate-100 text-orange-600'}`}><HardDrive size={20}/></button>
               {breadcrumbs.map((b, idx) => (
                  <React.Fragment key={b.id}>
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    <button onClick={() => { setCurrentFolder(b.id); setBreadcrumbs(breadcrumbs.slice(0, idx + 1)); }} className="px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-orange-600 transition-all shrink-0 shadow-sm">{b.name}</button>
                  </React.Fragment>
               ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <button 
              onClick={() => void fetchData()}
              className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 group"
              title="Sync Node"
            >
              <RefreshCw size={20} className={isSyncing ? 'animate-spin text-orange-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
            </button>
            <div className="flex bg-slate-50 p-1.5 rounded-xl shadow-inner shrink-0">
               <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Grid size={18}/></button>
               <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List size={18}/></button>
            </div>
            <div className="relative group flex-1 md:w-64">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Scan files..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-5 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-xs focus:ring-4 focus:ring-orange-100/50 transition-all" />
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="min-h-[400px]">
          {filteredItems.length === 0 ? (
            <div className="py-48 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.4em] flex flex-col items-center gap-6">
              <Database size={40} className="opacity-30 animate-pulse" /> EMPTY FOLDER
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} onDoubleClick={() => item.type === 'FOLDER' ? navigateTo(item) : setPreviewItem(item)} onContextMenu={(e) => handleContextMenu(e, item)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 transition-all duration-500 group cursor-pointer relative shadow-sm hover:shadow-xl hover:-translate-y-1 border-b-4 border-b-transparent hover:border-b-orange-600">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-500 ${item.type === 'FOLDER' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-white'}`}>
                      {getIcon(item.category, item.type)}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, item); }} className="p-2 text-slate-200 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"><MoreVertical size={16}/></button>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-black text-slate-900 text-lg truncate tracking-tight">{item.name}</h4>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">{item.type === 'FOLDER' ? 'Folder' : formatSize(item.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
               <table className="w-full">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                     <tr>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Descriptor</th>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacity</th>
                        <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                     </tr>
                     <tr className="border-t border-slate-100">
                        <th className="px-8 py-3"><input aria-label="Filter descriptor" placeholder="Filter..." value={tableFilters.descriptor} onChange={e => setTableFilters(filters => ({ ...filters, descriptor: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white text-xs outline-none border border-slate-100" /></th>
                        <th className="px-8 py-3"><input aria-label="Filter capacity" placeholder="Filter..." value={tableFilters.capacity} onChange={e => setTableFilters(filters => ({ ...filters, capacity: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white text-xs outline-none border border-slate-100" /></th>
                        <th className="px-8 py-3"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {pagedItems.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group cursor-pointer" onDoubleClick={() => item.type === 'FOLDER' ? navigateTo(item) : setPreviewItem(item)} onContextMenu={(e) => handleContextMenu(e, item)}>
                          <td className="px-8 py-4">
                             <div className="flex items-center gap-4">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'FOLDER' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-900'}`}>{getIcon(item.category, item.type)}</div>
                                <span className="font-black text-slate-900 text-sm truncate max-w-xs">{item.name}</span>
                             </div>
                          </td>
                          <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type === 'FILE' ? formatSize(item.size) : '---'}</td>
                          <td className="px-8 py-4 text-right">
                             <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, item); }} className="p-2 text-slate-200 hover:text-slate-900 transition-colors"><MoreVertical size={16}/></button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
               <TablePagination page={tablePage} totalPages={tableTotalPages} totalRows={filteredItems.length} onPageChange={setTablePage} />
            </div>
          )}
        </div>
      </div>

      {/* MINIMALIST SIDEBAR STATS */}
      <div className="lg:w-80 shrink-0 space-y-6">
         {/* QUOTA CARD */}
         <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <Activity className="absolute -bottom-6 -right-6 text-white/5" size={140} />
            <div className="relative space-y-6">
               <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Storage Quota</h3>
                  <ShieldCheck size={16} className="text-orange-600" />
               </div>
               <div className="space-y-2">
                  <div className="flex items-end justify-between">
                     <span className="text-3xl font-black">{formatSize(usedSpace).split(' ')[0]}</span>
                     <span className="text-[10px] font-bold text-slate-400 mb-1">/ {formatSize(quotaLimit)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-orange-600 transition-all duration-1000" style={{ width: `${usagePercent}%` }}></div>
                  </div>
                  <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em]">{usagePercent}% Capacity Bound</p>
               </div>
            </div>
         </div>

         {/* TYPE STATS */}
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2"><Layout size={14} className="text-orange-600" /> Distributions</h3>
            <div className="space-y-5">
               {[
                  { label: 'Images', cat: 'image', icon: FileImage, color: 'bg-orange-500' },
                  { label: 'PDF Docs', cat: 'pdf', icon: FileText, color: 'bg-red-500' },
                  { label: 'Audio', cat: 'sound', icon: Music, color: 'bg-emerald-500' },
                  { label: 'Archives', cat: 'archive', icon: FileArchive, color: 'bg-purple-500' },
                  { label: 'Other', cat: 'other', icon: Database, color: 'bg-slate-400' }
               ].map(b => {
                  const s = stats?.categoryStats[b.cat as FileCategory] || { count: 0, size: 0 };
                  return (
                    <div key={b.label} className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${b.color} text-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}><b.icon size={14}/></div>
                          <div>
                             <p className="text-[10px] font-black text-slate-900 leading-none">{b.label}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{s.count} Files</p>
                          </div>
                       </div>
                       <span className="text-[9px] font-black text-slate-400">{formatSize(s.size)}</span>
                    </div>
                  )
               })}
            </div>
         </div>
      </div>

      {/* FLOATING ACTION BAR */}
      <div className="fixed bottom-10 right-10 flex gap-4 z-40">
         {clipboard && (
            <button onClick={() => setShowPasteModal({ item: clipboard.item })} className="w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border-4 border-white animate-bounce"><Clipboard size={24}/></button>
         )}
         <button onClick={() => setShowFolderModal(true)} className="w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border-4 border-white"><FolderPlus size={24}/></button>
         <button onClick={() => setShowUploadModal(true)} className="w-16 h-16 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border-4 border-white"><Upload size={24}/></button>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div className="fixed z-[9999] bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white py-3 w-56 animate-in fade-in zoom-in-95 duration-200" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => setShowRenameModal(contextMenu.item)} className="w-full flex items-center gap-4 px-6 py-2.5 hover:bg-white text-[9px] font-black uppercase tracking-widest text-slate-600 transition-colors"><Edit3 size={14} className="text-orange-600"/> Rename File</button>
          <button onClick={() => { setClipboard({ action: 'copy', item: contextMenu.item }); setContextMenu(null); onShowAlert('File Disalin', 'File siap ditempel.', 'info'); }} className="w-full flex items-center gap-4 px-6 py-2.5 hover:bg-white text-[9px] font-black uppercase tracking-widest text-slate-600 transition-colors"><Copy size={14} className="text-orange-600"/> Copy File</button>
          <button onClick={() => { showConfirm('Purge File?', `Hapus "${contextMenu.item.name}"?`, async () => { const result = await api.postData('deleteRepoItem', { id: contextMenu.item.id, id_owner: profile.id, role: profile.role }); if (result?.status !== 'success') onShowAlert('Gagal menghapus', result?.message || 'CDN belum mengonfirmasi penghapusan file.', 'error'); fetchData(); }); }} className="w-full flex items-center gap-4 px-6 py-2.5 hover:bg-red-50 text-[9px] font-black uppercase tracking-widest text-red-500 transition-colors"><Trash2 size={14}/> Delete</button>
        </div>
      )}

      {/* MODAL: RENAME */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-sm rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rename File</h3>
                 <button onClick={() => setShowRenameModal(null)} className="p-2 text-slate-300 hover:text-red-500"><X size={20}/></button>
              </div>
              <form onSubmit={handleRenameConfirm} className="space-y-6">
                 <input name="newName" required defaultValue={showRenameModal.name} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-orange-100 transition-all shadow-inner" />
                 <button type="submit" disabled={isProcessing} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                    {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Save Label
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: PASTE */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Paste File</h3>
                 <button onClick={() => setShowPasteModal(null)} className="p-2 text-slate-300 hover:text-red-500"><X size={20}/></button>
              </div>
              <form onSubmit={handlePasteConfirm} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Label Baru (Wajib Diinput)</label>
                    <input name="newName" required placeholder="Beri nama file hasil copy" defaultValue={`${showPasteModal.item.name} (Copy)`} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-orange-100 transition-all shadow-inner" />
                 </div>
                 <button type="submit" disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95">
                    {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : <Clipboard size={16}/>} Replicate Here
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: FOLDER */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
              <div className="flex justify-between mb-8"><h3 className="text-2xl font-black text-slate-900">New Folder</h3><button onClick={() => setShowFolderModal(false)}><X/></button></div>
              <form onSubmit={handleCreateFolder} className="space-y-6">
                <input name="label" required placeholder="Folder Name" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none shadow-inner" />
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Create Folder</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: UPLOAD FILE */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
              <div className="flex justify-between mb-8"><h3 className="text-2xl font-black text-slate-900">Upload File</h3><button onClick={() => setShowUploadModal(false)}><X/></button></div>
              <form onSubmit={handleUpload} className="space-y-6">
                 <input value={uploadData.label} onChange={e => setUploadData({...uploadData, label: e.target.value})} required placeholder="Label file..." className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none shadow-inner" />
                 <div className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center cursor-pointer bg-slate-50" onClick={() => document.getElementById('repo-file-input')?.click()}>
                    <input id="repo-file-input" type="file" className="hidden" onChange={e => e.target.files && setUploadData({...uploadData, file: e.target.files[0], label: uploadData.label || e.target.files[0].name.split('.')[0]})} />
                    {uploadData.file ? <div className="text-center font-black text-[9px] text-emerald-600 truncate w-full">{uploadData.file.name}</div> : <Upload size={24} className="text-slate-300"/>}
                 </div>
                 
                 <button 
                  type="submit" 
                  disabled={!uploadData.file || isProcessing} 
                  className={`w-full relative overflow-hidden py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isProcessing ? 'opacity-80 cursor-wait' : 'hover:bg-orange-700 active:scale-95 shadow-xl'}`}
                 >
                    {isProcessing ? (
                      <div className="flex items-center justify-center gap-3 relative z-10">
                        <Loader2 className="animate-spin" size={16} />
                        Uploading ({uploadProgress}%)
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3 relative z-10">
                        <Upload size={16} /> Upload File
                      </div>
                    )}
                    
                    {/* PROGRESS BAR OVERLAY */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-orange-500 origin-left transition-all duration-500 z-0" style={{ width: `${uploadProgress}%` }}></div>
                    )}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* PREMIUM PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/98 backdrop-blur-3xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
           
           {/* FLOATING HEADER */}
           <div onMouseEnter={() => setIsHeaderHovered(true)} onMouseLeave={() => setIsHeaderHovered(false)}
             className={`absolute top-12 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl z-20 flex items-center justify-between p-7 bg-white/95 backdrop-blur-md rounded-[3rem] shadow-2xl border border-white/20 transition-all duration-700 ${isHeaderHovered ? 'opacity-100 scale-100' : 'opacity-10 scale-[0.98]'}`}>
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">{getIcon(previewItem.category, previewItem.type)}</div>
                 <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-xl tracking-tighter leading-none truncate max-w-md">{previewItem.name}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{previewItem.mimeType} • {formatSize(previewItem.size)}</p>
                 </div>
              </div>
              <div className="flex items-center gap-5">
                 <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                    <button onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.2))} className="p-3 text-slate-600 hover:bg-white hover:text-orange-600 rounded-xl transition-all shadow-sm"><ZoomOut size={20}/></button>
                    <button onClick={() => setZoomLevel(1)} className="px-5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900">1:1</button>
                    <button onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.2))} className="p-3 text-slate-600 hover:bg-white hover:text-orange-600 rounded-xl transition-all shadow-sm"><ZoomIn size={20}/></button>
                 </div>
                 <button onClick={() => { setPreviewItem(null); setZoomLevel(1); }} className="p-4.5 bg-slate-900 text-white rounded-[1.8rem] hover:bg-red-600 transition-all hover:rotate-90 active:scale-90 shadow-xl"><X size={28}/></button>
              </div>
           </div>

           {/* MAXIMIZED PREVIEW AREA */}
           <div className="w-full h-full bg-black/30 rounded-[5rem] overflow-hidden flex items-center justify-center">
              <div className="w-full h-full flex items-center justify-center overflow-auto scrollbar-hide">
                 <div style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }} className="flex items-center justify-center min-w-full min-h-full">
                    {previewItem.category === 'image' ? (
                      <img src={previewItem.url} className="max-w-[95vw] max-h-[90vh] object-contain rounded-[2.5rem] shadow-2xl border-[12px] border-white animate-in zoom-in-95" alt="Preview" />
                    ) : previewItem.category === 'pdf' ? (
                      <iframe src={previewItem.url} className="w-[90vw] h-[85vh] rounded-[3rem] shadow-2xl border border-white/10 bg-white" />
                    ) : (
                      <div className="text-center space-y-14">
                         <div className="w-56 h-56 bg-orange-600 text-white rounded-[5rem] flex items-center justify-center mx-auto shadow-2xl animate-pulse"><Cpu size={120} /></div>
                         <h4 className="text-5xl font-black text-white uppercase tracking-tighter">Preview Not Available</h4>
                         <a href={previewItem.url} target="_blank" rel="noopener" className="inline-flex items-center gap-6 px-20 py-8 bg-white text-slate-900 rounded-[3rem] font-black text-xs uppercase tracking-[0.5em] hover:bg-orange-600 hover:text-white transition-all shadow-2xl active:scale-95 group">Download File <Download size={28} className="group-hover:translate-y-1 transition-transform" /></a>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* SYNC LOADER */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-2xl flex items-center justify-center">
           <div className="flex flex-col items-center gap-8">
              <div className="w-20 h-20 border-[8px] border-slate-100 border-t-orange-600 rounded-full animate-spin shadow-2xl"></div>
              <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.8em] animate-pulse">Syncing Repository...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default RepoView;
