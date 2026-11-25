import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Youtube, Music, Radio, Play, X, Save, Loader2, HelpCircle, Trash2, Plus, Search, Check, Clock, Pencil, Lock, Users
} from 'lucide-react';
import { UserProfile, AppAssets, UserRole } from '../types';
import { api } from '../api';
import { parseStreamingLink } from '../api/lib/streamingLinks.js';

interface StreamingViewProps {
  profile: UserProfile;
  assets: AppAssets;
  setProfile: (profile: UserProfile) => void;
  onShowAlert: (title: string, msg: string, type: any) => void;
  onRefresh: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type Item = {
  id: string; provider: 'YOUTUBE' | 'SPOTIFY'; kind: string; url: string; embedUrl: string; title: string; thumbnail: string;
  category: string; visibility: 'PRIVATE' | 'SHARED'; status: 'APPROVED' | 'PENDING'; ownerName: string; mine: boolean; canEdit: boolean;
};
type Tab = 'mine' | 'shared';
type Draft = { id?: string; link: string; title: string; category: string; visibility: 'PRIVATE' | 'SHARED' };

export const streamingCategories: Record<string, string> = {
  EDUKASI: 'Edukasi', MUSIK: 'Musik', PODCAST: 'Podcast', HIBURAN: 'Hiburan', INSPIRASI: 'Inspirasi',
  BISNIS: 'Startup & Bisnis', EVENT: 'Event & Webinar', LIVE: 'Siaran Live', LAINNYA: 'Lainnya'
};
const providers: Record<string, string> = { YOUTUBE: 'YouTube', SPOTIFY: 'Spotify' };

const field = 'w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 focus:border-orange-300 focus:ring-4 focus:ring-orange-100';
const label = 'text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest';
const chip = (on: boolean) => `px-4 py-2 rounded-xl text-xs font-black transition-all ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'}`;

const StreamingView: React.FC<StreamingViewProps> = ({ profile, onShowAlert, showConfirm }) => {
  const [tab, setTab] = useState<Tab>('mine');
  const [showGuide, setShowGuide] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [provider, setProvider] = useState('');
  const [playing, setPlaying] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);

  const isAdmin = profile.role === UserRole.ADMIN;
  const isStudent = profile.role === UserRole.STUDENT;

