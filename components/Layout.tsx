
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, UserCircle, Calendar, Flag, Info, Megaphone,
  Settings, LogOut, Menu, Bell, Users, FolderOpen, Database, X, Clock, FileText, Radio, Tags, Building2, FileStack, Award
} from 'lucide-react';
import { AppNotification, UserRole } from '../types';
import { api } from '../api';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  userRole?: UserRole;
  logo?: string;
  onLogout: () => void;
  isAdmin?: boolean;
  /** Mode fokus (mis. editor surat): sidebar & header disembunyikan, konten selebar layar. */
  focusMode?: boolean;
  /** Konten memakai seluruh lebar layar, tanpa batas max-w-7xl. */
  fullWidth?: boolean;
}

/**
 * Komponen Layout Utama Aplikasi Portal Kolab.
 * UPDATED: Added scrollbar-hide to sidebar menu navigation.
 */
const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, userName, userRole, logo, onLogout, isAdmin, focusMode, fullWidth }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Account', icon: UserCircle },
    ...(userRole === UserRole.STUDENT ? [{ id: 'student-status', label: 'Status Saya', icon: UserCircle }] : []),
    { id: 'mitra', label: 'Mitra Ko+Lab', icon: Building2 },
    ...(userRole !== UserRole.STUDENT ? [{ id: 'surat-administrasi', label: 'Surat Administrasi', icon: FileStack }] : []),
    { id: 'scores', label: 'Nilai Magang', icon: Award },
    { id: 'repo', label: 'Mainframe Repo', icon: FolderOpen },
    { id: 'streaming', label: 'Streaming Hub', icon: Radio },
    { id: 'informasi', label: 'Informasi', icon: Info },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'events', label: 'Events', icon: Flag },
    { id: 'article', label: 'Article', icon: FileText },
    { id: 'announcements', label: 'Broadcast', icon: Megaphone },
  ];

  if (userRole === UserRole.LECTURER) {
    menuItems.splice(2, 0,
      { id: 'lecturer-students', label: 'Mahasiswa', icon: Users },
      { id: 'lecturer-supervisions', label: 'Bimbingan Saya', icon: FileText },
      { id: 'lecturer-workloads', label: 'Workload Saya', icon: Database },
      { id: 'lecturer-startups', label: 'Startup Ko+Lab', icon: FolderOpen }
    );
  }

  if (isAdmin && userRole === UserRole.ADMIN) {
    menuItems.push({ id: 'members', label: 'Management User', icon: Users });
    menuItems.push({ id: 'article-taxonomy', label: 'Kategori & Tag Artikel', icon: Tags });
    menuItems.push({ id: 'settings', label: 'System', icon: Settings });
  }

  const fetchNotifications = async () => {
    try {
      const result = await api.getData('getNotifications');
      if (Array.isArray(result)) {
        setNotifications(result);
        setUnreadCount(result.length > 0 ? 1 : 0); 
      }
    } catch (error) {
      console.error("Failed to sync notifications pulse", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const sidebarWidth = isHovered ? 'w-72' : 'w-24 lg:w-28';

  return (
    <div className="min-h-screen flex text-slate-900 bg-[#fcfdfe]">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {!focusMode && <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 ${isSidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarWidth} bg-white border-r border-slate-200/60 transition-all duration-300 lg:sticky lg:top-0 lg:h-screen`}
      >
        <div className="h-full flex flex-col p-6 overflow-hidden">
          <div className="flex items-center gap-4 px-0 mb-10 overflow-hidden min-h-[54px]">
            <div className="w-[54px] h-[54px] flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-slate-200/50 rounded-xl bg-slate-900">
              {logo ? <img src={logo} className="w-full h-full object-cover" alt="Logo" /> : <img src="https://i.imgur.com/EGH7u4a.png" className="w-full h-full object-contain p-1 drop-shadow-md" alt="Portal Ko+Lab" />}
            </div>
            <div className={`transition-opacity duration-200 ${(isHovered || isSidebarOpen) ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-xl font-extrabold block whitespace-nowrap tracking-tight">Portal Kolab</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2 lg:space-y-3 overflow-y-auto scrollbar-hide">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-sm font-bold transition-all relative ${activeTab === item.id ? 'bg-orange-600 text-white shadow-xl shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <item.icon size={22} className="shrink-0" />
                <span className={`transition-all duration-300 whitespace-nowrap ${(isHovered || isSidebarOpen) ? 'opacity-100 translate-x-0' : 'opacity-0 absolute lg:hidden'}`}>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100/80 overflow-hidden">
            <button onClick={onLogout} className="w-full flex items-center p-3.5 text-red-500 hover:bg-red-50 rounded-2xl transition-all">
              <LogOut size={20} className="shrink-0" />
              <span className={`transition-all duration-300 whitespace-nowrap font-bold text-sm ml-4 ${(isHovered || isSidebarOpen) ? 'opacity-100' : 'opacity-0 absolute lg:hidden'}`}>Log Out</span>
            </button>
          </div>
        </div>
      </aside>}

      <div className="flex-1 flex flex-col min-h-screen relative min-w-0">
        {!focusMode && <header className="h-16 sm:h-20 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-3.5 sm:px-6 lg:px-10 sticky top-0 z-[40]">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 text-slate-600 lg:hidden rounded-xl bg-white border border-slate-100 shadow-sm"><Menu size={22} /></button>
            <div className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg overflow-hidden shadow-md bg-slate-900"><img src={logo || "https://i.imgur.com/EGH7u4a.png"} className="w-full h-full object-contain p-0.5 drop-shadow-md" alt="Portal Ko+Lab" /></div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0); }} className="relative p-2.5 text-slate-500 hover:text-orange-600 transition-colors bg-white rounded-xl shadow-sm border border-slate-100">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-4 w-[calc(100vw-32px)] sm:w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Pusat Informasi</h4>
                       <button onClick={() => setShowNotifications(false)} className="p-1 text-slate-400 hover:text-slate-900"><X size={16} /></button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-12 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">All Systems Clear</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-6 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                            <div className="flex gap-4">
                               <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                  {n.type === 'SCHEDULE' ? <Calendar size={18} /> : n.type === 'INFO' ? <Info size={18} /> : <Megaphone size={18} />}
                               </div>
                               <div>
                                  <h5 className="text-[11px] font-black text-slate-900 group-hover:text-orange-600 transition-colors">{n.title}</h5>
                                  <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                               </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="h-8 w-px bg-slate-100 mx-1"></div>
            <div className="flex flex-col items-end">
               <span className="text-[11px] lg:text-xs font-black text-slate-900 leading-none truncate max-w-[100px] sm:max-w-[160px] lg:max-w-none">{userName}</span>
               <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{userRole}</span>
            </div>
          </div>
        </header>}
        <main className="flex-1 overflow-x-hidden">
          <div className={focusMode ? "p-3 sm:p-4 lg:p-5" : `${fullWidth ? "max-w-none" : "max-w-7xl"} mx-auto p-3.5 sm:p-6 lg:p-8 xl:p-10`}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;



