import { useEffect, useState } from 'react';

export function useDelayedLoading(isLoading: boolean, delay = 400): boolean {
  const [showDelayedLoading, setShowDelayedLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowDelayedLoading(false);
      return;
    }

    const timer = setTimeout(() => setShowDelayedLoading(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return showDelayedLoading;
}
