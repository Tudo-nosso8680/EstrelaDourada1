import { useEffect } from 'react';

const INACTIVITY_MS = 10 * 60 * 1000;

export function useInactivity(onTimeout: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function reset() {
      clearTimeout(timer);
      timer = setTimeout(onTimeout, INACTIVITY_MS);
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'wheel'];

    events.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [onTimeout]);
}
