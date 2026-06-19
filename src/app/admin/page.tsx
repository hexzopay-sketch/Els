"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import { Users, CreditCard, BombIcon, Server, BookOpen, Megaphone, Image as ImageIcon } from "lucide-react";
import Loader from "@/components/Loader";

const loading = () => <Loader variant={1} />;

const UserManagement = dynamic(() => import("@/components/admin/UserManagement"), { ssr: false, loading });
const PlanManagement = dynamic(() => import("@/components/admin/PlanManagement"), { ssr: false, loading });
const StressMethods = dynamic(() => import("@/components/admin/StressMethods"), { ssr: false, loading });
const ServerManagement = dynamic(() => import("@/components/admin/ServerManagement"), { ssr: false, loading });
const AdminApiDocs = dynamic(() => import("@/components/admin/AdminApiDocs"), { ssr: false, loading });
const BroadcastManagement = dynamic(() => import("@/components/admin/BroadcastManagement"), { ssr: false, loading });
const ProofManagement = dynamic(() => import("@/components/admin/ProofManagement"), { ssr: false, loading });

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "plans", label: "Plans", icon: CreditCard },
  { id: "methods", label: "Methods", icon: BombIcon },
  { id: "servers", label: "Servers", icon: Server },
  { id: "broadcast", label: "Broadcast", icon: Megaphone },
  { id: "api", label: "API", icon: BookOpen },
  { id: "proofs", label: "Proofs", icon: ImageIcon },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-lg font-semibold text-white">Admin</h1>

        <div className="flex gap-0.5 bg-subtle border border-border rounded-lg p-0.5 w-full sm:w-fit overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:text-white"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {activeTab === "users" && <UserManagement />}
            {activeTab === "plans" && <PlanManagement />}
            {activeTab === "methods" && <StressMethods />}
            {activeTab === "servers" && <ServerManagement />}
            {activeTab === "broadcast" && <BroadcastManagement />}
            {activeTab === "api" && <AdminApiDocs />}
            {activeTab === "proofs" && <ProofManagement />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
