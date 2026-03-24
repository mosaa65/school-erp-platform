import * as React from "react";

export function useDebounceEffect(callback: () => void, delay: number, deps: React.DependencyList) {
  const timer = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
