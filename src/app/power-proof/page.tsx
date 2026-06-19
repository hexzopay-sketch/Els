"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Image, Clock, User } from "lucide-react";
import { slideUp } from "@/lib/motion-variants";
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
          setProofs(data);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchProofs();
  }, []);

  if (loading) return <Loader variant={1} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <motion.div variants={slideUp} initial="initial" animate="animate" className="flex items-center gap-3">
          <Image size={24} className="text-primary" />
          <h1 className="text-xl font-semibold text-white">Power Proof</h1>
        </motion.div>

        {proofs.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            <Image size={48} className="mx-auto mb-3 opacity-40" />
            <p>No proofs uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {proofs.map((p) => (
              <motion.div key={p.id} variants={slideUp} initial="initial" animate="animate"
                className="bg-panel border border-border rounded-lg overflow-hidden group"
              >
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                  {p.url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video src={p.url} className="w-full h-48 object-cover" controls />
                  ) : (
                    <img src={p.url} alt={p.caption || "Proof"} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                </a>
                <div className="p-3 space-y-1.5">
                  {p.caption && <p className="text-white text-sm">{p.caption}</p>}
                  <div className="flex items-center gap-3 text-text-muted text-xs">
                    <span className="flex items-center gap-1"><User size={12} />{p.created_by}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
