"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trash2, Plus, Edit3, Info } from "lucide-react";
import Loader from "@/components/Loader";
import api from "@/lib/api";
import Checkbox from "@/components/Checkbox";

interface Method {
  method: string;
  description: string;
  layer4: boolean;
  layer7: boolean;
  amplification: boolean;
  premium: boolean;
  concurrents: number;
  proxy: boolean;
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}


export default function StressMethods() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingMethod, setEditingMethod] = useState("");

  // Form states
  const [method, setMethod] = useState("");
  const [description, setDescription] = useState("");
  const [layer4, setLayer4] = useState(false);
  const [layer7, setLayer7] = useState(false);
  const [amplification, setAmplification] = useState(false);
  const [premium, setPremium] = useState(false);
  const [concurrents, setConcurrents] = useState(1);
  const [proxy, setProxy] = useState(false);

  const fetchMethods = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/methods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMethods(res.data);
    } catch (err) {
      console.error("Failed to fetch methods:", err);
      setError("Failed to load methods");
    }
  };

  const resetForm = () => {
    setMethod("");
    setDescription("");
    setLayer4(false);
    setLayer7(false);
    setAmplification(false);
    setPremium(false);
    setProxy(false);
    setConcurrents(1);
    setIsEditing(false);
    setEditingMethod("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (method.trim() === "") {
      setError("Method name is required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const methodData = {
        method: method.trim(),
        description: description.trim(),
        layer4,
        layer7,
        amplification,
        premium,
        concurrents,
        proxy,
      };

      if (isEditing) {
        await api.put(`/methods/${editingMethod}`, methodData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", },
        });
      } else {
        await api.post("/methods", methodData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", },
        });
      }

      await fetchMethods();
      resetForm();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null) {
        const apiError = err as ApiError;
        const msg = apiError.response?.data?.detail || "Failed to process method";
        setError(msg);
      } else {
        setError("Failed to process method");
      }
    }

  };

  const handleEdit = (m: Method) => {
    setMethod(m.method);
    setDescription(m.description);
    setLayer4(m.layer4);
    setLayer7(m.layer7);
    setAmplification(m.amplification);
    setPremium(m.premium);
    setConcurrents(m.concurrents);
    setProxy(m.proxy);
    setIsEditing(true);
    setEditingMethod(m.method);
    setError("");
  };

  const handleDelete = async (methodName: string) => {
    if (!confirm(`Are you sure you want to delete the method "${methodName}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      await api.delete(`/methods/${methodName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMethods(methods.filter((m) => m.method !== methodName));
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null) {
        const apiError = err as ApiError;
        const msg = apiError.response?.data?.detail || "Failed to delete method";
        setError(msg);
      } else {
        setError("Failed to delete method");
      }
    }

  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchMethods();
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <Loader variant={1} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Attack Method Management</h2>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-600/20 border border-red-600 rounded-lg text-red-400"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-subtle/50 backdrop-blur-sm rounded-lg p-6 border border-border"
      >
        <h3 className="text-lg font-medium text-white mb-4">
          {isEditing ? "Edit Method" : "Add Method"}
        </h3>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-text-muted text-xs mb-1 uppercase tracking-wider">Method Name</label>
            <input
              type="text"
              placeholder="e.g. HTTP-FLOOD"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              required
              disabled={isEditing}
              className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-text-muted text-xs mb-1 uppercase tracking-wider">Description</label>
            <input
              type="text"
              placeholder="What this method does"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2 lg:col-span-2">
            <Checkbox checked={layer4} onChange={() => setLayer4(!layer4)} label="Layer 4 (network/transport attacks)" />
            <Checkbox checked={layer7} onChange={() => setLayer7(!layer7)} label="Layer 7 (application attacks)" />
            <Checkbox checked={amplification} onChange={() => setAmplification(!amplification)} label="Amplification (reflection)" />
            <Checkbox checked={premium} onChange={() => setPremium(!premium)} label="Premium (requires premium plan)" />
            <Checkbox checked={proxy} onChange={() => setProxy(!proxy)} label="Proxy (route through proxy)" />
          </div>

          <div>
            <label className="block text-text-muted text-xs mb-1 uppercase tracking-wider">Concurrent Threads</label>
            <input
              type="number"
              placeholder="1"
              value={concurrents}
              onChange={(e) => setConcurrents(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-text-muted text-[10px] mt-1">Number of parallel threads (default: 1)</p>
          </div>

          <div className="flex gap-2 md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="flex-1 bg-primary text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              {isEditing ? "Update" : "Add"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-muted transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* Table of methods */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-text-muted border border-border rounded-lg">
          <thead className="text-xs uppercase bg-background border-b border-border">
            <tr>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">L4</th>
              <th className="px-4 py-3">L7</th>
              <th className="px-4 py-3">Amplification</th>
              <th className="px-4 py-3">Premium</th>
              <th className="px-4 py-3">Proxy</th>
              <th className="px-4 py-3">Concurrents</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {methods.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-4 text-gray-500">
                  No methods found.
                </td>
              </tr>
            )}
            {methods.map((m) => (
              <tr key={m.method} className="border-b border-border hover:bg-subtle">
                <td className="px-4 py-2">{m.method}</td>
                <td className="px-4 py-2">{m.description}</td>
                <td className="px-4 py-2">{m.layer4 ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{m.layer7 ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{m.amplification ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{m.premium ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{m.proxy ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{m.concurrents}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(m)}
                    className="p-1 rounded hover:bg-muted"
                    title="Edit"
                    type="button"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.method)}
                    className="p-1 rounded hover:bg-red-700 text-red-400"
                    title="Delete"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
