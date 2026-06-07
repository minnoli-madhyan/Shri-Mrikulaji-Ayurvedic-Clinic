import { useEffect, useRef } from 'react';

/**
 * Safe GSAP hook — scoped cleanup using gsap.context()
 */
export const useGSAP = (callback, deps = []) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;

    if (!gsap) return;

    if (ST) gsap.registerPlugin(ST);

    const ctx = gsap.context(() => {
      savedCallback.current(gsap, ST);
    });

    return () => {
      ctx.revert();
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default useGSAP;