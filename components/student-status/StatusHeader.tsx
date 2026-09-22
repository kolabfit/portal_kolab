import { RefreshCw } from 'lucide-react';
import { StudentMemberOverview } from '../../types';

export function StatusHeader({ profile, memberType, isActive, onRefresh, loading }: { profile: StudentMemberOverview['profile'], memberType: string, isActive: boolean, onRefresh: () => void, loading: boolean }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Status Saya</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-800 text-lg">{profile.name}</span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-500">{profile.nim}</span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-500 font-medium">{memberType}</span>
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {isActive ? 'AKTIF' : 'TIDAK AKTIF'}
          </span>
        </div>
      </div>
      <button 
        onClick={onRefresh} 
        disabled={loading}
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        Muat Ulang
      </button>
    </div>
  );
}
