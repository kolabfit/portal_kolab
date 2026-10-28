import React, { useState } from 'react';
import { UserRole, AppAssets } from '../types';
import { Shield, ArrowRight, User, BookOpen, Lock, Terminal, UserPlus, Fingerprint, Loader2 } from 'lucide-react';
import { api } from '../api';

interface LoginViewProps {
  onLogin: (role: UserRole, id: string, pass: string) => void;
  onAdminLogin: (username: string, pass: string) => void;
  onRegister?: (data: any) => void;
  assets: AppAssets;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onAdminLogin, onRegister, assets }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [lecturerCode, setLecturerCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const toggleForgotMode = () => {
    setIsForgotMode(!isForgotMode);
    setResetMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate slight delay for the micro-animation to be visible
    await new Promise(r => setTimeout(r, 400));

    try {
      if (isForgotMode) {
        if (password !== confirmPassword) {
          setResetMessage('Konfirmasi kata sandi tidak cocok.');
          return;
        }
        const res = await api.postData('forgotPassword', { role, id, password });
        setResetMessage(res?.message || 'Permintaan gagal dikirim.');
        if (res?.status === 'success') { setPassword(''); setConfirmPassword(''); }
      } else if (isRegisterMode) {
        await onRegister?.({ role, id, name, password, lecturerCode });
      } else if (isAdminMode) {
        await onAdminLogin(id, password);
      } else {
        await onLogin(role, id, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIDLabel = () => {
    if (isAdminMode) return 'Admin Username';
    return role === UserRole.STUDENT ? 'Nomor Induk Mahasiswa (NIM)' : 'Nomor Induk Pegawai (NIP)';
  };

  const getIDPlaceholder = () => {
    if (isAdminMode) return "system_root";
    return role === UserRole.STUDENT ? "Masukkan NIM Anda" : "Masukkan NIP Anda";
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* Left Column: Branding */}
      <div className={`lg:w-1/2 relative flex flex-col justify-center items-center p-12 lg:p-24 overflow-hidden transition-all duration-700 ${isAdminMode ? 'bg-black' : 'bg-slate-900'}`}>
        <div className="absolute top-0 left-0 w-full h-full">
           <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[60%] blur-[120px] rounded-full transition-colors duration-700 ${isAdminMode ? 'bg-red-600/20' : 'bg-orange-600/20'}`}></div>
           <div className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] blur-[100px] rounded-full transition-colors duration-700 ${isAdminMode ? 'bg-red-600/10' : 'bg-orange-600/10'}`}></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-md animate-in fade-in slide-in-from-left-8 duration-1000">
           <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 group hover:scale-110 drop-shadow-2xl overflow-hidden">
              {assets.logoUrl ? (
                <img src={assets.logoUrl} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <img src="https://i.imgur.com/EGH7u4a.png" className="w-full h-full object-cover" alt="Portal Ko+Lab" />
              )}
           </div>
           <h1 className="text-6xl font-black text-white tracking-tighter mb-6 leading-none">
             Portal <span className={isAdminMode ? 'text-red-600' : 'text-orange-600'}>{isAdminMode ? 'Admin' : 'Ko+Lab'}</span>
           </h1>
           <p className="text-slate-400 font-bold text-lg leading-relaxed uppercase tracking-[0.2em]">
             {isAdminMode ? 'Root Security Access Terminal' : isRegisterMode ? 'Identity Registration Protocol' : 'Creative Ecosystem Access Terminal'}
           </p>
           <div className={`mt-12 w-24 h-1.5 rounded-full transition-colors duration-700 ${isAdminMode ? 'bg-red-600' : 'bg-orange-600'}`}></div>
        </div>

        <div className="absolute bottom-12 text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] z-10">
          {isAdminMode ? 'ENCRYPTED BRIDGE ACTIVE' : 'Mainframe Connectivity Active'} • v2.0.4
        </div>
      </div>

      {/* Right Column: Auth Workspace */}
      <div className="lg:w-1/2 flex flex-col justify-between p-12 lg:p-24 bg-white relative">
        <div className="max-w-md w-full mx-auto my-auto animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
          <div className="mb-12">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">
              {isAdminMode ? 'Authorize Root' : isForgotMode ? 'Lupa Password' : isRegisterMode ? 'Request Access' : 'Welcome Back'}
            </h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
              {isAdminMode ? 'Elevated privileges required to proceed.' : isForgotMode ? 'Buat password baru, aktif setelah disetujui admin.' : isRegisterMode ? 'Create your official identity record.' : 'Identify yourself to enter the hub.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isAdminMode && (
              <div className="p-1.5 bg-slate-50 rounded-[1.5rem] flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setRole(UserRole.STUDENT)}
                  className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${role === UserRole.STUDENT ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <User size={16} /> Mahasiswa
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setRole(UserRole.LECTURER)}
                  className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${role === UserRole.LECTURER ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <BookOpen size={16} /> Dosen
                </button>
              </div>
            )}

            <div className="space-y-4">
              {isRegisterMode && (
                <div className="group animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Official Full Name</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-orange-600 transition-colors">
                        <UserPlus size={20} />
                     </div>
                     <input 
                       type="text" required
                       disabled={isSubmitting}
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="w-full pl-14 pr-8 py-5 bg-slate-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold text-slate-800 disabled:opacity-50" 
                       placeholder="••••••••"
                     />
                  </div>
                </div>
              )}

              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">{getIDLabel()}</label>
                <div className="relative">
                   <div className={`absolute inset-y-0 left-6 flex items-center text-slate-300 transition-colors ${isAdminMode ? 'group-focus-within:text-red-600' : 'group-focus-within:text-orange-600'}`}>
                      {isAdminMode ? <Terminal size={20} /> : <Shield size={20} />}
                   </div>
                   <input 
                     type="text" required
                     disabled={isSubmitting}
                     value={id}
                     onChange={(e) => setId(e.target.value)}
                     className={`w-full pl-14 pr-8 py-5 bg-slate-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:ring-4 outline-none transition-all font-bold text-slate-800 ${isAdminMode ? 'focus:ring-red-100' : 'focus:ring-orange-100'} disabled:opacity-50`} 
                     placeholder={getIDPlaceholder()}
                   />
                </div>
              </div>

              {isRegisterMode && role === UserRole.LECTURER && (
                <div className="group animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Lecturer Code</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-orange-600 transition-colors">
                        <Fingerprint size={20} />
                     </div>
                     <input 
                       type="text" required
                       disabled={isSubmitting}
                       value={lecturerCode}
                       onChange={(e) => setLecturerCode(e.target.value)}
                       className="w-full pl-14 pr-8 py-5 bg-slate-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold text-slate-800 disabled:opacity-50" 
                       placeholder="e.g. ABC"
                     />
                  </div>
                </div>
              )}

              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">
                  {isAdminMode ? 'Kata Sandi Admin' : isForgotMode ? 'Kata Sandi Baru' : 'Kata Sandi'}
                </label>
                <div className="relative">
                   <div className={`absolute inset-y-0 left-6 flex items-center text-slate-300 transition-colors ${isAdminMode ? 'group-focus-within:text-red-600' : 'group-focus-within:text-orange-600'}`}>
                      <Lock size={20} />
                   </div>
                   <input 
                     type="password" required
                     disabled={isSubmitting}
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className={`w-full pl-14 pr-8 py-5 bg-slate-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:ring-4 outline-none transition-all font-bold text-slate-800 ${isAdminMode ? 'focus:ring-red-100' : 'focus:ring-orange-100'} disabled:opacity-50`} 
                     placeholder={isForgotMode ? 'Minimal 6 karakter' : 'Masukkan kata sandi Anda'}
                   />
                </div>
              </div>

              {isForgotMode && (
                <div className="group animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Ulangi Kata Sandi Baru</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-orange-600 transition-colors">
                        <Lock size={20} />
                     </div>
                     <input
                       type="password" required
                       disabled={isSubmitting}
                       value={confirmPassword}
                       onChange={(e) => setConfirmPassword(e.target.value)}
                       className="w-full pl-14 pr-8 py-5 bg-slate-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold text-slate-800 disabled:opacity-50"
                       placeholder="Ulangi kata sandi baru"
                     />
                  </div>
                </div>
              )}

              {isForgotMode && resetMessage && (
                <p role="status" className="px-6 py-5 bg-emerald-50 text-emerald-700 rounded-[1.5rem] text-sm font-bold leading-relaxed">{resetMessage}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full relative overflow-hidden py-6 text-white rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl hover:scale-[1.02] active:scale-[0.98] group ${isAdminMode ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-black'} ${isSubmitting ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isSubmitting ? (
                <>
                   <Loader2 size={20} className="animate-spin" />
                   {isForgotMode || isRegisterMode ? 'Transmitting...' : isAdminMode ? 'Verifying...' : 'Authorizing...'}
                </>
              ) : (
                <>
                  {isForgotMode ? 'Kirim Permintaan Reset' : isRegisterMode ? 'Transmit Request' : isAdminMode ? 'Verify Authority' : 'Secure Entrance'}
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </>
              )}
              
              {isSubmitting && <div className="btn-progress-line"></div>}
            </button>
            
            <div className="flex flex-col gap-3 items-center">
              {!isAdminMode && !isRegisterMode && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={toggleForgotMode}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {isForgotMode ? 'Kembali ke Login' : 'Lupa Password?'}
                </button>
              )}
              {!isAdminMode && !isForgotMode && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {isRegisterMode ? 'Back to Portal Login' : 'New Member? Request Access'}
                </button>
              )}
              {isAdminMode && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAdminMode(false)}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  Exit Root Access
                </button>
              )}
            </div>
          </form>

          <div className="mt-10 flex items-center justify-center gap-4">
             <div className="h-px flex-1 bg-slate-100"></div>
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Secure Bio-Sync</span>
             <div className="h-px flex-1 bg-slate-100"></div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Copyright{' '}
            <span 
              onClick={() => { if(!isSubmitting) { setIsAdminMode(!isAdminMode); setIsRegisterMode(false); setIsForgotMode(false); } }}
              className="cursor-pointer text-slate-300 hover:text-orange-600 transition-colors px-1 select-none"
            >
              &copy;
            </span>{' '}
            2026 Ko+Lab Powered by Yanto.pro & KroomBox.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
