import type { StartupPosition } from './types';

export const STARTUP_POSITIONS: readonly StartupPosition[] = ['CEO', 'COO', 'CTO', 'CFO', 'CMO', 'MEMBER'];
export const STARTUP_POSITION_LABELS: Record<StartupPosition, string> = {
  CEO: 'CEO', COO: 'COO', CTO: 'CTO', CFO: 'CFO', CMO: 'CMO', MEMBER: 'Anggota'
};
export function startupPositionLabel(position?: StartupPosition | null): string {
  return position ? STARTUP_POSITION_LABELS[position] || '-' : '-';
}
