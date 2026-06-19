"use client";
import { useState, useEffect, useCallback } from "react";

interface MathCaptchaProps {
  onVerify: (token: string) => void;
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max) + 1;
}

export default function MathCaptcha({ onVerify }: MathCaptchaProps) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [answer, setAnswer] = useState("");
  const [verified, setVerified] = useState(false);

  const generate = useCallback(() => {
    setA(randomInt(9));
    setB(randomInt(9));
    setAnswer("");
    setVerified(false);
    onVerify("");
  }, [onVerify]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleChange = (val: string) => {
    setAnswer(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num === a + b) {
      setVerified(true);
      onVerify(`${a}+${b}=${num}`);
    } else {
      setVerified(false);
      onVerify("");
    }
  };

  return (
    <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-2.5">
      <span className="text-sm text-white font-mono shrink-0">{a} + {b} = ?</span>
      <input
        type="text"
        value={answer}
        onChange={(e) => handleChange(e.target.value)}
        maxLength={2}
        className="w-12 bg-muted border border-border rounded text-center text-sm text-white py-1 focus:outline-none focus:border-primary/50 transition-colors"
      />
      <button
        type="button"
        onClick={generate}
        className="text-xs text-text-muted hover:text-white transition-colors shrink-0"
      >
        Refresh
      </button>
      {verified && <span className="text-xs text-success shrink-0">✓</span>}
    </div>
  );
}
