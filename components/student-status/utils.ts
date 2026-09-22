import { StudentWorkloadSummary, StudentInternshipSummary } from '../../types';

export function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return 'Belum ditentukan';
  
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  
  const s = start ? new Date(start).toLocaleDateString('id-ID', options) : '...';
  const e = end ? new Date(end).toLocaleDateString('id-ID', options) : '...';
  
  if (!start) return `... — ${e}`;
  if (!end) return `${s}`;
  
  return `${s} — ${e}`;
}

export function periodWorkload(item: StudentWorkloadSummary) {
  return formatDateRange(item.startDate, item.endDate);
}

export function periodInternship(item: StudentInternshipSummary) {
  return formatDateRange(item.startDate, item.endDate);
}

export function getBadgeColor(status: string) {
  const s = status.toUpperCase();
  if (['ACTIVE', 'AKTIF'].includes(s)) return 'bg-green-100 text-green-700 border-green-200';
  if (['SEDANG MAGANG', 'ONGOING'].includes(s)) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (['COMPLETED', 'SELESAI'].includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (['CANCELLED', 'DIBATALKAN'].includes(s)) return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}
