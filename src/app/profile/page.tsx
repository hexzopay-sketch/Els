"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Copy, CheckCircle, Camera, X, Key, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { slideUp } from "@/lib/motion-variants";
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
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        <motion.div variants={slideUp} initial="initial" animate="animate"
          className="bg-subtle border border-border rounded-lg p-6"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div className={`w-20 h-20 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-white ${profile.avatar_url ? "hidden" : ""}`}>
                {initials}
              </div>
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="absolute -bottom-1 -right-1 bg-muted border border-border rounded-full p-1.5 hover:bg-border transition-colors"
              >
                <Camera size={14} className="text-text-muted" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-white">{profile.username}</h2>
            <p className="text-sm text-text-muted">{profile.email}</p>
          </div>

          {showUrlInput && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border rounded-lg p-4 mb-4"
            >
              <p className="text-xs text-text-muted mb-2">Profile photo URL</p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={saveAvatar}
                  disabled={saving || !avatarUrl}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {saving ? "..." : "Save"}
                </button>
                <button
                  onClick={() => setShowUrlInput(false)}
                  className="text-text-muted hover:text-white transition-colors p-2"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            <div className="bg-background border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">User ID</span>
                <button
                  onClick={() => copyToClipboard(profile.id, setCopiedId)}
                  className="text-text-muted hover:text-primary transition-colors"
                >
                  {copiedId ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
              <code className="block text-sm text-white break-words font-mono">{profile.id}</code>
            </div>

            <div className="bg-background border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Key size={13} className="text-text-muted" />
                  <span className="text-xs text-text-muted">API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => copyToClipboard(profile.api_key, setCopiedKey)}
                    className="text-text-muted hover:text-primary transition-colors"
                  >
                    {copiedKey ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <code className="block text-sm text-primary break-words font-mono">
                {showApiKey ? profile.api_key : profile.api_key.slice(0, 8) + "••••••••••••"}
              </code>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: "Plan", value: profile.plan },
              { label: "Role", value: profile.rule },
              { label: "Member Since", value: formatDate(profile.join_date) },
              { label: "Max Concurrents", value: String(profile.max_concurrents) },
              { label: "Max Duration", value: formatTime(profile.max_seconds) },
              { label: "Expires On", value: profile.expiration_date ? formatDate(profile.expiration_date) : "No expiration" },
            ].map((item) => (
              <div key={item.label} className="bg-background border border-border rounded-lg p-4">
                <p className="text-xs text-text-muted mb-0.5">{item.label}</p>
                <p className="text-sm text-white font-medium">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={14} className="text-text-muted" />
              <h3 className="text-sm font-medium text-white">Change Password</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="Current password"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary pr-9"
                />
                <button
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="New password"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPw || !pwCurrent || !pwNew || !pwConfirm}
                className="w-full py-2 bg-primary text-white text-sm font-medium rounded-md hover:brightness-110 transition-all disabled:opacity-50"
              >
                {changingPw ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <button
              onClick={logout}
              className="w-full py-2 bg-red-500/10 text-red-400 text-sm font-medium rounded-md hover:bg-red-500/20 transition-all"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
