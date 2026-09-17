
import React, { useState, useMemo } from 'react';
import { 
  Youtube, Music, Radio, Play, ExternalLink, Info, AlertTriangle, 
  Settings, X, Save, Loader2, HelpCircle, LayoutGrid, Trash2, RefreshCw, Zap, Plus, Monitor, Search, Filter,
  Layers, Video, Image as ImageIcon
} from 'lucide-react';
import { UserProfile, AppAssets, UserRole, YoutubePlaylist, TvChannel } from '../types';
import { api } from '../api';

interface StreamingViewProps {
  profile: UserProfile;
  assets: AppAssets;
  setProfile: (profile: UserProfile) => void;
  onShowAlert: (title: string, msg: string, type: any) => void;
  onRefresh: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

/**
 * StreamingView - Multimedia Hub dengan Advanced Smart Embed Engine V18.9.
 * Mengelola transmisi global dan personal untuk YouTube, Spotify, dan Live TV.
 */
const StreamingView: React.FC<StreamingViewProps> = ({ profile, assets, setProfile, onShowAlert, onRefresh, showConfirm }) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify' | 'watch' | 'tvlive'>('youtube');
  const [showSettings, setShowSettings] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [showAddResource, setShowAddResource] = useState<'playlist' | 'tv' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [draftYoutube, setDraftYoutube] = useState(profile.youtube || '');
  const [draftSpotify, setDraftSpotify] = useState(profile.spotify || '');

  const [watchSearch, setWatchSearch] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<YoutubePlaylist | null>(null);
  const [selectedTv, setSelectedTv] = useState<TvChannel | null>(null);

  const isAdmin = profile.role === UserRole.ADMIN;
  const ytEmbed = profile.youtube || assets.adminYoutube;
  const spEmbed = profile.spotify || assets.adminSpotify;
  const yPlaylists = assets.yPlaylists || [];
  const tvChannels = assets.tvChannels || [];

  const isFallback = activeTab === 'youtube' ? (!profile.youtube && assets.adminYoutube) : (activeTab === 'spotify' ? (!profile.spotify && assets.adminSpotify) : false);
  
  const filteredPlaylists = useMemo(() => {
    return yPlaylists.filter(p => p.title.toLowerCase().includes(watchSearch.toLowerCase()));
  }, [yPlaylists, watchSearch]);

  const filteredTv = useMemo(() => {
    return tvChannels.filter(tv => tv.title.toLowerCase().includes(watchSearch.toLowerCase()));
  }, [tvChannels, watchSearch]);

