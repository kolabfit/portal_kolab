
import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Tag, 
  Save, X, Image as ImageIcon, RefreshCw,
  Bold, Italic, Underline, Type, Palette, Loader2, Video, Link as LinkIcon, 
  Calendar, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, User, ChevronLeft
} from 'lucide-react';
import { Article, ArticleCategory } from '../types';
import { api } from '../api';
import Modal from '../components/Modal';
import { ArticleTagSelect } from '../components/ArticleTagSelect';

interface ArticleViewProps {
  articles: Article[];
  categories: ArticleCategory[];
  tags?: any[];
  isAdmin: boolean;
  currentUser: string;
  onAction: (type: 'add' | 'edit' | 'delete', id?: string, data?: any) => void | Promise<boolean>;
  onRefresh?: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const ArticleView: React.FC<ArticleViewProps> = ({ 
  articles, categories, tags = [], isAdmin, currentUser, onAction, onRefresh, showConfirm 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Article | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [imagePreview, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    if (editingItem && showForm) {
      setTitle(editingItem.title || '');
      setDateStr(editingItem.date ? editingItem.date.slice(0, 10) : new Date().toISOString().split('T')[0]);
      setCategoryId(editingItem.categoryId || '');
      setTagIds(editingItem.tagList ? editingItem.tagList.map((t: any) => t.id) : []);
      setAttachments(editingItem.attachments || []);
      setSelectedFiles([]);
      setPreviewImage(editingItem.imageUrl || null);
      setValidationError(null);
    } else if (showForm && !editingItem) {
      setTitle('');
      setDateStr(new Date().toISOString().split('T')[0]);
      setCategoryId('');
      setTagIds([]);
      setAttachments([]);
      setSelectedFiles([]);
      setPreviewImage(null);
      setValidationError(null);
    }
  }, [editingItem, showForm]);


  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsSyncing(true);
    await onRefresh();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const filtered = useMemo(() => {
    return (Array.isArray(articles) ? articles : [])
      .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [articles, searchTerm]);

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    const fd = new FormData(e.currentTarget);
    const trimmedTitle = title.trim();
    const htmlContent = editorRef.current?.innerHTML || '';
    const articleId = editingItem?.id || `art-${Date.now()}`;
    let finalImageUrl = editingItem?.imageUrl || '';
    if (imagePreview && imagePreview.startsWith('data:')) {
      const res = await api.uploadFile(imagePreview, `${articleId}.png`, editingItem?.imageUrl, 'asetweb');
      if (res?.status === 'success') finalImageUrl = res.url;
      else { window.alert(res?.message || 'Upload gambar gagal.'); setIsProcessing(false); return; }
    }
    const data = {
        title: trimmedTitle, author: editingItem ? editingItem.author : currentUser,
        date: dateStr, categoryId: categoryId, tags: [],
        content: htmlContent, imageUrl: finalImageUrl, videoUrl: fd.get('videoUrl'), otherUrl: fd.get('otherUrl')
      };
    const saved = await onAction(editingItem ? 'edit' : 'add', articleId, data);
    if (saved === false) { setIsProcessing(false); return; }
    setShowForm(false); setEditingItem(null); setPreviewImage(null); setIsProcessing(false);
  };

  if (selectedArticle) {
    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
        <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors">
          <ChevronLeft size={16} /> Kembali ke Indeks
        </button>
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-[400px] w-full relative overflow-hidden bg-slate-900">
            {selectedArticle.imageUrl ? <img src={selectedArticle.imageUrl} className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full flex items-center justify-center text-slate-800"><ImageIcon size={100} /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent flex flex-col justify-end p-12 lg:p-20">
               <span className="px-5 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest w-fit mb-6 shadow-xl">
                 {categories.find(c => c.id === selectedArticle.categoryId)?.name || 'General'}
               </span>
               <h2 className="text-6xl font-black text-white tracking-tighter leading-tight">{selectedArticle.title}</h2>
               <div className="flex items-center gap-8 mt-8 border-t border-white/10 pt-8">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-xs">{selectedArticle.author[0]}</div><span className="text-xs font-black text-white uppercase tracking-widest">{selectedArticle.author}</span></div>
                  <div className="flex items-center gap-3 text-slate-400 text-xs font-black uppercase tracking-widest"><Calendar size={18}/> {selectedArticle.date}</div>
               </div>
            </div>
          </div>
          <div className="p-12 lg:p-20 article-editor-content prose prose-xl max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div><h2 className="text-5xl font-black text-slate-900 tracking-tighter">Article</h2><p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Knowledge HUB</p></div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleRefresh}
            className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 group"
            title="Sync Node"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin text-orange-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
          <div className="relative w-full md:w-80"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder="Scan articles..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold" /></div>
            {(isAdmin || currentUser !== 'GUEST') && (
              <button onClick={() => { setEditingItem(null); setPreviewImage(null); setShowForm(true); }} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-xl transition-all"><Plus size={18} /> New Entry</button>
            )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(art => {
          const canManage = isAdmin || (art.author === currentUser);
          return (
            <div key={art.id} onClick={() => setSelectedArticle(art)} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl transition-all group flex flex-col cursor-pointer">
              <div className="h-48 bg-slate-50 relative overflow-hidden">
                {art.imageUrl ? <img src={art.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={48} /></div>}
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-black text-slate-900 mb-4 line-clamp-2 group-hover:text-orange-600 transition-colors leading-tight">{art.title}</h3>
                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">BY {art.author}</span>
                    {canManage && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditingItem(art); setPreviewImage(art.imageUrl || null); setShowForm(true); }} className="p-2 text-slate-300 hover:text-blue-600"><Edit2 size={14} /></button>
                        <button onClick={() => onAction('delete', art.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-6">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
             <div className="flex justify-between items-start p-6 lg:p-8 border-b border-slate-100 shrink-0">
               <div>
                 <h3 className="text-2xl font-black text-slate-900">{editingItem ? 'Edit Artikel' : 'Entry Artikel Baru'}</h3>
                 <p className="text-slate-500 text-sm font-medium mt-1">Buat dan publikasikan artikel baru untuk Portal Ko+Lab.</p>
               </div>
               <button 
                 onClick={() => setShowForm(false)} 
                 aria-label="Tutup modal"
                 className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
               >
                 <X size={24} />
               </button>
             </div>
             
             <div className="overflow-y-auto scrollbar-hide flex-1 p-6 lg:p-8 bg-slate-50/50">
               <form id="article-form" onSubmit={handleSubmit} className="space-y-6">
                  
                  {validationError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      {validationError}
                    </div>
                  )}

                  <div>
                     <label htmlFor="title" className="block text-sm font-black text-slate-900 mb-2">Judul Artikel <span className="text-red-500">*</span></label>
                     <input 
                       id="title"
                       name="title" 
                       value={title}
                       onChange={e => setTitle(e.target.value)}
                       placeholder="Masukkan judul artikel" 
                       className="w-full px-5 py-4 bg-white text-slate-900 rounded-2xl font-bold outline-none border border-slate-200 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-all shadow-sm" 
                     />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="date" className="block text-sm font-black text-slate-900 mb-2">Tanggal Publikasi <span className="text-red-500">*</span></label>
                      <input 
                        id="date"
                        name="date" 
                        type="date" 
                        value={dateStr}
                        onChange={e => setDateStr(e.target.value)}
                        className="w-full px-5 py-4 bg-white text-slate-900 rounded-2xl font-bold outline-none border border-slate-200 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-all shadow-sm" 
                      />
                    </div>
                    <div>
                      <label htmlFor="categoryId" className="block text-sm font-black text-slate-900 mb-2">Kategori <span className="text-red-500">*</span></label>
                      <div className="flex gap-2 w-full">
                        <select 
                          id="categoryId"
                          name="categoryId" 
                          value={categoryId}
                          onChange={e => setCategoryId(e.target.value)}
                          className="flex-1 w-full px-5 py-4 bg-white text-slate-900 rounded-2xl font-bold outline-none border border-slate-200 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-all cursor-pointer shadow-sm appearance-none"
                        >
                          <option value="" disabled>Pilih kategori artikel</option>
                          {categories.length === 0 ? (
                             <option value="" disabled>Belum ada kategori artikel.</option>
                          ) : (
                             categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                          )}
                        </select>
                      </div>
                    </div>
                                    </div>
                  
                  <div>
                     <label className="block text-sm font-black text-slate-900 mb-2">Tag</label>
                     <ArticleTagSelect tags={tags} selectedIds={tagIds} onChange={setTagIds} maxTags={5} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-black text-slate-900 mb-2">Gambar Utama (Thumbnail)</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-yellow-400 hover:bg-yellow-50 transition-colors relative cursor-pointer group">
                         <input type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                               if (file.size > 5 * 1024 * 1024) return alert('Ukuran gambar maksimal 5MB');
                               const reader = new FileReader();
                               reader.onload = e => setPreviewImage(e.target?.result as string);
                               reader.readAsDataURL(file);
                            }
                         }} />
                         {imagePreview ? (
                            <div className="relative inline-block w-full h-32 rounded-lg overflow-hidden bg-slate-100">
                               <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="text-white text-sm font-bold flex items-center gap-2"><Edit2 size={16}/> Ganti Gambar</span>
                               </div>
                            </div>
                         ) : (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                               <ImageIcon size={32} className="mb-2 opacity-50" />
                               <p className="text-sm font-bold">Pilih / Letakkan Gambar</p>
                               <p className="text-xs">JPG, PNG, WEBP (Max. 5MB)</p>
                            </div>
                         )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-900 mb-2">Lampiran (Opsional)</label>
                      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 min-h-[9.5rem] flex flex-col">
                         <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-500">{attachments.length + selectedFiles.length}/5 File Tersimpan</span>
                            <div className="relative">
                               <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={attachments.length + selectedFiles.length >= 5} onChange={e => {
                                  const files = Array.from(e.target.files || []);
                                  const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
                                  if (validFiles.length < files.length) alert('Beberapa file ditolak karena melebihi batas 10MB.');
                                  const available = 5 - (attachments.length + selectedFiles.length);
                                  setSelectedFiles(prev => [...prev, ...validFiles.slice(0, available)]);
                               }} />
                               <button type="button" disabled={attachments.length + selectedFiles.length >= 5} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 disabled:opacity-50">
                                 + Pilih File
                               </button>
                            </div>
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-2">
                            {attachments.map((a, i) => (
                               <div key={i} className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                  <span className="truncate flex-1 text-slate-600 pr-2">{a.originalName}</span>
                                  <button type="button" className="text-red-500 hover:bg-red-50 p-1 rounded" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}><Trash2 size={14}/></button>
                               </div>
                            ))}
                            {selectedFiles.map((f, i) => (
                               <div key={'f'+i} className="flex items-center justify-between bg-blue-50 px-3 py-2 border border-blue-100 rounded-lg text-sm">
                                  <span className="truncate flex-1 text-blue-700 pr-2 font-medium">{f.name}</span>
                                  <button type="button" className="text-blue-500 hover:bg-blue-100 p-1 rounded" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}><Trash2 size={14}/></button>
                               </div>
                            ))}
                            {attachments.length === 0 && selectedFiles.length === 0 && (
                               <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Belum ada file terlampir.</div>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-2">Isi Artikel <span className="text-red-500">*</span></label>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-yellow-200 focus-within:border-yellow-400 transition-all">
                       <div className="bg-slate-50 p-2 border-b border-slate-200 flex flex-wrap gap-1">
                         <button type="button" aria-label="Bold" onClick={() => execCommand('bold')} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-bold transition-colors">B</button>
                         <button type="button" aria-label="Italic" onClick={() => execCommand('italic')} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-serif italic transition-colors">I</button>
                         <div className="w-px h-6 bg-slate-300 mx-1 my-auto" />
                         <button type="button" aria-label="Heading 2" onClick={() => execCommand('formatBlock', 'H2')} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-bold text-sm transition-colors">H2</button>
                         <button type="button" aria-label="Heading 3" onClick={() => execCommand('formatBlock', 'H3')} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-bold text-sm transition-colors">H3</button>
                         <div className="w-px h-6 bg-slate-300 mx-1 my-auto" />
                         <button type="button" aria-label="Bullet List" onClick={() => execCommand('insertUnorderedList')} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                           <ul className="list-disc pl-3 text-xs leading-none"><li></li><li></li></ul>
                         </button>
                         <button type="button" aria-label="Numbered List" onClick={() => execCommand('insertOrderedList')} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                           <ol className="list-decimal pl-3 text-[10px] leading-none font-bold"><li></li><li></li></ol>
                         </button>
                       </div>
                       <div 
                         ref={editorRef} 
                         contentEditable 
                         className="p-6 min-h-[260px] max-h-[420px] overflow-y-auto outline-none bg-white text-slate-800 text-base leading-relaxed article-editor-content empty:before:content-['Tulis_isi_artikel_di_sini...'] empty:before:text-slate-400 empty:before:pointer-events-none" 
                         dangerouslySetInnerHTML={{ __html: editingItem?.content || '' }} 
                       />
                    </div>
                  </div>
               </form>
             </div>

             <div className="p-6 lg:p-8 border-t border-slate-100 bg-white shrink-0 flex flex-col sm:flex-row justify-end gap-3">
               <button 
                 type="button" 
                 disabled={isProcessing}
                 onClick={() => setShowForm(false)}
                 className="px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
               >
                 Batal
               </button>
               <button 
                 form="article-form"
                 type="submit" 
                 disabled={isProcessing} 
                 className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50 sm:w-auto w-full"
               >
                 {isProcessing ? (
                   <><Loader2 className="animate-spin" size={20} /> MENYIMPAN...</>
                 ) : (
                   <><Save size={20} /> SIMPAN ARTIKEL</>
                 )}
               </button>
             </div>
          </div>
        </div>
      )}
      <style>{`
        .article-editor-content h1, .article-editor-content h2, .article-editor-content h3 { font-weight: 900; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #0f172a; }
        .article-editor-content p { line-height: 1.8; margin-bottom: 1.25rem; color: #334155; }
        .article-editor-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.25rem; }
        .article-editor-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; }
      `}</style>
    </div>
  );
};

export default ArticleView;
