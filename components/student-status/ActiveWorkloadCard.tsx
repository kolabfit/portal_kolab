import { useState } from 'react';
import { StudentWorkloadSummary } from '../../types';
import { periodWorkload, getBadgeColor } from './utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function ActiveWorkloadCard({ item, categories }: { item: StudentWorkloadSummary, categories: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const badgeClass = getBadgeColor(item.status);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-slate-200 transition-colors">
      <div 
        className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-start gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-3 mb-2">
            <h3 className="font-black text-lg text-slate-900 truncate">{item.name}</h3>
            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${badgeClass}`}>
              {item.status === 'ACTIVE' ? 'AKTIF' : item.status}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-4">{categories[item.category] || item.category}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Desk</p>
              <p className={`font-medium text-sm truncate ${!item.jobDesk ? 'text-slate-400 italic' : 'text-slate-800'}`}>{item.jobDesk || 'Belum ditentukan'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PIC</p>
              <p className={`font-medium text-sm truncate ${!item.picName ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                {item.picName || 'Belum ditentukan'}
                {item.picRole && <span className="text-slate-400 font-normal"> · {item.picRole === 'LECTURER' ? 'Dosen' : 'Mahasiswa'}</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Periode</p>
              <p className="font-medium text-sm text-slate-800 truncate">{periodWorkload(item)}</p>
            </div>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center justify-center p-2 text-slate-300 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
        
        <div className="sm:hidden flex items-center gap-1 text-xs font-bold text-slate-400 justify-center py-2 mt-2 border-t border-slate-50">
          {expanded ? 'Tutup Detail' : 'Lihat Detail'}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-4 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deskripsi Workload</p>
          <div className="text-sm font-medium text-slate-700 whitespace-pre-wrap">
            {item.description || <span className="italic text-slate-400">Belum ada deskripsi untuk workload ini.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
