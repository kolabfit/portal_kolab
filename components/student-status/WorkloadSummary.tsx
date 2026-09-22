export function WorkloadSummary({ active, history, categories, categoryLabels }: { active: number, history: number, categories: Record<string, number>, categoryLabels: Record<string, string> }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-6">Workload Summary</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Load</p>
          <p className="text-2xl font-black text-slate-800">{active}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total History</p>
          <p className="text-2xl font-black text-slate-800">{history}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(categoryLabels).map(([key, label]) => (
           <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
             <span className="text-xs font-semibold text-slate-600 truncate mr-2">{label}</span>
             <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{categories[key as keyof typeof categories] || 0}</span>
           </div>
        ))}
      </div>
    </div>
  );
}
