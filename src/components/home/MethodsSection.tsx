"use client";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Bomb } from "lucide-react";

interface Method {
  method: string;
  description: string;
  layer4: boolean;
  layer7: boolean;
  amplification: boolean;
  premium: boolean;
  concurrents: number;
  proxy: boolean;
}

export function MethodsSection() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<"L4" | "L7" | "AMP">("L7");

  useEffect(() => {
    fetch("/api/v1/methods")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMethods(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const l7Methods = methods.filter(m => m.layer7 && !m.amplification);
  const l4Methods = methods.filter(m => m.layer4 && !m.amplification);
  const ampMethods = methods.filter(m => m.amplification);

  const display = selectedLayer === "L7" ? l7Methods : selectedLayer === "L4" ? l4Methods : ampMethods;

  if (loading) return null;

  return (
    <section className="w-full max-w-6xl mx-auto py-16 px-4 md:px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold mb-10 text-center"
      >
        Attack Methods
      </motion.h2>

      <div className="flex justify-center gap-4 mb-8">
        {(["L7", "L4", "AMP"] as const).map((layer) => (
          <button
            key={layer}
            onClick={() => setSelectedLayer(layer)}
            className={`px-6 py-2 rounded-lg font-semibold border-2 transition-all ${selectedLayer === layer
                ? "bg-primary text-white border-primary"
                : "bg-transparent text-text border-muted hover:border-primary"
              }`}
          >
            {layer === "L7" ? "Layer 7" : layer === "L4" ? "Layer 4" : "AMP"}
          </button>
        ))}
      </div>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {display.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">
              No methods available for this layer.
            </p>
          )}
          {display.map((method, idx) => (
            <motion.div
              key={method.method}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
              className="bg-panel border border-muted rounded-lg p-4 flex items-start gap-3"
            >
              <Bomb className="text-primary mt-1" size={20} />
              <div>
                <h4 className="font-bold text-white mb-1">{method.method}</h4>
                <p className="text-sm text-text">{method.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