  const load = useCallback(async () => {
    const res = await api.postData('getStreamingItems', {});
    setItems(res?.status === 'success' ? res.items : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const inTab = useMemo(() => (items ?? []).filter(item => tab === 'mine' ? item.mine : item.visibility === 'SHARED'), [items, tab]);
  const pending = tab === 'shared' ? inTab.filter(item => item.status === 'PENDING') : [];
  const shown = inTab.filter(item => (tab === 'mine' || item.status === 'APPROVED')
    && (!category || item.category === category) && (!provider || item.provider === provider)
    && item.title.toLowerCase().includes(search.toLowerCase()));

  const switchTab = (next: Tab) => { setTab(next); setPlaying(null); setSearch(''); setCategory(''); setProvider(''); };

  const parsed = draft ? parseStreamingLink(draft.link) : null;
  const linkError = draft?.link.trim() && !parsed ? 'Link tidak dikenali. Tempel link dari YouTube (video, playlist, live) atau Spotify (playlist, album, lagu, podcast).' : '';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !parsed) return;
    setIsSaving(true);
    const data = { link: draft.link, title: draft.title, category: draft.category, visibility: draft.visibility };
    const res = await api.postData('manageStreamingItem', draft.id ? { type: 'edit', id: draft.id, data } : { type: 'add', data });
    if (res?.status === 'success') {
      onShowAlert(res.itemStatus === 'PENDING' ? 'Menunggu persetujuan' : 'Tersimpan',
        res.itemStatus === 'PENDING' ? 'Item tersimpan di koleksi Anda dan tampil di katalog setelah disetujui admin.' : 'Item tersimpan.', 'success');
      setDraft(null);
      load();
    }
    setIsSaving(false);
  };

  const act = async (item: Item, type: 'delete' | 'approve') => {
    const res = await api.postData('manageStreamingItem', { type, id: item.id });
    if (res?.status === 'success') {
      onShowAlert(type === 'approve' ? 'Disetujui' : 'Dihapus', `"${item.title}" ${type === 'approve' ? 'sekarang tampil di katalog' : 'dihapus'}.`, 'success');
      if (playing?.id === item.id) setPlaying(null);
      load();
    }
  };
  const remove = (item: Item) => showConfirm(item.status === 'PENDING' && isAdmin && !item.mine ? 'Tolak usulan?' : 'Hapus item?',
    `"${item.title}" akan dihapus.`, () => act(item, 'delete'));
  const edit = (item: Item) => setDraft({ id: item.id, link: item.url, title: item.title, category: item.category, visibility: item.visibility });
  const create = () => setDraft({ link: '', title: '', category: 'LAINNYA', visibility: tab === 'shared' ? 'SHARED' : 'PRIVATE' });

  const badge = (item: Item) => {
    if (item.status === 'PENDING') return <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-800"><Clock size={11} /> Menunggu persetujuan</span>;
    if (tab === 'mine') return item.visibility === 'SHARED'
      ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700"><Users size={11} /> Dibagikan</span>
      : <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-600"><Lock size={11} /> Pribadi</span>;
    return null;
  };

  const card = (item: Item) => (
    <li key={item.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col">
      <button type="button" onClick={() => setPlaying(item)} aria-label={`Putar ${item.title}`}
        className="group text-left focus:outline-none focus:ring-4 focus:ring-orange-200 rounded-t-[2rem]">
        <div className="relative aspect-video overflow-hidden">
          {item.thumbnail
            ? <img src={item.thumbnail} className="w-full h-full object-cover" alt="" loading="lazy" />
            : <div className={`w-full h-full grid place-items-center bg-gradient-to-br ${item.provider === 'SPOTIFY' ? 'from-emerald-500 to-emerald-900' : 'from-red-500 to-red-900'}`}>
                {item.provider === 'SPOTIFY' ? <Music size={40} className="text-white/80" /> : <Youtube size={40} className="text-white/80" />}
              </div>}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity grid place-items-center"><Play size={44} className="text-white fill-white" /></div>
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-white text-[9px] font-black uppercase rounded-lg ${item.provider === 'SPOTIFY' ? 'bg-emerald-600' : 'bg-red-600'}`}>{providers[item.provider]}</span>
        </div>
        <div className="p-5 pb-2 font-black text-slate-900 line-clamp-2 text-sm leading-snug">{item.title}</div>
      </button>
      <div className="px-5 pb-5 mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0 text-[11px] text-slate-500 space-y-1">
          <div className="flex flex-wrap gap-1">
            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">{streamingCategories[item.category] ?? 'Lainnya'}</span>
            {badge(item)}
          </div>
          {tab === 'shared' && item.ownerName && <span className="block truncate">Dibagikan oleh {item.ownerName}</span>}
        </div>
        {item.canEdit && (
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => edit(item)} aria-label={`Ubah ${item.title}`}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"><Pencil size={15} /></button>
            <button type="button" onClick={() => remove(item)} aria-label={`Hapus ${item.title}`}
              className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"><Trash2 size={15} /></button>
          </div>
        )}
      </div>
    </li>
  );

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 pb-10 font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between w-full gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none truncate">Streaming Hub</h2>
          <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
            <Radio size={12} className="text-orange-600" /> Simpan dan bagikan video, musik, dan podcast favorit
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setShowGuide(!showGuide)} aria-expanded={showGuide} aria-label="Panduan Streaming Hub"
            className={`p-2.5 lg:p-3 rounded-xl shadow-sm transition-all border ${showGuide ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:text-orange-600'}`}>
            <HelpCircle size={20} />
          </button>
          <button type="button" onClick={create} className="p-2.5 lg:p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2">
            <Plus size={20} /><span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Tambah</span>
          </button>
        </div>
      </div>

      {showGuide && (
        <section aria-label="Panduan" className="rounded-[2rem] border border-orange-100 bg-orange-50/60 p-6 lg:p-8 text-sm text-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-lg">Cara memakai Streaming Hub</h3>
            <button type="button" onClick={() => setShowGuide(false)} aria-label="Tutup panduan" className="p-2 rounded-xl text-slate-500 hover:bg-white"><X size={18} /></button>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            <li><b>Tambah</b> — tempel link YouTube (video, playlist, atau live) atau Spotify (playlist, album, lagu, atau podcast). Beri judul dan kategori. Jumlahnya tidak dibatasi satu.</li>
            <li><b>Koleksi Saya</b> — semua item yang Anda simpan. Item <b>Pribadi</b> hanya terlihat oleh Anda.</li>
            <li><b>Katalog Bersama</b> — item yang dibagikan anggota: musik kerja, podcast, rekaman acara, materi, hiburan, dan apa saja yang bermanfaat. Saring dengan platform atau kategori.</li>
            <li><b>Membagikan</b> — pilih <b>Bagikan ke Katalog Bersama</b> saat menambah atau mengubah item. {isStudent
              ? 'Item mahasiswa tampil di katalog setelah disetujui admin.'
              : 'Item dosen dan admin langsung tampil.'} Anda bisa mengubah atau menghapus item milik Anda kapan saja.</li>
          </ul>
        </section>
      )}

      <div role="tablist" aria-label="Bagian Streaming Hub" className="flex bg-slate-100/50 p-1.5 rounded-2xl shadow-inner border border-slate-200/50 w-full">
        {([['mine', 'Koleksi Saya', Lock], ['shared', 'Katalog Bersama', Users]] as const).map(([id, text, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => switchTab(id)}
            className={`flex-1 px-3 py-3 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14} /> {text}
          </button>
        ))}
      </div>

      {pending.length > 0 && !playing && (
        <section aria-label="Menunggu persetujuan" className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 lg:p-6">
          <h3 className="flex items-center gap-2 font-black text-amber-900 mb-3"><Clock size={16} /> Usulan menunggu persetujuan</h3>
          <ul className="divide-y divide-amber-200">
            {pending.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <span className="font-bold text-slate-900 block truncate">{item.title}</span>
                  <span className="text-slate-600">{providers[item.provider]} · {streamingCategories[item.category] ?? 'Lainnya'}{item.ownerName && ` · oleh ${item.ownerName}`}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPlaying(item)} className="px-3 py-2 rounded-xl bg-white text-xs font-black text-slate-700 border border-amber-200">Pratinjau</button>
                  {isAdmin && <button type="button" onClick={() => act(item, 'approve')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1"><Check size={14} /> Setujui</button>}
                  {item.canEdit && <button type="button" onClick={() => remove(item)} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-black">{isAdmin && !item.mine ? 'Tolak' : 'Batalkan'}</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {playing ? (
        <section aria-label={`Memutar ${playing.title}`} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-slate-900 truncate">{playing.title}</h3>
            <button type="button" onClick={() => setPlaying(null)} className="shrink-0 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center gap-2"><X size={14} /> Tutup pemutar</button>
          </div>
          <div className={`relative w-full overflow-hidden rounded-[2rem] bg-black shadow-2xl ${playing.provider === 'SPOTIFY' ? 'h-[480px]' : 'aspect-video'}`}>
            <iframe src={playing.embedUrl} title={playing.title} referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 w-full h-full border-none" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <label className="relative block">
            <span className="sr-only">Cari judul</span>
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Cari judul…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-white rounded-2xl outline-none font-bold text-sm shadow-sm border border-slate-100 focus:ring-4 focus:ring-orange-100" />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter platform">
            {[['', 'Semua platform'], ...Object.entries(providers)].map(([id, text]) => (
              <button key={id || 'all'} type="button" aria-pressed={provider === id} onClick={() => setProvider(id)} className={chip(provider === id)}>{text}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
            {[['', 'Semua kategori'], ...Object.entries(streamingCategories)].map(([id, text]) => (
              <button key={id || 'all'} type="button" aria-pressed={category === id} onClick={() => setCategory(id)} className={chip(category === id)}>{text}</button>
            ))}
          </div>
          {items === null ? (
            <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Memuat…</p>
          ) : shown.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center space-y-4">
              <p className="text-sm font-bold text-slate-500">{inTab.length
                ? 'Tidak ada yang cocok dengan pencarian atau filter ini.'
                : tab === 'mine' ? 'Koleksi Anda masih kosong. Tambahkan video, playlist, atau podcast favorit Anda.' : 'Belum ada yang dibagikan. Jadilah yang pertama.'}</p>
              {!inTab.length && <button type="button" onClick={create} className="px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest">Tambah</button>}
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{shown.map(card)}</ul>
          )}
        </section>
      )}

      {draft && (
        <div role="dialog" aria-modal="true" aria-label={draft.id ? 'Ubah item' : 'Tambah item'} className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-7 lg:p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{draft.id ? 'Ubah item' : 'Tambah item'}</h3>
              <button type="button" onClick={() => setDraft(null)} aria-label="Tutup" className="p-3 text-slate-400 hover:text-red-500"><X size={22} /></button>
            </div>
            <form onSubmit={save} className="space-y-5">
              <label className="block space-y-1.5">
                <span className={label}>Link YouTube atau Spotify</span>
                <input value={draft.link} onChange={e => setDraft({ ...draft, link: e.target.value })} required autoFocus aria-invalid={!!linkError}
                  placeholder="https://www.youtube.com/… atau https://open.spotify.com/…" className={field} />
                {linkError
                  ? <span role="alert" className="block text-xs font-bold text-red-600 ml-2">{linkError}</span>
                  : parsed && <span className="block text-xs font-bold text-emerald-700 ml-2">{providers[parsed.provider]} {parsed.kind} terdeteksi.</span>}
              </label>
              {parsed?.thumbnail && <img src={parsed.thumbnail} alt="Pratinjau thumbnail" className="w-full aspect-video object-cover rounded-2xl" />}
              <label className="block space-y-1.5">
                <span className={label}>Judul</span>
                <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} required maxLength={255} placeholder="Contoh: Lo-fi untuk fokus kerja" className={field} />
              </label>
              <label className="block space-y-1.5">
                <span className={label}>Kategori</span>
                <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} className={field}>
                  {Object.entries(streamingCategories).map(([id, text]) => <option key={id} value={id}>{text}</option>)}
                </select>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-600" checked={draft.visibility === 'SHARED'}
                  onChange={e => setDraft({ ...draft, visibility: e.target.checked ? 'SHARED' : 'PRIVATE' })} />
                <span><b>Bagikan ke Katalog Bersama</b>
                  <span className="block text-slate-600">{isStudent ? 'Tampil untuk semua anggota setelah disetujui admin.' : 'Langsung tampil untuk semua anggota.'} Jika tidak dicentang, hanya Anda yang melihatnya.</span>
                </span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDraft(null)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100">Batal</button>
                <button type="submit" disabled={isSaving || !parsed}
                  className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-50">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingView;
