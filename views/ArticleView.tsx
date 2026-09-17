
import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Tag, 
  Save, X, Image as ImageIcon, RefreshCw,
  Bold, Italic, Underline, Type, Palette, Tags, Loader2, Video, Link as LinkIcon, 
  Calendar, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, User, ChevronLeft
} from 'lucide-react';
import { Article, ArticleCategory } from '../types';
import { api } from '../api';
import Modal from '../components/Modal';

interface ArticleViewProps {
  articles: Article[];
  categories: ArticleCategory[];
  isAdmin: boolean;
  currentUser: string;
  onAction: (type: 'add' | 'edit' | 'delete', id?: string, data?: any) => void | Promise<boolean>;
  onManageCategories: () => void;
  onRefresh?: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const ArticleView: React.FC<ArticleViewProps> = ({ 
  articles, categories, isAdmin, currentUser, onAction, onRefresh, showConfirm, onManageCategories 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Article | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [imagePreview, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);


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
    const htmlContent = editorRef.current?.innerHTML || '';
    const articleId = editingItem?.id || `art-${Date.now()}`;
    let finalImageUrl = editingItem?.imageUrl || '';
    if (imagePreview && imagePreview.startsWith('data:')) {
      const res = await api.uploadFile(imagePreview, `${articleId}.png`, editingItem?.imageUrl, 'asetweb');
      if (res?.status === 'success') finalImageUrl = res.url;
      else { window.alert(res?.message || 'Upload gambar gagal.'); setIsProcessing(false); return; }
    }
    const data = {
      title: fd.get('title'), author: editingItem ? editingItem.author : currentUser,
      date: fd.get('date'), categoryId: fd.get('categoryId'), tags: String(fd.get('tags')).split(',').map(t => t.trim()),
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
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto scrollbar-hide">
             <div className="flex justify-between mb-8"><h3 className="text-3xl font-black text-slate-900">{editingItem ? 'Edit Artikel' : 'Entry Artikel Baru'}</h3><button onClick={() => setShowForm(false)} className="p-2 text-slate-400"><X size={24} /></button></div>
             <form onSubmit={handleSubmit} className="space-y-6">
                <input name="title" defaultValue={editingItem?.title} required placeholder="Article Title" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input name="date" type="date" defaultValue={editingItem?.date?.slice(0, 10) || new Date().toISOString().split('T')[0]} required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                  <>{isAdmin && <button type="button" onClick={onManageCategories}>Kelola kategori</button>}<select name="categoryId" defaultValue={editingItem?.categoryId} className="px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></>
                </div>
                <div className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden">
                   <div className="bg-slate-50 p-4 border-b flex gap-2"><button type="button" onClick={() => execCommand('bold')} className="p-2 bg-white rounded-lg shadow-sm">B</button><button type="button" onClick={() => execCommand('italic')} className="p-2 bg-white rounded-lg shadow-sm">I</button></div>
                   <div ref={editorRef} contentEditable className="p-12 min-h-[400px] outline-none bg-white" dangerouslySetInnerHTML={{ __html: editingItem?.content || '' }} />
                </div>
                <button type="submit" disabled={isProcessing} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest">{isProcessing ? <Loader2 className="animate-spin" /> : <Save />} Simpan & Sinkronisasi</button>
             </form>
          </div>
        </div>
      )}
      <style>{`
        .article-editor-content h1, .article-editor-content h2 { font-weight: 900; margin-top: 2rem; margin-bottom: 1rem; color: #0f172a; }
        .article-editor-content p { line-height: 1.8; margin-bottom: 1.5rem; color: #475569; }
      `}</style>
    </div>
  );
};

export default ArticleView;
