import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// A fresh CDN upload can still be processing when its first preview is loaded.
// Keep the saved Portal URL intact and retry without resetting the profile form.
const ImageAttempt: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, onError, onLoad, style, ...props }) => {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  return <span className="relative block w-full h-full" aria-busy={status === 'loading'}>
    {status === 'loading' && <span role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 text-orange-600">
      <Loader2 className="animate-spin" size={24} aria-hidden="true" />
      <span className="text-[10px] text-slate-500">Memuat foto...</span>
    </span>}
    <img {...props} key={attempt} src={src} style={{ ...style, visibility: status === 'loaded' ? 'visible' : 'hidden' }} onLoad={event => {
      if (timer.current !== null) clearTimeout(timer.current);
      setStatus('loaded');
      onLoad?.(event);
    }} onError={event => {
    if (attempt >= 3) {
      setStatus('failed');
      onError?.(event);
      return;
    }
    setStatus('loading');
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAttempt(value => value + 1), 5000);
    }} />
  </span>;
};

// A different source gets its own loading state and cancels the old retry timer.
const RetryImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = props =>
  <ImageAttempt key={props.src} {...props} />;

export default RetryImage;
