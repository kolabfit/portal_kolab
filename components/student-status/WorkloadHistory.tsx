import { StudentWorkloadSummary } from '../../types';
import { ActiveWorkloadCard } from './ActiveWorkloadCard';
import { History } from 'lucide-react';

export function WorkloadHistory({ history, categories }: { history: StudentWorkloadSummary[], categories: Record<string, string> }) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center mb-3">
          <History size={24} />
        </div>
        <p className="text-slate-500 font-medium text-sm">Belum ada riwayat workload.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map(item => (
        <ActiveWorkloadCard key={item.id} item={item} categories={categories} />
      ))}
    </div>
  );
}
