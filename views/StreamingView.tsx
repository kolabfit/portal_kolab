import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Youtube, Music, Radio, Play, AlertTriangle, Settings, X, Save, Loader2, HelpCircle,
  Trash2, Zap, Plus, Monitor, Search, Check, Clock, Layers
} from 'lucide-react';
import { UserProfile, AppAssets, UserRole } from '../types';
import { api } from '../api';
import { embedUrl, parseYoutube, youtubeThumbnail } from '../lib/streamingLinks';

interface StreamingViewProps {
  profile: UserProfile;
  assets: AppAssets;
  setProfile: (profile: UserProfile) => void;
  onShowAlert: (title: string, msg: string, type: any) => void;
  onRefresh: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type Tab = 'youtube' | 'spotify' | 'tvlive' | 'watch';
type CatalogItem = {
  key: string; kind: 'playlist' | 'tv'; title: string; thumbnail: string; category: string;
  status: 'APPROVED' | 'PENDING'; addedByName: string; canDelete: boolean; embed: string;
};

export const streamingCategories: Record<string, string> = {
  KULIAH: 'Materi Kuliah', WEBINAR: 'Webinar & Seminar', STARTUP: 'Startup & Bisnis', HIBURAN: 'Hiburan', LAINNYA: 'Lainnya'
};

const tabs: { id: Tab; label: string; icon: React.ElementType; active: string }[] = [
  { id: 'youtube', label: 'YouTube Saya', icon: Youtube, active: 'bg-red-600' },
  { id: 'spotify', label: 'Musik Saya', icon: Music, active: 'bg-emerald-600' },
  { id: 'tvlive', label: 'TV Live', icon: Monitor, active: 'bg-indigo-600' },
  { id: 'watch', label: 'Katalog Video', icon: Zap, active: 'bg-orange-600' }
];

const field = 'w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 focus:border-orange-300 focus:ring-4 focus:ring-orange-100';
const label = 'text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest';

const StreamingView: React.FC<StreamingViewProps> = ({ profile, assets, setProfile, onShowAlert, onRefresh, showConfirm }) => {
  const [activeTab, setActiveTab] = useState<Tab>('youtube');
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [adding, setAdding] = useState<'playlist' | 'tv' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftYoutube, setDraftYoutube] = useState(profile.youtube || '');
  const [draftSpotify, setDraftSpotify] = useState(profile.spotify || '');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [playing, setPlaying] = useState<CatalogItem | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [link, setLink] = useState('');

  const isAdmin = profile.role === UserRole.ADMIN;
  const isStudent = profile.role === UserRole.STUDENT;
  const ytEmbed = embedUrl(profile.youtube || assets.adminYoutube);
  const spEmbed = embedUrl(profile.spotify || assets.adminSpotify);
  const isFallback = activeTab === 'youtube' ? (!profile.youtube && !!assets.adminYoutube) : activeTab === 'spotify' ? (!profile.spotify && !!assets.adminSpotify) : false;
  const catalogTab = activeTab === 'watch' || activeTab === 'tvlive';
  const kind = activeTab === 'watch' ? 'playlist' : 'tv';

