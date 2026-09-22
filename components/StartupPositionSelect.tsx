import React from 'react';
import type { StartupPosition } from '../types';
import { STARTUP_POSITIONS, STARTUP_POSITION_LABELS } from '../startupPositions';

export default function StartupPositionSelect({ value, onChange }: {
  value: StartupPosition | '' | null; onChange: (value: StartupPosition | '') => void;
}) {
  return <div className="space-y-2">
    <label htmlFor="startupPosition" className="text-[10px] font-black text-slate-500 uppercase">Posisi di Startup *</label>
    <select id="startupPosition" name="startupPosition" required value={value || ''}
      onChange={e => onChange(e.target.value as StartupPosition | '')}
      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
      <option value="">Pilih posisi</option>
      {STARTUP_POSITIONS.map(position => <option key={position} value={position}>{STARTUP_POSITION_LABELS[position]}</option>)}
    </select>
  </div>;
}
