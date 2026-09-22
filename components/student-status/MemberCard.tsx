import type { StudentMemberOverview } from '../../types';

export function MemberCard({ membership, name, nim }: { membership: StudentMemberOverview['membership'], name: string, nim: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">Status Member</h2>
      
      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Akun</p>
          <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${membership.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {membership.isActive ? 'AKTIF' : 'TIDAK AKTIF'}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Approval</p>
          <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${membership.isApproved ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
            {membership.isApproved ? 'DISETUJUI' : 'MENUNGGU'}
          </span>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipe Member</p>
          <p className="font-semibold text-sm text-slate-800">{membership.studentType === 'STARTUP' ? 'Startup Member' : 'Non Startup'}</p>
        </div>
      </div>
    </div>
  );
}
