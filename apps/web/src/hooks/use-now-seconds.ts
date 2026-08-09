"use client";

import { useEffect, useState } from "react";

export function useNowSeconds() {
  const [nowSeconds, setNowSeconds] = useState(0n);

  useEffect(() => {
    const updateNow = () => setNowSeconds(BigInt(Math.floor(Date.now() / 1_000)));
    updateNow();
    const interval = window.setInterval(updateNow, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return nowSeconds;
}
