"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Server, Activity, Zap, Users, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { slideUp, cardStagger } from "@/lib/motion-variants";
import Loader from "@/components/Loader";

const AttacksChart = dynamic(() => import("@/components/AttacksChart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center">
      <Loader variant={1} />
    </div>
  ),
});

interface Stat {
  label: string;
  value: number;
  icon: React.ReactNode;
  change?: string;
}

interface AttackData {
  name: string;
  attacks: number;
}

function AnimatedValue({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.floor(value / 30));
    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(interval);
      } else {
        setDisplayed(start);
      }
    }, duration / 30);
    return () => clearInterval(interval);
  }, [value]);
  return <>{displayed.toLocaleString("en-US")}</>;
}

export default function Dashboard() {
  const [attacksData, setAttacksData] = useState<AttackData[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard");
        const data = res.data;
        setAttacksData(data.attacks_last_7_days);
        setStats([
          { label: "Active Servers", value: data.active_servers, icon: <Server size={18} /> },
          { label: "Total Attacks", value: data.total_attacks, icon: <Activity size={18} /> },
          { label: "Running", value: data.running_attacks, icon: <Zap size={18} /> },
          { label: "Users", value: data.registered_users, icon: <Users size={18} /> },
        ]);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#e6edf3] tracking-tight">Dashboard</h1>
            <p className="text-sm text-[#8b949e] mt-0.5">System overview &amp; statistics</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
            <span>System Online</span>
          </div>
        </div>

        <motion.div
          variants={cardStagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={slideUp}
              className="group relative rounded-lg border border-[#30363d] bg-[#161b22] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#58a6ff]/20 hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e] text-sm">{stat.label}</span>
                <span className="text-[#8b949e] group-hover:text-[#58a6ff] transition-colors duration-200">{stat.icon}</span>
              </div>
              <p className="text-xl font-semibold text-[#e6edf3]">
                <AnimatedValue value={stat.value} />
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="rounded-lg border border-[#30363d] bg-[#161b22] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#58a6ff]" />
            <h2 className="text-sm font-medium text-[#e6edf3]">Attacks (Last 7 Days)</h2>
          </div>
          <AttacksChart data={attacksData} />
        </motion.div>
      </div>
    </div>
  );
}
