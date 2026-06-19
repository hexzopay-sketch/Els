"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import { Users, CreditCard, BombIcon, Server, BookOpen, Megaphone, Image as ImageIcon, Github } from "lucide-react";
import Loader from "@/components/Loader";

const loading = () => <Loader variant={1} />;

const UserManagement = dynamic(() => import("@/components/admin/UserManagement"), { ssr: false, loading });
const PlanManagement = dynamic(() => import("@/components/admin/PlanManagement"), { ssr: false, loading });
const StressMethods = dynamic(() => import("@/components/admin/StressMethods"), { ssr: false, loading });
const ServerManagement = dynamic(() => import("@/components/admin/ServerManagement"), { ssr: false, loading });
const AdminApiDocs = dynamic(() => import("@/components/admin/AdminApiDocs"), { ssr: false, loading });
const BroadcastManagement = dynamic(() => import("@/components/admin/BroadcastManagement"), { ssr: false, loading });
const ProofManagement = dynamic(() => import("@/components/admin/ProofManagement"), { ssr: false, loading });
const GitHubConfig = dynamic(() => import("@/components/admin/GitHubConfig"), { ssr: false, loading });

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "plans", label: "Plans", icon: CreditCard },
  { id: "methods", label: "Methods", icon: BombIcon },
  { id: "servers", label: "Servers", icon: Server },
  { id: "broadcast", label: "Broadcast", icon: Megaphone },
  { id: "api", label: "API", icon: BookOpen },
  { id: "proofs", label: "Proofs", icon: ImageIcon },
  { id: "github", label: "GitHub", icon: Github },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-[#e6edf3] tracking-tight">Admin</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">Manage users, plans, servers &amp; more</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive ? "text-[#e6edf3]" : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="admin-active-tab"
                        className="absolute inset-0 bg-[#21262d] rounded-md"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3">
                      <Icon size={16} className={isActive ? "text-[#58a6ff]" : "text-[#8b949e]"} />
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 md:p-6 shadow-sm"
              >
                {activeTab === "users" && <UserManagement />}
                {activeTab === "plans" && <PlanManagement />}
                {activeTab === "methods" && <StressMethods />}
                {activeTab === "servers" && <ServerManagement />}
                {activeTab === "broadcast" && <BroadcastManagement />}
                {activeTab === "api" && <AdminApiDocs />}
                {activeTab === "proofs" && <ProofManagement />}
                {activeTab === "github" && <GitHubConfig />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
