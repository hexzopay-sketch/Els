"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useRafFn(fn: () => void, active = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!active) return;
    let rafId: number;
    const loop = () => {
      fnRef.current();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [active]);
}

export function useRafState<T>(initial: T): [T, (v: T) => void, () => void] {
  const [state, setState] = useState(initial);
  const rafId = useRef<number>(0);

  const setRafState = useCallback((v: T) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => setState(v));
  }, []);

  const cancel = useCallback(() => {
    cancelAnimationFrame(rafId.current);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  return [state, setRafState, cancel];
}

export function useFps() {
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let rafId: number;
    const loop = () => {
      framesRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      if (delta >= 1000) {
        setFps(Math.round((framesRef.current * 1000) / delta));
        framesRef.current = 0;
        lastTimeRef.current = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return fps;
}
