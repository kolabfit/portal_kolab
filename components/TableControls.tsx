import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export const TablePagination: React.FC<PaginationProps> = ({ page, totalPages, totalRows, pageSize = 10, onPageChange }) => {
  if (!totalRows) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalRows);
  return (
    <div className="px-6 py-5 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Menampilkan {first}-{last} dari {totalRows} data · Halaman {page}/{Math.max(totalPages, 1)}
      </span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="p-3 bg-white rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-orange-50">
          <ChevronLeft size={16} />
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="p-3 bg-white rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-orange-50">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
