"use client";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface AuthTransitionProps {
  isVisible: boolean;
  type: "login" | "logout";
  onComplete: () => void;
}

const DOT_COUNT = 8;

export default function AuthTransition({ isVisible, type, onComplete }: AuthTransitionProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setPhase(1);

      if (type === "login") {
        // 1. Spinner (1.2s) -> 2. Converge (0.4s) -> 3. Explode (0.5s) -> 4. Logo (1s) -> Redirect
        const t1 = setTimeout(() => setPhase(2), 1200);
        const t2 = setTimeout(() => setPhase(3), 1600);
        const t3 = setTimeout(() => setPhase(4), 2100);
        const t4 = setTimeout(() => { onComplete(); setPhase(0); }, 3155);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
      } else {
        const t1 = setTimeout(() => setPhase(2), 1000);
        const t2 = setTimeout(() => { onComplete(); setPhase(0); }, 1500);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    }
  }, [isVisible, type, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none overflow-hidden bg-[#0d1117]">
      {type === "login" && (
        <>
          {/* Spinner: 8 dots circling */}
          <AnimatePresence>
            {phase === 1 && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-1/2 left-1/2"
                style={{ x: -75, y: -75, width: 150, height: 150 }}
              >
                <motion.div
                  style={{ width: "100%", height: "100%", position: "relative" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
                >
                  {[...Array(DOT_COUNT)].map((_, i) => {
                    const angle = (i / DOT_COUNT) * 360;
                    const rad = (angle * Math.PI) / 180;
                    const radius = 60;
                    return (
                      <motion.div
                        key={i}
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                          left: `calc(50% + ${Math.cos(rad) * radius}px - 6px)`,
                          top: `calc(50% + ${Math.sin(rad) * radius}px - 6px)`,
                          backgroundColor: i % 2 === 0 ? "#e6edf3" : "#ffffff",
                          boxShadow: "0 0 8px rgba(88,166,255,0.6)",
                        }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 1.2,
                          ease: "easeInOut",
                          repeat: Infinity,
                          delay: (i / DOT_COUNT) * 0.5,
                        }}
                      />
                    );
                  })}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Converge: dots pull to center */}
          <AnimatePresence>
            {phase === 2 && (
              <div className="absolute top-1/2 left-1/2">
                {[...Array(DOT_COUNT)].map((_, i) => {
                  const angle = (i / DOT_COUNT) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const radius = 60;
                  return (
                    <motion.div
                      key={i}
                      initial={{
                        x: Math.cos(rad) * radius - 6,
                        y: Math.sin(rad) * radius - 6,
                        scale: 1,
                        opacity: 1,
                      }}
                      animate={{ x: -6, y: -6, scale: 1.5, opacity: 1 }}
                      transition={{ duration: 0.5, ease: "easeIn" }}
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: "#e6edf3",
                        boxShadow: "0 0 10px rgba(88,166,255,0.8)",
                      }}
                    />
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Explode: burst outward */}
          <AnimatePresence>
            {phase === 3 && (
              <div className="absolute top-1/2 left-1/2">
                {[...Array(DOT_COUNT)].map((_, i) => {
                  const angle = (i / DOT_COUNT) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const distance = 120;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, scale: 2, opacity: 1 }}
                      animate={{
                        x: Math.cos(rad) * distance,
                        y: Math.sin(rad) * distance,
                        scale: [2, 0.3, 0],
                        opacity: [1, 0.8, 0],
                      }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                      className="absolute w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#e6edf3" }}
                    />
                  );
                })}
                {/* Flash */}
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 15, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"
                />
              </div>
            )}
          </AnimatePresence>

          {/* Logo Reveal */}
          <AnimatePresence>
            {phase >= 4 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                className="flex flex-col items-center gap-4"
              >
                <img src="imagens/logo.png" alt="Logo" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(230,237,243,0.5)]" />
                <span className="text-2xl font-bold tracking-widest text-white">
                  EL7<span className="text-[#e6edf3]">STRESSER</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {type === "logout" && (
        <>
          {/* Shrink & fade out */}
          <AnimatePresence>
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={phase === 2 ? { scale: 0, opacity: 0 } : {}}
              transition={{ duration: 0.5, ease: "backIn" }}
              className="flex flex-col items-center gap-4"
            >
              <img src="imagens/logo.png" alt="Logo" className="w-24 h-24" />
              <span className="text-xl text-white tracking-widest">Goodbye</span>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}