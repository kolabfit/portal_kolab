
import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      setError("Camera access was denied or is not available on this device.");
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const data = canvas.toDataURL('image/png');
      setCaptured(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] overflow-hidden w-full max-w-lg shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Biometric Capture</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Identification Terminal</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-300 hover:text-slate-900"><X size={20} /></button>
        </div>
        
        <div className="relative aspect-video bg-slate-900 overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-10 text-center">
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <p className="font-bold text-sm tracking-tight">{error}</p>
              <button onClick={onClose} className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Go Back</button>
            </div>
          ) : !captured ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={captured} className="w-full h-full object-cover animate-in fade-in duration-500" alt="Captured" />
          )}
          
          {!captured && !error && (
            <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
              <div className="w-full h-full border border-white/30 rounded-2xl"></div>
            </div>
          )}
        </div>

        <div className="p-10 flex justify-center gap-4 bg-slate-50/50">
          {!error && (!captured ? (
            <button 
              onClick={takePhoto}
              className="w-20 h-20 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group"
            >
              <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center">
                <Camera size={32} className="group-hover:rotate-12 transition-transform" />
              </div>
            </button>
          ) : (
            <>
              <button 
                onClick={() => setCaptured(null)}
                className="flex-1 py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm"
              >
                <RefreshCw size={18} /> Retake
              </button>
              <button 
                onClick={() => { onCapture(captured); onClose(); }}
                className="flex-1 py-5 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-700 transition-all shadow-xl shadow-orange-100"
              >
                <Check size={18} /> Approve
              </button>
            </>
          ))}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraCapture;
