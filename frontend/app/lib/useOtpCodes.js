"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** Polls /otps/codes and refetches whenever any code's period ends. */
export function useOtpCodes(enabled, reloadKey) {
  const [codes, setCodes] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const fetching = useRef(false);

  const load = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const list = await api("/otps/codes");
      const at = Date.now();
      setCodes(Object.fromEntries(list.map((c) => [c.id, { ...c, expiresAt: at + c.remaining * 1000 }])));
    } catch {
      setTimeout(() => loadRef.current(), 5000);
    } finally {
      fetching.current = false;
    }
  }, []);
  const loadRef = useRef(load);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, reloadKey, load]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [enabled]);

  const values = Object.values(codes);
  const expired = values.some((c) => c.expiresAt <= now);
  useEffect(() => {
    if (enabled && expired) load();
  }, [enabled, expired, load]);

  const get = (id) => {
    const c = codes[id];
    if (!c) return null;
    return { code: c.code, period: c.period, remaining: Math.max(0, Math.ceil((c.expiresAt - now) / 1000)) };
  };

  return { get };
}
