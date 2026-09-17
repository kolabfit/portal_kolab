import React from 'react';
import { UserProfile, AppAssets, UserRole } from '../types';

interface VirtualIDCardProps {
  profile: UserProfile;
  assets: AppAssets;
}

const VirtualIDCard: React.FC<VirtualIDCardProps> = ({ profile, assets }) => {
  const nameParts = profile.name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Generate initials for the watermark (visible if no background assets exist)
  const watermarkText = nameParts.map(n => n[0]).join('').toUpperCase().substring(0, 3);

  return (
    <div className="relative w-full max-w-[420px] aspect-[1/1.55] rounded-3xl overflow-hidden shadow-[0_32px_80px_-20px_rgba(0,0,0,0.2)] flex flex-col bg-white select-none group transition-all duration-500 hover:scale-[1.01]">
      
      {/* LAYER 1: BACKGROUND BACK (z-0) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {assets.bgBack ? (
          <img src={assets.bgBack} className="w-full h-full object-cover" alt="Card Background Back" />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-slate-100"></div>
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] font-black text-slate-900/[0.04] tracking-tighter uppercase whitespace-nowrap">
              {watermarkText}
            </div>
          </>
        )}
      </div>

      {/* LAYER 1.5: KODE DOSEN WATERMARK (z-5) - DI BELAKANG FOTO */}
      {profile.role === UserRole.LECTURER && profile.lecturerCode && (
        <div 
          className="absolute inset-0 z-[5] pointer-events-none overflow-hidden"
        >
          <div 
            className="absolute font-[1000] text-black/[0.08] uppercase text-right leading-none"
            style={{ 
              top: '100px', 
              right: '10px',
              fontSize: '80pt',
              letterSpacing: '-0.05em'
            }}
          >
            {profile.lecturerCode}
          </div>
        </div>
      )}

      {/* LAYER 2: PHOTO ID CARD (z-10) */}
      <div className="absolute inset-0 z-10">
        {profile.photoIdCard ? (
          <img 
            src={profile.photoIdCard} 
            className="w-full h-full object-cover object-center mask-fade-bottom" 
            alt={profile.name} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-transparent">
             <div className="w-48 h-48 rounded-full bg-slate-200/20 animate-pulse"></div>
          </div>
        )}
      </div>

      {/* LAYER 3: BACKGROUND FRONT (z-20) */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {assets.bgFront ? (
          <img src={assets.bgFront} className="w-full h-full object-cover" alt="Card Background Front" />
        ) : (
          // Default Front Overlay (Top Branding Shield)
          <div className="absolute top-8 right-8">
            <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 0C24 0 48 10.5 48 24.5C48 38.5 36.5 56 24 56C11.5 56 0 38.5 0 24.5C0 10.5 24 0 24 0Z" fill="#F1F5F9" />
              <path d="M24 6C24 6 40 13.5 40 24C40 34.5 32 48 24 48C16 48 8 34.5 8 24C8 13.5 24 6 24 6Z" fill="#64748B" />
              <path d="M24 6V18C24 18 32 21 32 24C32 27 24 30 24 30V48C32 48 40 34.5 40 24C40 13.5 24 6 24 6Z" fill="#64748B" />
              <path d="M24 6C16 6 8 13.5 8 24C8 34.5 16 48 24 48L24 6Z" fill="#EF4444" />
            </svg>
          </div>
        )}
      </div>

      {/* LAYER 4: DYNAMIC DATA TEXT (z-30) */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Main Data Container: Starts at 220px from top, Right Aligned at 10px offset */}
        <div className="absolute flex flex-col items-end text-right" style={{ top: '220px', right: '10px' }}>
          {/* NIP / NIM: 10pt, color #e8ba22 */}
          <div 
            className="font-black uppercase tracking-[0.2em] mb-1"
            style={{ fontSize: '10pt', color: '#e8ba22' }}
          >
            {profile.id}
          </div>
          
          {/* Nama Depan: 22pt */}
          <h1 
            className="font-[1000] text-slate-900 leading-[0.85] uppercase"
            style={{ fontSize: '22pt' }}
          >
            {firstName}
          </h1>
          
          {/* Nama Belakang: 13pt */}
          <h2 
            className="font-bold text-slate-900 uppercase opacity-90 mt-1"
            style={{ fontSize: '13pt' }}
          >
            {lastName}
          </h2>
        </div>
      </div>

      {/* LAYER 5: BOTTOM HUB BRANDING WEDGE (z-40) */}
      <div className="absolute bottom-0 left-0 z-40 w-full pointer-events-none">
        <div className="relative h-64">
           {!assets.bgFront && (
             <>
               <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-full h-full">
                  <path d="M0 200V80L400 200H0Z" fill="black" />
               </svg>
               <div className="absolute bottom-10 left-10 flex flex-col items-start">
                 <div className="flex flex-col leading-none">
                   <div className="text-white font-black text-3xl tracking-tighter">
                     Ko<span className="text-orange-600">+</span>Lab
                   </div>
                   <div className="text-white font-bold text-lg tracking-tight opacity-90 -mt-1">
                     Creative
                   </div>
                 </div>
                 <div className="mt-2 bg-orange-600 px-5 py-2 rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                   <span className="text-black font-black text-2xl tracking-tighter leading-none">HUB</span>
                 </div>
               </div>
             </>
           )}
        </div>
      </div>

      <style>{`
        .mask-fade-bottom {
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 78%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 0%, black 78%, transparent 100%);
        }
      `}</style>
    </div>
  );
};

export default VirtualIDCard;