import { useEffect, useRef } from 'react';

type Handler = () => void;

export function useClickOutside(handler: Handler, enabled = true) {
  const ref = useRef<any>(null);

  const handleClick = (event: any) => {
    if (enabled && ref.current && !ref.current.contains(event.target)) {
      handler();
    }
  };

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [enabled, handler]);

  return ref;
}
