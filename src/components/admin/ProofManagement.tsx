"use client";
import { useState, useEffect, useRef, DragEvent } from "react";
import { motion } from "motion/react";
import { Trash2, Plus, Upload, FileImage } from "lucide-react";
import api from "@/lib/api";
import Loader from "@/components/Loader";

interface Proof {
  id: string;
  type: string;
  url: string;
  caption: string;
  created_by: string;
  created_at: string;
}

export default function ProofManagement() {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProofs = async () => {
    const token = localStorage.getItem("token");
    const res = await api.get("/proofs", { headers: { Authorization: `Bearer ${token}` } });
    setProofs(Array.isArray(res.data) ? res.data : []);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/upload", form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      const fileUrl = res.data.url;
      const type = file.type.startsWith("video") ? "video" : "image";
      await api.post("/proofs", { type, url: fileUrl, caption: caption.trim() }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setCaption("");
      await fetchProofs();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(apiErr.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this proof?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/proofs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProofs(proofs.filter((p) => p.id !== id));
    } catch { setError("Failed to delete"); }
  };

  useEffect(() => { fetchProofs().finally(() => setLoading(false)); }, []);

  if (loading) return <Loader variant={1} />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Power Proof Management</h2>

      {error && (
        <div className="p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-subtle/50 backdrop-blur-sm rounded-lg p-6 border border-border"
      >
        <h3 className="text-lg font-medium text-white mb-4">Upload Proof</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-text-muted text-xs mb-1 uppercase tracking-wider">Caption (optional)</label>
            <input type="text" placeholder="Description of this proof" value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader variant={1} />
                <p className="text-text-muted text-sm">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={32} className="text-text-muted" />
                <p className="text-text-muted text-sm mb-3">Drop an image/video here</p>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-primary text-background rounded-lg px-5 py-2 text-sm font-medium hover:brightness-110 transition-all"
                >
                  <Upload size={16} /> Upload File
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {proofs.map((p) => (
          <div key={p.id} className="bg-panel border border-border rounded-lg overflow-hidden group">
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
              {p.type === "video" ? (
                <video src={p.url} className="w-full h-40 object-cover" controls />
              ) : (
                <img src={p.url} alt={p.caption || "Proof"} className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
              )}
            </a>
            <div className="p-3 flex items-center justify-between">
              <div>
                {p.caption && <p className="text-white text-sm">{p.caption}</p>}
                <p className="text-text-muted text-xs">{p.created_by} &middot; {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleDelete(p.id)}
                className="p-1.5 rounded hover:bg-red-700 text-red-400 transition-colors" title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {proofs.length === 0 && !loading && (
          <p className="col-span-full text-center py-8 text-text-muted">No proofs yet.</p>
        )}
      </div>
    </div>
  );
}
