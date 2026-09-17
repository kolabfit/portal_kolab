
import React, { useState, useRef } from 'react';
import { Upload, File, X, Image as ImageIcon } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  currentValue?: string;
  label?: string;
  accept?: string;
  isImage?: boolean;
  className?: string;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, currentValue, label, accept, isImage, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className={className}>
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">{label}</label>}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[160px] ${isDragging ? 'border-orange-600 bg-orange-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100/50'}`}
      >
        <input ref={fileInputRef} type="file" className="hidden" accept={accept} onChange={handleChange} />
        
        {currentValue ? (
          <div className="w-full h-full flex flex-col items-center">
             {isImage ? (
               <img src={currentValue} className="w-24 h-24 object-contain rounded-xl shadow-sm mb-4" />
             ) : (
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm mb-4"><File size={32} /></div>
             )}
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Upload size={12} /> Ganti File
             </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mx-auto mb-4">
               <Upload size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarik file ke sini atau klik untuk cari</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropZone;
