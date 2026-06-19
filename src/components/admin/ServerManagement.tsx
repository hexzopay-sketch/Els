"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X } from "lucide-react";
import api from "@/lib/api";
import Loader from "@/components/Loader";
import { useToast } from "@/components/ToastPopup";

interface Bot {
  id: string;
  ip: string;
  arch: string;
  cpu: number;
  username: string;
  online: boolean;
  last_seen: string;
}

export default function ServerManagement() {
  const [servers, setServers] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newArch, setNewArch] = useState("x86_64");
  const [newCpu, setNewCpu] = useState(1);
  const { showToast } = useToast();

  const fetchServers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/servers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServers(res.data);
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const timer = setInterval(fetchServers, 5000);
    return () => clearInterval(timer);
  }, []);

  const addServer = async () => {
    if (!newIp) return;
    try {
      const token = localStorage.getItem("token");
      await api.post("/add-server", { ip: newIp, arch: newArch, cpu: newCpu }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      showToast("Server added", "success");
      setShowModal(false);
      setNewIp("");
      setNewArch("x86_64");
      setNewCpu(1);
      fetchServers();
    } catch {
      showToast("Failed to add server", "error");
    }
  };

  if (loading) {
    return <Loader variant={1} />;
  }

  const onlineCount = servers.filter((s) => s.online).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Server Management</h2>
          <p className="text-xs text-text-muted">{onlineCount}/{servers.length} online</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-primary text-white text-xs px-3 py-1.5 rounded-md hover:brightness-110 transition-all"
        >
          <Plus size={14} />
          Add Server
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">ID</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">IP</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Arch</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">CPU</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {servers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-text-muted">
                  No servers connected
                </td>
              </tr>
            ) : (
              servers.map((s) => (
                <tr key={s.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-text-muted">{s.id.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 font-mono text-white">{s.ip}</td>
                  <td className="px-3 py-2.5 text-text-muted">{s.arch}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-text-muted">{s.cpu} cores</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs ${s.online ? "text-success" : "text-text-muted"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.online ? "bg-success" : "bg-border"}`} />
                      {s.online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-muted font-mono">
                    {new Date(s.last_seen).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-subtle border border-border rounded-lg p-5 w-full max-w-sm mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Add Server</h3>
                <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">IP Address</label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Architecture</label>
                  <input
                    type="text"
                    value={newArch}
                    onChange={(e) => setNewArch(e.target.value)}
                    placeholder="x86_64"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">CPU Cores</label>
                  <input
                    type="number"
                    value={newCpu}
                    onChange={(e) => setNewCpu(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
                <button
                  onClick={addServer}
                  disabled={!newIp}
                  className="w-full bg-primary text-white text-sm py-2 rounded-md hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
