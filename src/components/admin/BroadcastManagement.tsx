"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SlideUp } from "@/lib/motion-variants";
import { Trash2, Plus, X } from "lucide-react";

interface Broadcast {
  id: string;
  text: string;
  end_time: string;
  media_url: string;
  caption: string;
  created_by: string;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function BroadcastManagement() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [text, setText] = useState("");
  const [endTime, setEndTime] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");

  const fetchBroadcasts = async () => {
    const t = getToken();
    if (!t) return;
    const res = await fetch("/api/v1/broadcasts", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setBroadcasts(data);
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleCreate = async () => {
    if (!text.trim()) return;
    const t = getToken();
    if (!t) return;
    await fetch("/api/v1/broadcasts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({
        text,
        end_time: endTime,
        media_url: mediaUrl,
        caption,
      }),
    });
    setText("");
    setEndTime("");
    setMediaUrl("");
    setCaption("");
    setShowModal(false);
    fetchBroadcasts();
  };

  const handleDelete = async (id: string) => {
    const t = getToken();
    if (!t) return;
    await fetch(`/api/v1/broadcasts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    });
    fetchBroadcasts();
  };

  return (
    <motion.div variants={SlideUp} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Broadcasts</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/80 transition-colors"
        >
          <Plus size={14} />
          Add Broadcast
        </button>
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
              className="bg-subtle border border-border rounded-lg p-5 w-full max-w-sm mx-4 space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-white">New Broadcast</h3>
                <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Broadcast text"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-white text-sm placeholder:text-text-muted outline-none focus:border-primary transition-colors"
              />
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-white text-sm outline-none focus:border-primary transition-colors [color-scheme:dark]"
              />
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Media URL (optional)"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-white text-sm placeholder:text-text-muted outline-none focus:border-primary transition-colors"
              />
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Media caption (optional)"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-white text-sm placeholder:text-text-muted outline-none focus:border-primary transition-colors"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={!text.trim()}
                  className="flex-1 py-2 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/80 disabled:opacity-40 transition-colors"
                >
                  Publish
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-background text-text-muted text-xs font-medium rounded-md hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-text-muted font-medium">Text</th>
              <th className="text-left py-2 px-3 text-text-muted font-medium">End Time</th>
              <th className="text-left py-2 px-3 text-text-muted font-medium">Media</th>
              <th className="text-left py-2 px-3 text-text-muted font-medium">Caption</th>
              <th className="text-left py-2 px-3 text-text-muted font-medium">By</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {broadcasts.map((b) => (
              <tr key={b.id} className="border-b border-border hover:bg-subtle/50 transition-colors">
                <td className="py-2 px-3 text-white max-w-[200px] truncate">{b.text}</td>
                <td className="py-2 px-3 text-text-muted">{b.end_time ? new Date(b.end_time).toLocaleString() : "-"}</td>
                <td className="py-2 px-3 text-text-muted max-w-[150px] truncate">{b.media_url || "-"}</td>
                <td className="py-2 px-3 text-text-muted max-w-[150px] truncate">{b.caption || "-"}</td>
                <td className="py-2 px-3 text-text-muted">{b.created_by}</td>
                <td className="py-2 px-3">
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {broadcasts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-muted text-sm">No broadcasts</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
