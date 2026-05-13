"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

export default function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: Props) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const startVal = 0;
    const delta = value - startVal;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic for a satisfying count-up
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startVal + delta * eased;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted = display.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