  const loadCatalog = useCallback(async () => {
    const res = await api.postData('getStreamingCatalog', {});
    if (res?.status !== 'success') return setCatalog([]);
    setCatalog([
      ...res.playlists.map((p: any) => ({ ...p, key: p.playlistId, kind: 'playlist', embed: `https://www.youtube.com/embed/videoseries?list=${p.playlistId}` })),
      ...res.tv.map((t: any) => ({ ...t, key: t.id, kind: 'tv', embed: `https://www.youtube.com/embed/${t.videoId}?autoplay=1` }))
    ]);
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const items = useMemo(() => (catalog ?? []).filter(item => item.kind === kind), [catalog, kind]);
  const pending = items.filter(item => item.status === 'PENDING');
  const shown = items.filter(item => item.status === 'APPROVED'
    && (!category || item.category === category)
    && item.title.toLowerCase().includes(search.toLowerCase()));

  const switchTab = (tab: Tab) => { setActiveTab(tab); setPlaying(null); setSearch(''); setCategory(''); };

  const settingsError = (value: string, name: string) => value.trim() && !embedUrl(value) ? `Link ${name} tidak dikenali. Tempel link dari YouTube atau Spotify.` : '';
  const ytError = settingsError(draftYoutube, 'YouTube');
  const spError = settingsError(draftSpotify, 'Spotify');

  const handleSaveSettings = async () => {
    if (ytError || spError) return;
    setIsSaving(true);
    const updatedProfile = { ...profile, youtube: draftYoutube.trim(), spotify: draftSpotify.trim() };
    const res = await api.postData('updateProfile', updatedProfile);
    if (res?.status === 'success') {
      setProfile(updatedProfile);
      onShowAlert('Tersimpan', 'Playlist pribadi Anda diperbarui.', 'success');
      setShowSettings(false);
      onRefresh();
    }
    setIsSaving(false);
  };

  const parsed = parseYoutube(link);
  const linkError = !link.trim() ? '' : !parsed ? 'Link YouTube tidak dikenali.'
    : adding === 'playlist' && !parsed.playlistId ? 'Link ini bukan playlist. Buka playlist di YouTube lalu salin link dari address bar.'
    : adding === 'tv' && !parsed.videoId ? 'Link ini bukan video. Salin link video atau siaran live-nya.' : '';
  const previewThumb = parsed?.videoId ? youtubeThumbnail(parsed.videoId) : '';

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!parsed || linkError) return;
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const common = { title: String(fd.get('title') || ''), category: String(fd.get('category') || 'LAINNYA'), thumbnail: previewThumb };
    const res = adding === 'playlist'
      ? await api.postData('manageYPlaylist', { type: 'add', data: { ...common, playlistId: parsed.playlistId, channelTitle: String(fd.get('channelTitle') || '') } })
      : await api.postData('manageTvLive', { type: 'add', data: { ...common, videoId: parsed.videoId } });
    if (res?.status === 'success') {
      onShowAlert(res.itemStatus === 'PENDING' ? 'Usulan terkirim' : 'Ditambahkan',
        res.itemStatus === 'PENDING' ? 'Item akan tampil setelah disetujui admin.' : 'Item sudah tampil di katalog.', 'success');
      setAdding(null);
      setLink('');
      loadCatalog();
      onRefresh();
    }
    setIsSaving(false);
  };

  const act = async (item: CatalogItem, type: 'delete' | 'approve') => {
    const res = await api.postData(item.kind === 'playlist' ? 'manageYPlaylist' : 'manageTvLive', { type, id: item.key });
    if (res?.status === 'success') {
      onShowAlert(type === 'approve' ? 'Disetujui' : 'Dihapus', type === 'approve' ? `"${item.title}" sekarang tampil di katalog.` : `"${item.title}" dihapus.`, 'success');
      if (playing?.key === item.key) setPlaying(null);
      loadCatalog();
      onRefresh();
    }
  };
  const remove = (item: CatalogItem) => showConfirm(item.status === 'PENDING' && isAdmin ? 'Tolak usulan?' : 'Hapus item?',
    `"${item.title}" akan dihapus dari katalog.`, () => act(item, 'delete'));

  const thumb = (item: CatalogItem) => item.thumbnail
    ? <img src={item.thumbnail} className="w-full h-full object-cover" alt="" loading="lazy" />
    : <div className="w-full h-full grid place-items-center bg-gradient-to-br from-slate-800 to-slate-950"><Layers size={36} className="text-white/40" /></div>;

