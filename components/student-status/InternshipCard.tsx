import { StudentInternshipSummary } from '../../types';
import { periodInternship, getBadgeColor } from './utils';

export function InternshipCard({ internship }: { internship?: StudentInternshipSummary }) {
  if (!internship) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-full flex flex-col justify-center items-center text-center min-h-[200px]">
        <p className="text-slate-500 font-medium text-sm">Belum memiliki data magang.</p>
      </div>
    );
  }

  const badgeClass = getBadgeColor(internship.status);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">Status Magang</h2>
        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${badgeClass}`}>
          {internship.status === 'ONGOING' ? 'SEDANG MAGANG' : internship.status}
        </span>
      </div>

      <div className="mb-6">
        <h3 className="font-black text-slate-900 text-lg">{internship.startupName || 'Startup belum tersedia'}</h3>
        <p className="text-sm font-medium text-slate-500 mt-1">{periodInternship(internship)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4 mt-auto pt-5 border-t border-slate-50">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pembimbing Lapangan</p>
          <p className={`font-semibold text-sm ${!internship.fieldSupervisor ? 'text-slate-400 italic' : 'text-slate-800'}`}>
            {internship.fieldSupervisor || 'Belum ditentukan'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pembimbing Akademik</p>
          <p className={`font-semibold text-sm ${!internship.academicSupervisorName ? 'text-slate-400 italic' : 'text-slate-800'}`}>
            {internship.academicSupervisorName || 'Belum ditentukan'}
          </p>
          {internship.academicSupervisor2Name && (
             <p className="font-semibold text-sm text-slate-800 mt-1">{internship.academicSupervisor2Name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
