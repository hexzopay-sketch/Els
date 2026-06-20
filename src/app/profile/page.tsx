"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Copy, CheckCircle, Camera, X, Key, Lock, Eye, EyeOff, User, Calendar, Cpu, Clock, Shield } from "lucide-react";
import { motion } from "motion/react";
import { slideUp, cardStagger } from "@/lib/motion-variants";
import { useToast } from "@/components/ToastPopup";
import { useAuth } from "@/contexts/AuthContext";

type Profile = {
  id: string;
  username: string;
  email: string;
  plan: string;
  rule: string;
  join_date: string;
  max_concurrents: number;
  max_seconds: number;
  expiration_date: string | null;
  avatar_url: string;
  api_key: string;
};

export default function ProfilePage() {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { logout } = useAuth();

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/profile");
        setProfile(response.data);
        setAvatarUrl(response.data.avatar_url || "");
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const saveAvatar = async () => {
    setSaving(true);
    try {
      await api.put("/profile", { avatar_url: avatarUrl }, {
        headers: { "Content-Type": "application/json" },
      });
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      setShowUrlInput(false);
      showToast("Profile photo updated", "success");
    } catch (err) {
      showToast("Failed to save", "error");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew) {
      showToast("Fill in all password fields", "error");
      return;
    }
    if (pwNew !== pwConfirm) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (pwNew.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    setChangingPw(true);
    try {
      await api.put("/profile", {
        password: pwCurrent,
        new_password: pwNew,
      }, { headers: { "Content-Type": "application/json" } });
      showToast("Password changed", "success");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      showToast(axiosErr.response?.data?.detail || "Failed to change password", "error");
    }
    setChangingPw(false);
  };

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {}
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const initials = profile?.username?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?";

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-lg mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <motion.div
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#e6edf3]/5 to-transparent p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#30363d]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 rounded-full bg-[#21262d] flex items-center justify-center text-xl font-bold text-[#e6edf3] ${profile.avatar_url ? "hidden" : ""}`}>
                  {initials}
                </div>
                <button
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="absolute -bottom-1 -right-1 bg-[#21262d] border border-[#30363d] rounded-full p-1.5 hover:bg-[#30363d] transition-colors"
                >
                  <Camera size={14} className="text-[#8b949e]" />
                </button>
              </div>
              <h2 className="text-lg font-semibold text-[#e6edf3]">{profile.username}</h2>
              <p className="text-sm text-[#8b949e]">{profile.email}</p>
            </div>

            {showUrlInput && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 mt-4"
              >
                <p className="text-xs text-[#8b949e] mb-2">Profile photo URL</p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 bg-[#21262d] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#e6edf3]"
                  />
                  <button
                    onClick={saveAvatar}
                    disabled={saving || !avatarUrl}
                    className="bg-[#e6edf3] text-background px-4 py-2 rounded-md text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => setShowUrlInput(false)}
                    className="text-[#8b949e] hover:text-[#e6edf3] transition-colors p-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-6 pt-0 space-y-3">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#8b949e]">User ID</span>
                <button
                  onClick={() => copyToClipboard(profile.id, setCopiedId)}
                  className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                >
                  {copiedId ? <CheckCircle size={14} className="text-[#3fb950]" /> : <Copy size={14} />}
                </button>
              </div>
              <code className="block text-sm text-[#e6edf3] break-words font-mono">{profile.id}</code>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Key size={13} className="text-[#8b949e]" />
                  <span className="text-xs text-[#8b949e]">API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => copyToClipboard(profile.api_key, setCopiedKey)}
                    className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                  >
                    {copiedKey ? <CheckCircle size={14} className="text-[#3fb950]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <code className="block text-sm text-[#e6edf3] break-words font-mono">
                {showApiKey ? profile.api_key : profile.api_key.slice(0, 8) + "••••••••••••"}
              </code>
            </div>
          </div>

          <div className="px-6 pb-6 grid grid-cols-2 gap-3">
            {[
              { label: "Plan", value: profile.plan, icon: Shield },
              { label: "Role", value: profile.rule, icon: User },
              { label: "Member Since", value: formatDate(profile.join_date), icon: Calendar },
              { label: "Max Concurrents", value: String(profile.max_concurrents), icon: Cpu },
              { label: "Max Duration", value: formatTime(profile.max_seconds), icon: Clock },
              { label: "Expires On", value: profile.expiration_date ? formatDate(profile.expiration_date) : "No expiration", icon: Calendar },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className="text-[#8b949e]" />
                    <p className="text-xs text-[#8b949e]">{item.label}</p>
                  </div>
                  <p className="text-sm text-[#e6edf3] font-medium">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#30363d] px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={14} className="text-[#8b949e]" />
              <h3 className="text-sm font-medium text-[#e6edf3]">Change Password</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="Current password"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#e6edf3] pr-9"
                />
                <button
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="New password"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#e6edf3]"
              />
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#e6edf3]"
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPw || !pwCurrent || !pwNew || !pwConfirm}
                className="w-full py-2 bg-[#e6edf3] text-background text-sm font-medium rounded-md hover:brightness-110 transition-all disabled:opacity-50"
              >
                {changingPw ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>

          <div className="border-t border-[#30363d] px-6 py-4">
            <button
              onClick={logout}
              className="w-full py-2 bg-[#f85149]/10 text-[#f85149] text-sm font-medium rounded-md hover:bg-[#f85149]/20 transition-all"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
