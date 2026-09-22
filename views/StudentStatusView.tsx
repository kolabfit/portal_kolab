import React from 'react';
import type { StudentStatusState } from '../services/useStudentStatus';
import { startupPositionLabel } from '../startupPositions';
import { StatusHeader } from '../components/student-status/StatusHeader';
import { SummaryCards } from '../components/student-status/SummaryCards';
import { MemberCard } from '../components/student-status/MemberCard';
import { StartupCard } from '../components/student-status/StartupCard';
import { InternshipCard } from '../components/student-status/InternshipCard';
import { WorkloadSummary } from '../components/student-status/WorkloadSummary';
import { ActiveWorkloadCard } from '../components/student-status/ActiveWorkloadCard';
import { WorkloadHistory } from '../components/student-status/WorkloadHistory';
export const categories: Record<string, string> = { PKM: 'PKM', PROJECT: 'Project', RESEARCH: 'Penelitian', COMPETITION: 'Lomba' };
export const internshipLabels: Record<string, string> = { ACTIVE: 'Sedang Magang', ONGOING: 'Sedang Magang', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' };
export function membershipLabel(membership: any) { return membership.isActive ? (membership.isApproved ? 'Aktif' : 'Menunggu Approval') : 'Tidak Aktif'; }

function SkeletonLoading() {
  return (
    <div aria-label="Memuat status saya" className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-16 bg-slate-100 rounded-2xl w-3/4 mb-6"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl"></div>)}
      </div>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="h-48 bg-slate-100 rounded-2xl"></div>
        <div className="h-48 bg-slate-100 rounded-2xl"></div>
        <div className="h-48 bg-slate-100 rounded-2xl"></div>
        <div className="h-48 bg-slate-100 rounded-2xl"></div>
      </div>
      <div className="h-32 bg-slate-100 rounded-2xl mt-6"></div>
    </div>
  );
}

function Feedback({ state }: { state: StudentStatusState }) {
  if (state.loading) return <SkeletonLoading />;
  return (
    <div role="alert" className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-7xl mx-auto text-center">
      <p className="font-bold">Data status belum dapat dimuat.</p>
      <button className="mt-4 bg-white border border-red-200 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors" onClick={state.retry}>Coba Lagi</button>
    </div>
  );
}

export default function StudentStatusView({ state }: { state: StudentStatusState }) {
  if (!state.data || state.loading || state.error) return <Feedback state={state} />;
  
  const d = state.data;
  const currentInternship = d.internship.current;
  const memberType = d.membership.studentType === 'STARTUP' ? 'Startup Member' : 'Non Startup';

  return (
    <div className="space-y-6 text-slate-900 max-w-7xl mx-auto pb-12">
      <StatusHeader 
        profile={d.profile} 
        memberType={memberType} 
        isActive={d.membership.isActive} 
        onRefresh={state.retry} 
        loading={state.loading}
      />
      
      <SummaryCards 
        memberStatus={membershipLabel(d.membership)}
        memberApproval={d.membership.isApproved ? 'Disetujui' : 'Menunggu'}
        startupName={d.startup?.name || 'Belum tergabung'}
        startupPosition={startupPositionLabel(d.startup?.position)}
        internshipStatus={currentInternship ? internshipLabels[currentInternship.status] : 'Tidak Magang'}
        internshipStartup={currentInternship?.startupName || '-'}
        workloadActive={d.workload.activeLoad}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <MemberCard membership={d.membership} name={d.profile.name} nim={d.profile.nim} />
        <StartupCard startup={d.startup} jobDesk={d.membership.jobDesk} />
        <InternshipCard internship={currentInternship} />
        <WorkloadSummary active={d.workload.activeLoad} history={d.workload.totalHistory} categories={d.workload.categoryLoad} categoryLabels={categories} />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-black mb-4">Workload Aktif</h2>
        {d.workload.active.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
            <p className="text-slate-500 font-medium text-sm">Belum memiliki workload aktif.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {d.workload.active.map(item => (
              <ActiveWorkloadCard key={item.id} item={item} categories={categories} />
            ))}
          </div>
        )}
      </div>

      {d.workload.planned.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-black mb-4">Workload Terencana</h2>
          <div className="space-y-4">
            {d.workload.planned.map(item => (
              <ActiveWorkloadCard key={item.id} item={item} categories={categories} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-black mb-4">Riwayat Workload</h2>
        <WorkloadHistory history={d.workload.history} categories={categories} />
      </div>

      {d.internship.history.length > 1 && (
        <div className="mt-8">
          <h2 className="text-xl font-black mb-4">Riwayat Magang</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {d.internship.history.map(item => (
              <InternshipCard key={item.id} internship={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export function StudentStatusSummary({state,onOpen}: {state: StudentStatusState; onOpen: () => void}) {
  if (!state.data || state.loading || state.error) return <Feedback state={state}/>;
  const d=state.data;
  return (
    <button type="button" aria-label="Buka Status Saya" onClick={onOpen} className="cursor-pointer w-full text-left">
      <SummaryCards 
        memberStatus={membershipLabel(d.membership)}
        memberApproval={d.membership.isApproved ? 'Disetujui' : 'Menunggu'}
        startupName={d.startup?.name || 'Belum tergabung'}
        startupPosition={startupPositionLabel(d.startup?.position)}
        internshipStatus={d.internship.current ? internshipLabels[d.internship.current.status] : 'Tidak Magang'}
        internshipStartup={d.internship.current?.startupName || '-'}
        workloadActive={d.workload.activeLoad}
      />
    </button>
  );
}