  /**
   * Advanced Smart Renderer V18.9:
   * Mengonversi format URL mentah menjadi format EMBED yang dapat ditampilkan di portal.
   * Mendukung: YouTube Playlist, Video, Short Link, Spotify Playlist, dan Iframe mentah.
   */
  const renderMultimedia = (content?: string) => {
    if (!content || content.trim() === '') return null;
    let trimmed = content.trim();
    
    // DETEKSI 1: Jika input adalah tag <iframe> utuh
    if (trimmed.toLowerCase().startsWith('<iframe')) {
      return (
        <div 
          className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!border-none [&_iframe]:!absolute [&_iframe]:!inset-0" 
          dangerouslySetInnerHTML={{ __html: trimmed }} 
        />
      );
    }

    // DETEKSI 2: Jika input adalah URL
    let finalUrl = trimmed;
    try {
      // Logic Spotify
      if (finalUrl.includes('spotify.com')) {
        if (!finalUrl.includes('/embed')) {
          // Ganti link share standar menjadi link embed
          finalUrl = finalUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
          // Buang parameter query share jika ada
          if (finalUrl.includes('?')) finalUrl = finalUrl.split('?')[0];
        }
      } 
      // Logic YouTube Playlist
      else if (finalUrl.includes('youtube.com/playlist?list=')) {
        const urlObj = new URL(finalUrl);
        const listId = urlObj.searchParams.get('list');
        finalUrl = `https://www.youtube.com/embed/videoseries?list=${listId}`;
      }
      // Logic YouTube Video Standard
      else if (finalUrl.includes('youtube.com/watch?v=')) {
        const urlObj = new URL(finalUrl);
        const videoId = urlObj.searchParams.get('v');
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      // Logic YouTube Short Link (youtu.be)
      else if (finalUrl.includes('youtu.be/')) {
        const videoId = finalUrl.split('/').pop()?.split('?')[0];
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      // Logic YouTube Mobile
      else if (finalUrl.includes('m.youtube.com/watch?v=')) {
         const urlObj = new URL(finalUrl);
         const videoId = urlObj.searchParams.get('v');
         finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) {
      console.warn("URL Parsing failed, using original input.");
    }

    return (
      <iframe 
        src={finalUrl} 
        className="absolute inset-0 w-full h-full border-none bg-black shadow-2xl" 
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
        loading="lazy"
        allowFullScreen 
      />
    );
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const updatedProfile = { ...profile, youtube: draftYoutube, spotify: draftSpotify };
    const res = await api.postData('updateProfile', updatedProfile);
    if (res?.status === 'success') {
      setProfile(updatedProfile);
      onShowAlert('Hub Synced', 'Playlist multimedia diperbarui.', 'success');
      setShowSettings(false);
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleAddResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    
    if (showAddResource === 'playlist') {
      const res = await api.postData('manageYPlaylist', {
        type: 'add',
        data: {
          playlistId: fd.get('playlistId'),
          title: fd.get('title'),
          thumbnail: fd.get('thumbnail'),
          channelTitle: fd.get('channelTitle')
        }
      });
      if (res?.status === 'success') {
        onShowAlert('Resource Added', 'YouTube Playlist registered.', 'success');
        setShowAddResource(null);
        onRefresh();
      }
    } else {
      const res = await api.postData('manageTvLive', {
        type: 'add',
        data: {
          title: fd.get('title'),
          videoId: fd.get('videoId'),
          thumbnail: fd.get('thumbnail')
        }
      });
      if (res?.status === 'success') {
        onShowAlert('Resource Added', 'TV Live Channel registered.', 'success');
        setShowAddResource(null);
        onRefresh();
      }
    }
    setIsSaving(false);
  };

  const handleDeleteResource = (type: 'playlist' | 'tv', id: string, name: string) => {
    showConfirm('Delete Resource?', `Remove "${name}" from global hub?`, async () => {
      const endpoint = type === 'playlist' ? 'manageYPlaylist' : 'manageTvLive';
      const res = await api.postData(endpoint, { type: 'delete', id });
      if (res?.status === 'success') {
        onShowAlert('Resource Purged', 'Hub updated.', 'success');
        onRefresh();
      }
    });
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700 pb-10 min-h-[calc(100vh-160px)] flex flex-col font-['Plus_Jakarta_Sans']">
      
      {/* HUB HEADER & CONTROLS */}
      <div className="flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between w-full">
           <div className="min-w-0">
              <h2 className="text-2xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none truncate">Streaming Hub</h2>
              <p className="text-slate-500 font-bold text-[7px] lg:text-[9px] uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <Radio size={12} className="text-orange-600 animate-pulse" /> TRANSMISSION NODE ONLINE
              </p>
           </div>
           
           <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowProtocol(!showProtocol)} className={`p-2.5 lg:p-3 rounded-xl shadow-sm transition-all border ${showProtocol ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-orange-600'}`}>
                <HelpCircle size={20} />
              </button>

              <button 
                 onClick={() => {
                   setDraftYoutube(profile.youtube || '');
                   setDraftSpotify(profile.spotify || '');
                   setShowSettings(true);
                 }}
                 className="p-2.5 lg:p-3 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-xl shadow-sm transition-all"
              >
                 <Settings size={20} />
              </button>

              {isAdmin && (activeTab === 'watch' || activeTab === 'tvlive') && (
                <button 
                  onClick={() => setShowAddResource(activeTab === 'watch' ? 'playlist' : 'tv')}
                  className="p-2.5 lg:p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Input</span>
                </button>
              )}
           </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex bg-slate-100/50 p-1.5 rounded-2xl shadow-inner border border-slate-200/50 w-full overflow-x-auto scrollbar-hide">
          <button onClick={() => { setActiveTab('youtube'); setSelectedPlaylist(null); setSelectedTv(null); }} className={`flex-1 min-w-[85px] px-3 py-3 rounded-xl font-black text-[8px] lg:text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'youtube' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <Youtube size={14} /> <span className="hidden xs:inline">Stream</span>
          </button>
          <button onClick={() => { setActiveTab('spotify'); setSelectedPlaylist(null); setSelectedTv(null); }} className={`flex-1 min-w-[85px] px-3 py-3 rounded-xl font-black text-[8px] lg:text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'spotify' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <Music size={14} /> <span className="hidden xs:inline">Music</span>
          </button>
          <button onClick={() => { setActiveTab('tvlive'); setSelectedPlaylist(null); setSelectedTv(null); }} className={`flex-1 min-w-[85px] px-3 py-3 rounded-xl font-black text-[8px] lg:text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'tvlive' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <Monitor size={14} /> <span className="hidden xs:inline">TV Live</span>
          </button>
          <button onClick={() => { setActiveTab('watch'); setSelectedPlaylist(null); setSelectedTv(null); }} className={`flex-1 min-w-[85px] px-3 py-3 rounded-xl font-black text-[8px] lg:text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'watch' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <Zap size={14} /> <span className="hidden xs:inline">Watch</span>
          </button>
        </div>
      </div>

      {/* RENDER AREA */}
      <div className="flex-1 flex flex-col space-y-4 relative min-w-0 min-h-0">
        {isFallback && !showProtocol && (activeTab === 'youtube' || activeTab === 'spotify') && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-500 shrink-0 shadow-sm">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <p className="text-[9px] lg:text-[11px] font-bold text-amber-700 leading-tight">Melihat transmisi default Administrator. Personalisasikan playlist Anda di menu Settings.</p>
          </div>
        )}

        {/* MAIN EMBED CONTAINER: Menggunakan min-height progresif untuk full coverage */}
        <div className="w-full bg-black shadow-2xl relative rounded-[2rem] border border-slate-900 overflow-hidden flex flex-col transition-all duration-500 flex-1 min-h-[500px] lg:min-h-[75vh]">
          {activeTab === 'youtube' ? (
            ytEmbed ? renderMultimedia(ytEmbed) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 space-y-6 bg-slate-50">
                  <Play size={40} className="text-slate-200" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">YouTube Node Offline</p>
              </div>
            )
          ) : activeTab === 'spotify' ? (
            spEmbed ? renderMultimedia(spEmbed) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 space-y-6 bg-slate-50">
                  <Music size={40} className="text-slate-200" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Spotify Node Offline</p>
              </div>
            )
          ) : activeTab === 'tvlive' ? (
            selectedTv ? (
               renderMultimedia(`https://www.youtube.com/embed/${selectedTv.videoId}?autoplay=1&modestbranding=1`)
            ) : (
              <div className="absolute inset-0 bg-slate-50 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
                 <div className="flex flex-col md:flex-row gap-4 items-center mb-10 shrink-0">
                    <div className="relative flex-1 group w-full">
                      <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="text" placeholder="Search live channels..." value={watchSearch} onChange={e => setWatchSearch(e.target.value)} className="w-full pl-16 pr-8 py-4.5 bg-white rounded-[1.5rem] outline-none font-bold text-sm shadow-sm focus:ring-4 focus:ring-indigo-100 transition-all" />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                    {filteredTv.map(tv => (
                      <div key={tv.id} className="relative group">
                        <div onClick={() => setSelectedTv(tv)} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-pointer group-hover:-translate-y-2 duration-500">
                          <div className="relative aspect-video bg-slate-900 overflow-hidden">
                            <img src={tv.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={tv.title} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Play size={48} className="text-white fill-white" /></div>
                            <div className="absolute top-5 left-5 px-4 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase rounded-xl flex items-center gap-2 shadow-xl"><div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> LIVE</div>
                          </div>
                          <div className="p-6 font-black text-slate-900 line-clamp-2 text-sm leading-snug">{tv.title}</div>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteResource('tv', tv.id, tv.title); }}
                            className="absolute -top-3 -right-3 p-3 bg-red-600 text-white rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
            )
          ) : (
             selectedPlaylist ? (
                renderMultimedia(`https://www.youtube.com/embed/videoseries?list=${selectedPlaylist.playlistId}`)
             ) : (
               <div className="absolute inset-0 bg-slate-50 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
                  <div className="flex flex-col md:flex-row gap-4 items-center mb-10 shrink-0">
                    <div className="relative flex-1 group w-full">
                      <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="text" placeholder="Search playlists..." value={watchSearch} onChange={e => setWatchSearch(e.target.value)} className="w-full pl-16 pr-8 py-4.5 bg-white rounded-[1.5rem] outline-none font-bold text-sm shadow-sm focus:ring-4 focus:ring-orange-100 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                    {filteredPlaylists.map(p => (
                      <div key={p.playlistId} className="relative group">
                        <div onClick={() => setSelectedPlaylist(p)} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-pointer group-hover:-translate-y-2 duration-500">
                          <div className="relative aspect-video bg-slate-900 overflow-hidden">
                            <img src={p.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={p.title} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Play size={48} className="text-white fill-white" /></div>
                          </div>
                          <div className="p-6 font-black text-slate-900 line-clamp-2 text-sm leading-snug">{p.title}</div>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteResource('playlist', p.playlistId, p.title); }}
                            className="absolute -top-3 -right-3 p-3 bg-red-600 text-white rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
             )
          )}
          
          {(selectedTv || selectedPlaylist) && (
            <button 
              onClick={() => { setSelectedTv(null); setSelectedPlaylist(null); }}
              className="absolute top-8 right-8 p-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all z-20 border border-white/10 shadow-2xl active:scale-90"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      {/* MODAL: SETTINGS (Per-User Multimedia Override) */}
      {showSettings && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 lg:p-12 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200"><Settings size={24} /></div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Transmission Config</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><X size={24} /></button>
             </div>
             <div className="space-y-8">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-500 mb-6 leading-relaxed italic border-l-4 border-orange-500 pl-4">Masukkan URL Playlist YouTube, Spotify, atau kode iframe utuh. Sistem akan mendeteksi format secara cerdas.</p>
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase px-2 flex items-center gap-2 tracking-widest"><Youtube size={14} className="text-red-600" /> YouTube Endpoint</label>
                         <textarea value={draftYoutube} onChange={e => setDraftYoutube(e.target.value)} placeholder='Contoh: https://www.youtube.com/playlist?list=... atau https://youtu.be/...' className="w-full px-6 py-5 bg-white border border-slate-100 rounded-2xl font-mono text-[11px] focus:ring-4 focus:ring-orange-100 outline-none resize-none shadow-sm min-h-[120px] transition-all" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase px-2 flex items-center gap-2 tracking-widest"><Music size={14} className="text-emerald-600" /> Spotify Endpoint</label>
                         <textarea value={draftSpotify} onChange={e => setDraftSpotify(e.target.value)} placeholder='Contoh: https://open.spotify.com/playlist/...' className="w-full px-6 py-5 bg-white border border-slate-100 rounded-2xl font-mono text-[11px] focus:ring-4 focus:ring-emerald-100 outline-none resize-none shadow-sm min-h-[120px] transition-all" />
                      </div>
                   </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setShowSettings(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                  <button onClick={handleSaveSettings} disabled={isSaving} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Sync Transmission
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD RESOURCE (Admin Only) */}
      {showAddResource && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-8 lg:p-12 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100"><Layers size={24} /></div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Add Hub Resource</h3>
                </div>
                <button onClick={() => setShowAddResource(null)} className="p-3 text-slate-300 hover:text-red-500 transition-all"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleAddResource} className="space-y-6">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Resource Display Name</label>
                    <input name="title" required placeholder="Judul Tampilan..." className="w-full px-6 py-4.5 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 shadow-inner" />
                  </div>
                  
                  {showAddResource === 'playlist' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">YouTube Playlist ID</label>
                        <input name="playlistId" required placeholder="e.g. PLr_f6_Xp1..." className="w-full px-6 py-4.5 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 shadow-inner" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Origin Channel (Optional)</label>
                        <input name="channelTitle" placeholder="Nama Channel YouTube..." className="w-full px-6 py-4.5 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 shadow-inner" />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">YouTube LIVE Video ID</label>
                      <input name="videoId" required placeholder="e.g. jfKfPfyJRdk" className="w-full px-6 py-4.5 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 shadow-inner" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Thumbnail Endpoint URL</label>
                    <input name="thumbnail" required placeholder="https://..." className="w-full px-6 py-4.5 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 shadow-inner" />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowAddResource(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-orange-700 active:scale-95 transition-all">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Deploy Hub Node
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
