"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Server, Activity, Zap, Users } from "lucide-react";
import api from "@/lib/api";
import { slideUp, slideLeft, slideRight, scaleIn, listStagger } from "@/lib/motion-variants";
import Loader from "@/components/Loader";

const AttacksChart = dynamic(() => import("@/components/AttacksChart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-lg bg-subtle border border-border flex items-center justify-center">
      <Loader variant={1} />
    </div>
  ),
});

interface Stat {
  label: string;
  value: number;
  icon: React.ReactNode;
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            System Online
          </div>
        </div>

        <motion.div variants={listStagger} initial="initial" animate="animate"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {stats.map((stat, i) => {
            const variants = [slideUp, slideLeft, slideRight, scaleIn];
            return (
              <motion.div
                key={i}
                variants={variants[i % 4]}
                className="bg-subtle border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-muted text-sm">{stat.label}</span>
                  <span className="text-text-muted">{stat.icon}</span>
                </div>
                <p className="text-xl font-semibold text-white">
                  <AnimatedValue value={stat.value} />
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div variants={slideUp} initial="initial" animate="animate"
          className="bg-subtle border border-border rounded-lg p-5"
        >
          <h2 className="text-sm font-medium text-white mb-4">Attacks (Last 7 Days)</h2>
          <AttacksChart data={attacksData} />
        </motion.div>
      </div>
    </div>
  );
}
