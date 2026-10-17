
import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, Announcement, AppAssets, StartupTeam, Schedule, Event, Article, ArticleCategory, LecturerOverview, LecturerStudentSummary } from './types';
import { api } from './api';
import Modal, { ModalType } from './components/Modal';
import Layout from './components/Layout';

// Views
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import StudentStatusView from './views/StudentStatusView';
import { useStudentStatus } from './services/useStudentStatus';
import ProfileView from './views/ProfileView';
import RepoView from './views/RepoView';
import ScheduleView from './views/MeetingsView';
import EventsView from './views/EventsView';
import AnnouncementsView from './views/AnnouncementsView';
import ArticleView from './views/ArticleView';
import InformasiView from './views/InformasiView';
import SettingsView from './views/SettingsView';
import MemberManagementView from './views/MemberManagementView';
import ContentManagementView from './views/ContentManagementView';
import StreamingView from './views/StreamingView';
import LecturerStudentsView from './views/LecturerStudentsView';
import LecturerSupervisionsView from './views/LecturerSupervisionsView';
import LecturerWorkloadsView from './views/LecturerWorkloadsView';
import LecturerStartupsView from './views/LecturerStartupsView';
import MitraView from './views/MitraView';
import SuratAdministrasiView from './views/SuratAdministrasiView';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [startups, setStartups] = useState<StartupTeam[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ id: '0000', name: 'GUEST', email: '', role: UserRole.STUDENT, avatar: 'https://i.pravatar.cc/150', isApproved: true, isActive: true });
  const studentStatus = useStudentStatus(isAuthenticated && profile.role === UserRole.STUDENT ? profile.id : null);
  const [assets, setAssets] = useState<AppAssets>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [informasiList, setInformasiList] = useState<any[]>([]);
  const [lecturerOverview, setLecturerOverview] = useState<LecturerOverview | null>(null);
  const [lecturerStudents, setLecturerStudents] = useState<LecturerStudentSummary[]>([]);
  const [lecturerSupervisions, setLecturerSupervisions] = useState<any[]>([]);
  const [lecturerWorkloads, setLecturerWorkloads] = useState<{ asPic: any[]; asMember: any[] }>({ asPic: [], asMember: [] });
  const [lecturerStartups, setLecturerStartups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<{ isOpen: boolean; type: ModalType; title: string; message: string; onConfirm?: () => void; }>({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (title: string, message: string, type: ModalType = 'info') => setModal({ isOpen: true, type, title, message });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });

  const saveAndRefresh = async (action: string, payload: any) => {
    const result = await api.postData(action, payload);
    if (result?.status !== 'success') {
      showAlert('Gagal menyimpan', result?.message || 'Data belum tersimpan.', 'error');
      return false;
    }
    await loadBaseData();
    return true;
  };

  const refreshArticles = async () => {
    const [list, categoryList, tagList] = await Promise.all([
      api.getData('getArticles'), api.getData('getCategories'), api.getData('getTags')
    ]);
    if (Array.isArray(list)) setArticles(list);
    if (Array.isArray(categoryList)) setCategories(categoryList);
    if (Array.isArray(tagList)) setTags(tagList);
  };

  const saveArticle = async (type: 'add' | 'edit', id: string | undefined, data: any) => {
    const result = await api.postData('manageArticle', { type, id, data });
    if (result?.status !== 'success' || result.id !== id) {
      showAlert('Gagal menyimpan', result?.message || 'Artikel belum tersimpan.', 'error');
      return false;
    }
    return true;
  };

  const loadBaseData = async () => {
    setIsLoading(true);
    try {
      const remoteAssets = await api.getData('getAssets');
      if (remoteAssets && !remoteAssets.status) setAssets(remoteAssets);

      const remoteAnns = await api.getData('getAnnouncements');
      if (Array.isArray(remoteAnns)) setAnnouncements(remoteAnns);

      const remoteStartups = await api.getData('getStartups');
      if (Array.isArray(remoteStartups)) setStartups(remoteStartups);

      const remoteScheds = await api.getData('getSchedules');
      if (Array.isArray(remoteScheds)) setSchedules(remoteScheds);

      const remoteEvts = await api.getData('getEvents');
      if (Array.isArray(remoteEvts)) setEvents(remoteEvts);

      const remoteTags = await api.getData('getTags');
      if (Array.isArray(remoteTags)) setTags(remoteTags);

      const remoteArts = await api.getData('getArticles');
      if (Array.isArray(remoteArts)) setArticles(remoteArts);

      const remoteArtsCats = await api.getData('getCategories');
      if (Array.isArray(remoteArtsCats)) setCategories(remoteArtsCats);

      const remoteInfo = await api.getData('getInformasi');
      if (Array.isArray(remoteInfo)) setInformasiList(remoteInfo);

    } catch (err) { 
      console.error("Mainframe synchronization pulse failed", err); 
    }
    setIsLoading(false);
  };

  const restoreSession = async () => {
    setIsRestoringSession(true);
    setSessionError(false);
    try {
      const savedProfile = await api.restoreSession();
      if (savedProfile) {
        setProfile(savedProfile);
        setIsAdmin(savedProfile.role === UserRole.ADMIN);
        setIsAuthenticated(true);
      }
    } catch {
      setSessionError(true);
    } finally {
      setIsRestoringSession(false);
    }
  };

  const acceptLogin = (result: any) => {
    try {
      if (!result.token || !result.profile) throw new Error('Missing session');
      api.saveToken(result.token);
    } catch {
      showAlert('Login gagal', 'Sesi tidak dapat disimpan. Pastikan penyimpanan browser diizinkan.', 'error');
      return false;
    }
    setProfile(result.profile);
    setIsAdmin(result.profile.role === UserRole.ADMIN);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    return true;
  };

  const handleLogout = () => {
    api.clearSession();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setActiveTab('dashboard');
    setProfile({ id: '0000', name: 'GUEST', email: '', role: UserRole.STUDENT, avatar: '', isApproved: false, isActive: false });
    setModal(current => ({ ...current, isOpen: false }));
  };

  useEffect(() => {
    const handleError = (event: CustomEvent<string>) => showAlert('Gagal menyimpan', (event as unknown as CustomEvent<string>).detail, 'error');
    window.addEventListener('portal-api-error', handleError as EventListener);
    return () => window.removeEventListener('portal-api-error', handleError as EventListener);
  }, []);

  useEffect(() => { void restoreSession(); void loadBaseData(); }, []);
  useEffect(() => {
    if (!isAuthenticated || profile.role !== UserRole.LECTURER) return;
    const loadLecturerData = async () => {
      const [overview, students, supervisions, workloads, startups] = await Promise.all([
        api.getData('getLecturerOverview'), api.getData('getLecturerStudents'),
        api.getData('getLecturerSupervisions'), api.getData('getLecturerWorkloads'),
        api.getData('getLecturerStartups')
      ]);
      if (overview && !overview.status) setLecturerOverview(overview);
      if (Array.isArray(students)) setLecturerStudents(students);
      if (Array.isArray(supervisions)) setLecturerSupervisions(supervisions);
      if (workloads && !workloads.status) setLecturerWorkloads(workloads);
      if (Array.isArray(startups)) setLecturerStartups(startups);
    };
    void loadLecturerData();
  }, [isAuthenticated, profile.role]);

  const handleLogin = async (role: UserRole, id: string, pass: string) => {
    setIsLoading(true);
    const result = await api.postData('login', { role, id, password: pass, isAdmin: false });
    setIsLoading(false);
    if (result?.status === 'success') { 
      if (!acceptLogin(result)) return;
      showAlert('Hub Connection Secure', `Identity authorized.`, 'success'); 
      loadBaseData();
    }
    else showAlert('Verification Failed', result?.message || 'Access denied.', 'error');
  };

  const handleFileUpload = async (file: File, oldUrl?: string, folderType: string = 'fotoppid') => {
    const reader = new FileReader();
    return new Promise<string | null>((resolve) => {
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await api.postData('uploadFile', { data: base64, fileName: file.name, mimeType: file.type, oldUrl, folderType });
        resolve(res?.url || null);
      };
      reader.readAsDataURL(file);
    });
  };

  if (isRestoringSession || sessionError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white" role="status">
      <p>{sessionError ? 'Sesi belum dapat diperiksa. Periksa koneksi lalu coba lagi.' : 'Memulihkan sesi...'}</p>
      {sessionError && <button className="px-5 py-3 bg-orange-600 text-white rounded-xl" onClick={() => void restoreSession()}>Coba lagi</button>}
    </div>
  );

  if (!isAuthenticated) return (
    <>
      <LoginView onLogin={handleLogin} onAdminLogin={async (u, p) => {
        setIsLoading(true); const res = await api.postData('login', { username: u, password: p, isAdmin: true }); setIsLoading(false);
        if (res?.status === 'success') { 
          if (!acceptLogin(res)) return; 
          loadBaseData();
        }
        else showAlert('Elevated Access Failed', 'Credential mismatch.', 'error');
      }} onRegister={async d => {
        setIsLoading(true);
        const res = await api.postData('register', d);
        setIsLoading(false);
        if (res?.status === 'success') {
          showAlert('Registry Success', 'Member indexed in mainframe.', 'success');
        } else {
          showAlert('Registration Failed', res?.message || 'Account could not be saved.', 'error');
        }
      }} assets={assets} />
      <Modal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onClose={() => setModal({ ...modal, isOpen: false })} />
    </>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userName={profile.name} userRole={profile.role} logo={assets.logoUrl} onLogout={handleLogout} isAdmin={isAdmin}>
      {isLoading ? <div className="py-40 flex flex-col items-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-6"></div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing...</p></div> : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardView 
              studentStatus={studentStatus}
              profile={profile} 
              assets={assets} 
              meetings={schedules} 
              events={events} 
              news={articles as any} 
              announcements={announcements}
              informasiList={informasiList}
              startups={startups}
              lecturerOverview={lecturerOverview}
              setActiveTab={setActiveTab} 
              onRefresh={loadBaseData}
            />
          )}
          {activeTab === 'student-status' && profile.role === UserRole.STUDENT && <StudentStatusView state={studentStatus} />}
          {activeTab === 'profile' && <ProfileView profile={profile} setProfile={setProfile} startups={startups} handleProfileUpdate={async e => { e.preventDefault(); setIsLoading(true); const { startupPosition, startupId, studentType, ...editableProfile } = profile; const result = await api.postData('updateProfile', editableProfile); setIsLoading(false); if (result?.status === 'success') { setProfile(await api.restoreSession()); showAlert('Profile Synced', 'Changes committed.', 'success'); } else showAlert('Gagal menyimpan', result?.message || 'Profil belum tersimpan.', 'error'); }} onFileUpload={handleFileUpload} />}
          {activeTab === 'mitra' && <MitraView userRole={profile.role} onShowAlert={showAlert} showConfirm={showConfirm} />}
          {activeTab === 'surat-administrasi' && <SuratAdministrasiView userRole={profile.role} onShowAlert={showAlert} startups={startups} showConfirm={showConfirm} />}
          {activeTab === 'repo' && <RepoView profile={profile} onShowAlert={showAlert} isAdmin={isAdmin} assets={assets} showConfirm={showConfirm} />}
          {activeTab === 'streaming' && <StreamingView profile={profile} assets={assets} setProfile={setProfile} onShowAlert={showAlert} onRefresh={loadBaseData} showConfirm={showConfirm} />}
          {activeTab === 'informasi' && <InformasiView list={informasiList} isAdmin={isAdmin} currentUser={profile.name} userRole={profile.role} userStartupId={profile.startupId} startups={startups} onRefresh={loadBaseData} onShowAlert={showAlert} showConfirm={showConfirm} />}
          {activeTab === 'schedule' && <ScheduleView meetings={schedules} isAdmin={isAdmin} currentUser={profile.name} onRefresh={loadBaseData} onCreate={d => saveAndRefresh('manageSchedule', { type: 'add', data: d })} onEdit={(id, d) => saveAndRefresh('manageSchedule', { type: 'edit', id, data: d })} onDelete={id => showConfirm('Purge Entry', 'Hapus permanent dari mainframe?', () => saveAndRefresh('manageSchedule', { type: 'delete', id }))} />}
          {activeTab === 'events' && <EventsView events={events} isAdmin={isAdmin} currentUser={profile.name} userEmail={profile.email} onRefresh={loadBaseData} onShowAlert={showAlert} showConfirm={showConfirm} />}
          {activeTab === 'article' && <ArticleView articles={articles} categories={categories} tags={tags} isAdmin={isAdmin} currentUser={profile.name} onAction={(t, id, d) => { if(t === 'delete') { showConfirm('Purge Article', 'Hapus artikel dari hub?', () => saveAndRefresh('manageArticle', { type: t, id, data: d })); } else { return saveArticle(t, id, d); } }} onRefresh={refreshArticles} showConfirm={showConfirm} />}
          {activeTab === 'announcements' && <AnnouncementsView announcements={announcements} startups={startups} currentUser={profile.name} isAdmin={isAdmin} userRole={profile.role} userStartupId={profile.startupId} onRefresh={loadBaseData} showConfirm={showConfirm} onShowAlert={showAlert} />}
          {activeTab === 'members' && isAdmin && <MemberManagementView userRole={profile.role} startups={startups} onRefresh={loadBaseData} onShowAlert={showAlert} showConfirm={showConfirm} />}
          {activeTab === 'article-taxonomy' && isAdmin && <ContentManagementView onShowAlert={showAlert} />}
          {activeTab === 'settings' && <SettingsView assets={assets} setAssets={setAssets} onAssetUpload={handleFileUpload} onSaveAssets={async () => { if (await saveAndRefresh('updateAssets', { data: assets })) showAlert('Global Engine Synced', 'New assets deployed.', 'success'); }} />}
          {activeTab === 'lecturer-students' && profile.role === UserRole.LECTURER && <LecturerStudentsView students={lecturerStudents} onDetail={async nim => api.getData(`lecturer/students/${nim}`)} />}
          {activeTab === 'lecturer-supervisions' && profile.role === UserRole.LECTURER && <LecturerSupervisionsView rows={lecturerSupervisions} />}
          {activeTab === 'lecturer-workloads' && profile.role === UserRole.LECTURER && <LecturerWorkloadsView data={lecturerWorkloads} onDetail={async id => api.getData(`lecturer/workloads/${id}`)} />}
          {activeTab === 'lecturer-startups' && profile.role === UserRole.LECTURER && <LecturerStartupsView startups={lecturerStartups} />}
        </>
      )}
      <Modal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onClose={() => setModal({ ...modal, isOpen: false })} onConfirm={modal.onConfirm} />
    </Layout>
  );
};

export default App;