  const card = (item: CatalogItem) => (
    <li key={item.key} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col">
      <button type="button" onClick={() => setPlaying(item)} className="group text-left focus:outline-none focus:ring-4 focus:ring-orange-200 rounded-t-[2rem]" aria-label={`Putar ${item.title}`}>
        <div className="relative aspect-video bg-slate-900 overflow-hidden">
          {thumb(item)}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity grid place-items-center"><Play size={44} className="text-white fill-white" /></div>
          {item.kind === 'tv' && <span className="absolute top-4 left-4 px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg">Live</span>}
        </div>
        <div className="p-5 pb-2 font-black text-slate-900 line-clamp-2 text-sm leading-snug">{item.title}</div>
      </button>
      <div className="px-5 pb-5 mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0 text-[11px] text-slate-500">
          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">{streamingCategories[item.category] ?? 'Lainnya'}</span>
          {item.addedByName && <span className="block truncate mt-1">Oleh {item.addedByName}</span>}
        </div>
        {item.canDelete && (
          <button type="button" onClick={() => remove(item)} aria-label={`Hapus ${item.title}`}
            className="shrink-0 p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"><Trash2 size={16} /></button>
        )}
      </div>
    </li>
  );

  const empty = (icon: React.ElementType, text: string, action?: React.ReactNode) => {
    const Icon = icon;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 gap-4 bg-slate-50">
        <Icon size={40} className="text-slate-300" />
        <p className="text-sm font-bold text-slate-500 max-w-sm">{text}</p>
        {action}
      </div>
    );
  };

  const openSettings = () => { setDraftYoutube(profile.youtube || ''); setDraftSpotify(profile.spotify || ''); setShowSettings(true); };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 pb-10 min-h-[calc(100vh-160px)] flex flex-col font-['Plus_Jakarta_Sans']">
      <div className="flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none truncate">Streaming Hub</h2>
            <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <Radio size={12} className="text-orange-600" /> Video, musik, dan siaran untuk belajar bersama
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setShowGuide(!showGuide)} aria-expanded={showGuide} aria-label="Panduan Streaming Hub"
              className={`p-2.5 lg:p-3 rounded-xl shadow-sm transition-all border ${showGuide ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:text-orange-600'}`}>
              <HelpCircle size={20} />
            </button>
            <button type="button" onClick={openSettings} aria-label="Atur playlist pribadi"
              className="p-2.5 lg:p-3 bg-white border border-slate-100 text-slate-500 hover:text-orange-600 rounded-xl shadow-sm transition-all">
              <Settings size={20} />
            </button>
            {catalogTab && (
              <button type="button" onClick={() => { setLink(''); setAdding(kind); }}
                className="p-2.5 lg:p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2">
                <Plus size={20} />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{isStudent ? 'Usulkan' : 'Tambah'}</span>
              </button>
            )}
          </div>
        </div>

        {showGuide && (
          <section aria-label="Panduan" className="rounded-[2rem] border border-orange-100 bg-orange-50/60 p-6 lg:p-8 text-sm text-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">Cara memakai Streaming Hub</h3>
              <button type="button" onClick={() => setShowGuide(false)} aria-label="Tutup panduan" className="p-2 rounded-xl text-slate-500 hover:bg-white"><X size={18} /></button>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              <li><b>YouTube Saya & Musik Saya</b> — putar playlist pribadi saat bekerja. Klik ikon ⚙, tempel link playlist YouTube atau Spotify, lalu simpan. Hanya Anda yang melihatnya. Jika kosong, playlist bawaan admin yang diputar.</li>
              <li><b>Katalog Video</b> — kumpulan playlist YouTube untuk semua anggota, misalnya materi kuliah, rekaman webinar, atau materi startup. Pilih kategori atau cari judul, lalu klik untuk memutar.</li>
              <li><b>TV Live</b> — siaran langsung YouTube, misalnya kanal berita atau live event kampus.</li>
              <li><b>Menambah ke katalog</b> — klik <b>{isStudent ? 'Usulkan' : 'Tambah'}</b>, tempel link dari YouTube, isi judul dan kategori. {isStudent
                ? 'Usulan mahasiswa tampil setelah disetujui admin.'
                : 'Item dosen dan admin langsung tampil.'} Anda bisa menghapus item yang Anda tambahkan sendiri.</li>
            </ul>
          </section>
        )}

        <div role="tablist" aria-label="Bagian Streaming Hub" className="flex bg-slate-100/50 p-1.5 rounded-2xl shadow-inner border border-slate-200/50 w-full overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, label: text, icon: Icon, active }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => switchTab(id)}
              className={`flex-1 min-w-[95px] px-3 py-3 rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === id ? active + ' text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={14} /> <span>{text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-4 relative min-w-0 min-h-0">
        {isFallback && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-800">Anda sedang memutar playlist bawaan admin. Klik ikon ⚙ untuk memakai playlist Anda sendiri.</p>
          </div>
        )}

        {catalogTab && pending.length > 0 && !playing && (
          <section aria-label="Menunggu persetujuan" className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 lg:p-6">
            <h3 className="flex items-center gap-2 font-black text-amber-900 mb-3"><Clock size={16} /> {isAdmin ? 'Usulan menunggu persetujuan' : 'Usulan Anda menunggu persetujuan admin'}</h3>
            <ul className="divide-y divide-amber-200">
              {pending.map(item => (
                <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 text-sm">
                    <span className="font-bold text-slate-900 block truncate">{item.title}</span>
                    <span className="text-slate-600">{streamingCategories[item.category] ?? 'Lainnya'}{item.addedByName && ` · oleh ${item.addedByName}`}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPlaying(item)} className="px-3 py-2 rounded-xl bg-white text-xs font-black text-slate-700 border border-amber-200">Pratinjau</button>
                    {isAdmin && <button type="button" onClick={() => act(item, 'approve')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1"><Check size={14} /> Setujui</button>}
                    {item.canDelete && <button type="button" onClick={() => remove(item)} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-black">{isAdmin ? 'Tolak' : 'Batalkan'}</button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="w-full bg-black shadow-2xl relative rounded-[2rem] border border-slate-900 overflow-hidden flex flex-col flex-1 min-h-[500px] lg:min-h-[70vh]">
          {playing ? (
            <>
              <iframe src={playing.embed} title={playing.title} referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 w-full h-full border-none bg-black"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
              <button type="button" onClick={() => setPlaying(null)} aria-label="Tutup pemutar dan kembali ke katalog"
                className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full z-20 border border-white/10">
                <X size={22} />
              </button>
            </>
          ) : activeTab === 'youtube' || activeTab === 'spotify' ? (
            (activeTab === 'youtube' ? ytEmbed : spEmbed) ? (
              <iframe src={(activeTab === 'youtube' ? ytEmbed : spEmbed)!} title={activeTab === 'youtube' ? 'Pemutar YouTube' : 'Pemutar Spotify'}
                referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 w-full h-full border-none bg-black"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" allowFullScreen />
            ) : empty(activeTab === 'youtube' ? Play : Music,
              `Belum ada playlist ${activeTab === 'youtube' ? 'YouTube' : 'Spotify'}. Tempel link playlist Anda di pengaturan.`,
              <button type="button" onClick={openSettings} className="px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest">Atur playlist</button>)
          ) : (
            <div className="absolute inset-0 bg-slate-50 overflow-y-auto p-5 lg:p-8 space-y-5">
              <label className="relative block">
                <span className="sr-only">Cari judul</span>
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="search" placeholder={activeTab === 'watch' ? 'Cari playlist…' : 'Cari siaran…'} value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-white rounded-2xl outline-none font-bold text-sm shadow-sm focus:ring-4 focus:ring-orange-100" />
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
                {[['', 'Semua'], ...Object.entries(streamingCategories)].map(([id, text]) => (
                  <button key={id || 'all'} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${category === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'}`}>{text}</button>
                ))}
              </div>
              {catalog === null ? (
                <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Memuat katalog…</p>
              ) : shown.length === 0 ? (
                <p className="text-sm text-slate-500 py-10 text-center">{items.some(item => item.status === 'APPROVED')
                  ? 'Tidak ada yang cocok dengan pencarian atau kategori ini.'
                  : `Katalog masih kosong. Klik ${isStudent ? 'Usulkan' : 'Tambah'} untuk mengisi.`}</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{shown.map(card)}</ul>
              )}
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div role="dialog" aria-modal="true" aria-label="Playlist pribadi" className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-7 lg:p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Playlist pribadi</h3>
              <button type="button" onClick={() => setShowSettings(false)} aria-label="Tutup" className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl"><X size={22} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-6">Tempel link playlist atau video dari YouTube, dan link playlist, album, atau podcast dari Spotify. Kosongkan untuk memakai playlist bawaan admin.</p>
            <div className="space-y-6">
              <label className="block space-y-2">
                <span className={label + ' flex items-center gap-2'}><Youtube size={14} className="text-red-600" /> Link YouTube</span>
                <input value={draftYoutube} onChange={e => setDraftYoutube(e.target.value)} placeholder="https://www.youtube.com/playlist?list=…" className={field} aria-invalid={!!ytError} />
                {ytError && <span role="alert" className="block text-xs font-bold text-red-600 ml-2">{ytError}</span>}
              </label>
              <label className="block space-y-2">
                <span className={label + ' flex items-center gap-2'}><Music size={14} className="text-emerald-600" /> Link Spotify</span>
                <input value={draftSpotify} onChange={e => setDraftSpotify(e.target.value)} placeholder="https://open.spotify.com/playlist/…" className={field} aria-invalid={!!spError} />
                {spError && <span role="alert" className="block text-xs font-bold text-red-600 ml-2">{spError}</span>}
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSettings(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100">Batal</button>
                <button type="button" onClick={handleSaveSettings} disabled={isSaving || !!ytError || !!spError}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div role="dialog" aria-modal="true" aria-label={adding === 'playlist' ? 'Tambah playlist' : 'Tambah siaran'} className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-7 lg:p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                {isStudent ? 'Usulkan' : 'Tambah'} {adding === 'playlist' ? 'playlist' : 'siaran live'}
              </h3>
              <button type="button" onClick={() => setAdding(null)} aria-label="Tutup" className="p-3 text-slate-400 hover:text-red-500"><X size={22} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <label className="block space-y-1.5">
                <span className={label}>Link YouTube</span>
                <input value={link} onChange={e => setLink(e.target.value)} required autoFocus aria-invalid={!!linkError}
                  placeholder={adding === 'playlist' ? 'https://www.youtube.com/playlist?list=…' : 'https://www.youtube.com/watch?v=…'} className={field} />
                {linkError && <span role="alert" className="block text-xs font-bold text-red-600 ml-2">{linkError}</span>}
              </label>
              {previewThumb && !linkError && <img src={previewThumb} alt="Pratinjau thumbnail" className="w-full aspect-video object-cover rounded-2xl" />}
              <label className="block space-y-1.5">
                <span className={label}>Judul</span>
                <input name="title" required maxLength={255} placeholder="Contoh: Pemrograman Web — Pertemuan 1" className={field} />
              </label>
              <label className="block space-y-1.5">
                <span className={label}>Kategori</span>
                <select name="category" defaultValue={adding === 'playlist' ? 'KULIAH' : 'LAINNYA'} className={field}>
                  {Object.entries(streamingCategories).map(([id, text]) => <option key={id} value={id}>{text}</option>)}
                </select>
              </label>
              {adding === 'playlist' && (
                <label className="block space-y-1.5">
                  <span className={label}>Nama channel (opsional)</span>
                  <input name="channelTitle" maxLength={255} placeholder="Nama channel YouTube" className={field} />
                </label>
              )}
              {isStudent && <p className="text-xs text-slate-600">Usulan akan tampil di katalog setelah disetujui admin.</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAdding(null)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100">Batal</button>
                <button type="submit" disabled={isSaving || !parsed || !!linkError}
                  className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-50">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {isStudent ? 'Kirim usulan' : 'Simpan'}
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
