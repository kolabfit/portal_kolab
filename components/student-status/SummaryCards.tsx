import { UserCheck, Rocket, BriefcaseBusiness, Layers3 } from 'lucide-react';
import { getBadgeColor } from './utils';

type SummaryProps = {
  memberStatus: string;
  memberApproval: string;
  startupName: string;
  startupPosition: string;
  internshipStatus: string;
  internshipStartup: string;
  workloadActive: number;
};

export function SummaryCards({ memberStatus, memberApproval, startupName, startupPosition, internshipStatus, internshipStartup, workloadActive }: SummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Member Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><UserCheck size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MEMBER</p>
            <p className="font-bold text-slate-800 leading-tight">{memberStatus}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">{memberApproval}</p>
          </div>
        </div>
      </div>

      {/* Startup Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><Rocket size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">STARTUP</p>
            <p className="font-bold text-slate-800 leading-tight truncate max-w-[120px]">{startupName}</p>
            <p className="text-sm font-medium text-slate-500 mt-1 truncate max-w-[120px]">{startupPosition}</p>
          </div>
        </div>
      </div>

      {/* Magang Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><BriefcaseBusiness size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MAGANG</p>
            <p className="font-bold text-slate-800 leading-tight truncate max-w-[120px]">{internshipStatus}</p>
            <p className="text-sm font-medium text-slate-500 mt-1 truncate max-w-[120px]">{internshipStartup}</p>
          </div>
        </div>
      </div>

      {/* Workload Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Layers3 size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WORKLOAD</p>
            <p className="font-bold text-slate-800 leading-tight">{workloadActive} Aktif</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Project & Tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
