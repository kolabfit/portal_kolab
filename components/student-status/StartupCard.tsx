import type { StudentMemberOverview } from '../../types';
import { startupPositionLabel } from '../../startupPositions';
import { ExternalLink } from 'lucide-react';

export function StartupCard({ startup, jobDesk }: { startup: StudentMemberOverview['startup'], jobDesk?: string | null }) {
  if (!startup) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-full flex flex-col justify-center items-center text-center min-h-[200px]">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
          <span className="text-slate-300 font-black text-xl">S</span>
        </div>
        <p className="text-slate-500 font-medium text-sm">Belum tergabung dalam startup.</p>
      </div>
    );
  }

  const website = startup.website?.startsWith('http') ? startup.website : (startup.website ? `https://${startup.website}` : null);
  const ig = startup.instagram?.startsWith('http') ? startup.instagram : (startup.instagram ? `https://instagram.com/${startup.instagram.replace('@','')}` : null);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-full">
      <h2 className="text-lg font-bold text-slate-900 mb-6">Startup Saya</h2>
      
      <div className="flex items-start gap-4 mb-6">
        {startup.logoUrl ? (
          <img src={startup.logoUrl.startsWith('http') ? startup.logoUrl : `http://localhost:3001${startup.logoUrl}`} alt={startup.name} className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1 border border-slate-100" />
        ) : (
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xl border border-slate-100">
            {startup.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{startup.name}</h3>
          <p className="text-xs text-slate-500 mt-1">Sektor / Inkubator Startup</p>
        </div>
      </div>

      <div className="mb-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Posisi</p><span className="inline-block px-3 py-1 rounded-lg bg-slate-100 font-bold text-slate-800">{startupPositionLabel(startup.position)}</span></div>
      <div className="mb-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Desk</p>
        <p className={`font-semibold text-sm ${!jobDesk ? 'text-slate-400 italic' : 'text-slate-800'}`}>
          {jobDesk || 'Belum ditentukan'}
        </p>
      </div>

      {(website || ig) && (
        <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-slate-50">
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
              Website <ExternalLink size={12} />
            </a>
          )}
          {ig && (
            <a href={ig} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
              Instagram <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
