import { useState, useEffect } from 'react';

export default function useModalAnimation(isOpen, duration = 250) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return { shouldRender, isAnimatingOut };
}
