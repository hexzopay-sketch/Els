"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Megaphone } from "lucide-react";

const seenBroadcasts = new Set<string>();

interface Broadcast {
  id: string;
  text: string;
  end_time: string;
  media_url: string;
  caption: string;
}

function isExpired(endTime: string): boolean {
  if (!endTime || endTime === "-") return false;
  return new Date(endTime).getTime() < Date.now();
}

export default function BroadcastPopup() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkBroadcasts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/broadcasts");
      if (!res.ok) return;
      const data: Broadcast[] = await res.json();
      const active = data.find((b) => !isExpired(b.end_time));
      if (active && !seenBroadcasts.has(active.id)) {
        setBroadcast(active);
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkBroadcasts();
  }, [checkBroadcasts]);

  useEffect(() => {
    if (!broadcast) return;
    const timer = setTimeout(dismiss, 30000);
    return () => clearTimeout(timer);
  }, [broadcast]);

  const dismiss = () => {
    if (broadcast) {
      seenBroadcasts.add(broadcast.id);
    }
    setBroadcast(null);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {broadcast && !dismissed && broadcast.media_url ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-lg w-full mx-4 bg-panel border border-border rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <X size={16} />
            </button>
            <div className="p-5 space-y-4">
              <div className="rounded-lg overflow-hidden bg-subtle">
                {broadcast.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video
                    src={broadcast.media_url}
                    controls
                    className="w-full max-h-[300px] object-contain"
                  />
                ) : (
                  <img
                    src={broadcast.media_url}
                    alt={broadcast.caption || "Broadcast media"}
                    className="w-full max-h-[300px] object-contain"
                  />
                )}
              </div>
              <p className="text-white text-sm leading-relaxed">{broadcast.text}</p>
              {broadcast.caption && (
                <p className="text-text-muted text-xs">{broadcast.caption}</p>
              )}
              <button
                onClick={dismiss}
                className="w-full py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : broadcast && !dismissed ? (
        <motion.div
          initial={{ opacity: 0, x: 80, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-4 right-4 z-[100] flex items-start gap-3 px-5 py-4 rounded-xl shadow-2xl border text-sm bg-primary/90 border-primary/50 text-white max-w-sm"
          onClick={dismiss}
        >
          <Megaphone size={18} className="shrink-0 mt-0.5 text-white/80" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">Broadcast</p>
            <p className="text-white/90 text-sm leading-relaxed">{broadcast.text}</p>
            {broadcast.caption && (
              <p className="text-white/60 text-xs mt-1">{broadcast.caption}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
