"use client";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Zap, Clock, Star, Server } from "lucide-react";

interface Plan {
  name: string;
  max_concurrents: number;
  max_seconds: number;
  premium: boolean;
  api_access: boolean;
}

const prices: Record<string, string> = {
  Starter: "$9.99",
  Standard: "$19.99",
  Advanced: "$39.99",
  Enterprise: "$79.99",
};

export function PriceSection() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch("/api/v1/plans")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(() => {});
  }, []);

  if (plans.length === 0) return null;

  return (
    <section className="w-full max-w-6xl mx-auto py-16 px-4 md:px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold mb-12 text-center"
      >
        Choose Your Plan
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15, duration: 0.6 }}
            viewport={{ once: true }}
            className="group relative bg-panel border border-border rounded-xl p-6 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-xl font-bold text-white mb-2 relative">{plan.name}</h3>
            <p className="text-3xl font-extrabold text-primary mb-6 relative">{prices[plan.name] || "—"}</p>
            <ul className="space-y-3 text-sm text-text-muted mb-6 relative">
              <li className="flex items-center justify-center gap-2"><Zap size={16} />{plan.max_concurrents} concurrents</li>
              <li className="flex items-center justify-center gap-2"><Clock size={16} />{plan.max_seconds} seconds</li>
              <li className={`flex items-center justify-center gap-2 ${plan.premium ? "underline decoration-green-500 decoration-2 underline-offset-[6px]" : "line-through decoration-red-500 decoration-2"}`}>
                <Star size={16} /> Premium access
              </li>
              <li className={`flex items-center justify-center gap-2 ${plan.api_access ? "underline decoration-green-500 decoration-2 underline-offset-[6px]" : "line-through decoration-red-500 decoration-2"}`}>
                <Server size={16} /> API Access
              </li>
            </ul>
            <button className="w-full mt-auto bg-primary text-background font-semibold py-2 rounded-md hover:brightness-110 transition-all relative">
              Select Plan
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
