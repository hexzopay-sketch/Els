"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Image, Clock, User, ShieldCheck } from "lucide-react";
import { slideUp, cardStagger } from "@/lib/motion-variants";
import Loader from "@/components/Loader";

interface Proof {
  id: string;
  type: string;
  url: string;
  caption: string;
  created_by: string;
  created_at: string;
}

export default function PowerProofPage() {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProofs = async () => {
      try {
        const res = await fetch("/api/v1/proofs");
        if (res.ok) {
          const data = await res.json();
          setProofs(Array.isArray(data) ? data : []);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchProofs();
  }, []);

  if (loading) return <Loader variant={1} />;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <motion.div variants={slideUp} initial="initial" animate="animate" className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-[#e6edf3]" />
          <div>
            <h1 className="text-lg font-semibold text-[#e6edf3] tracking-tight">Power Proof</h1>
            <p className="text-sm text-[#8b949e]">Verified attack results &amp; demonstrations</p>
          </div>
        </motion.div>

        {proofs.length === 0 ? (
          <motion.div variants={slideUp} initial="initial" animate="animate"
            className="text-center py-20 text-[#8b949e]"
          >
            <Image size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No proofs uploaded yet.</p>
          </motion.div>
        ) : (
          <motion.div
            variants={cardStagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {proofs.map((p) => (
              <motion.div key={p.id} variants={slideUp}
                className="group rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e6edf3]/20 hover:shadow-lg hover:shadow-black/20"
              >
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden">
                  {p.url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video src={p.url} className="w-full h-48 object-cover" controls />
                  ) : (
                    <img src={p.url} alt={p.caption || "Proof"} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" />
                  )}
                </a>
                <div className="p-3 space-y-1.5">
                  {p.caption && <p className="text-[#e6edf3] text-sm">{p.caption}</p>}
                  <div className="flex items-center gap-3 text-[#8b949e] text-xs">
                    <span className="flex items-center gap-1"><User size={12} />{p.created_by}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
