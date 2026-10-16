import { useEffect, useRef, useState } from 'react';

// Warm tones shown while an image loads, or if it hasn't been added yet.
const TONES = {
  sand: 'from-[#d9d2c3] via-[#cfc6b4] to-[#bdb29c]',
  dusk: 'from-[#5b4d3c] via-[#3e342a] to-[#221d17]',
  night: 'from-[#2c251d] via-[#1d1914] to-[#100e0b]',
  clay: 'from-[#c9a888] via-[#b08a68] to-[#8c6a4d]',
};

/**
 * Square-cornered photo that fills its box. If the file is missing it quietly
 * falls back to a warm gradient, so the layout never breaks.
 */
export default function Photo({ src, alt = '', tone = 'sand', className = '', imgClassName = '', priority = false }) {
  const [state, setState] = useState('loading'); // loading | loaded | error
  const ref = useRef(null);

  // A cached image can finish loading before React attaches onLoad; catch that case.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) setState(img.naturalWidth ? 'loaded' : 'error');
  }, [src]);
  // The <img> is absolutely positioned, so the box needs positioning, but don't fight an `absolute` passed in.
  const position = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative';

  return (
    <div className={`${position} overflow-hidden bg-gradient-to-br ${TONES[tone]} ${className}`}>
      {src && state !== 'error' && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${
            state === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}
