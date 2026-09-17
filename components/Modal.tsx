import React from 'react';
import { CheckCircle2, AlertCircle, Info, X, HelpCircle } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'info' | 'confirm';

interface ModalProps {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
}

/**
 * Global Modal Component (V16.1.0 Full Coverage)
 * Komponen modal yang dioptimasi untuk menutupi seluruh layar layout secara total.
 */
const Modal: React.FC<ModalProps> = ({ isOpen, type, title, message, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={48} />;
      case 'error': return <AlertCircle className="text-red-500" size={48} />;
      case 'confirm': return <HelpCircle className="text-orange-500" size={48} />;
      default: return <Info className="text-blue-500" size={48} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* BACKGROUND OVERLAY: Menjamin cakupan 100% halaman dengan posisi fixed */}
      <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={type !== 'confirm' ? onClose : undefined}
      />
      
      {/* MODAL CONTENT CONTAINER */}
      <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-[0_32px_80px_-15px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="p-10 pt-14 flex flex-col items-center text-center">
          <div className="mb-8 p-5 bg-slate-50 rounded-[2rem] shadow-inner">
            {getIcon()}
          </div>
          
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-3 leading-none">
            {title}
          </h3>
          
          <p className="text-slate-500 font-bold leading-relaxed mb-12 px-6 text-sm">
            {message}
          </p>
          
          <div className="w-full flex flex-col sm:flex-row gap-4">
            {type === 'confirm' ? (
              <>
                <button 
                  onClick={onClose}
                  className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { onConfirm?.(); onClose(); }}
                  className="flex-1 py-5 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-100"
                >
                  Proceed
                </button>
              </>
            ) : (
              <button 
                onClick={onClose}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95"
              >
                Dismiss Protocol
              </button>
            )}
          </div>
        </div>
        
        {type !== 'confirm' && (
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-2.5 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X size={22} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Modal;