"use client";
import api from "@/lib/api";
import { useState } from "react";
import { motion } from "motion/react";
import { Lock, User } from "lucide-react";
import { useToast } from "@/components/ToastPopup";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { slideRight, slideLeft, scaleIn } from "@/lib/motion-variants";
import MathCaptcha from "@/components/MathCaptcha";
import CircularText from "@/components/CircularText";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const { showToast } = useToast();
  const { loginWithTransition, admin } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      showToast("Solve the math question", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post("/login",
        new URLSearchParams({ username, password, captcha: captchaToken }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const token = response.data.access_token;
      const isadmin = response.data.admin;
      loginWithTransition(token, isadmin, "/dashboard");
      showToast("Logged in successfully!", "success");
    } catch (err) {
      const error = err as AxiosError<{ detail: string }>;
      if (error.response) {
        showToast(error.response.data.detail || "Server error", "error");
      } else if (error.request) {
        showToast("Connection error. Check if server is running.", "error");
      } else {
        showToast("Unknown error", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !username || !password || isSubmitting || !captchaToken;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4 relative overflow-hidden">
      <CircularText text="EL7STRESSER • SECURE AUTHENTICATION • HIGH PERFORMANCE • " />
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <img
              src="imagens/logo.png"
              alt="Logo"
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-xl font-semibold text-[#e6edf3]">
              Sign In
            </h1>
            <p className="text-[#8b949e] mt-2 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#e6edf3] block">Username</label>
              <div className="flex items-center gap-3 border border-[#30363d] rounded-md px-3 py-2 bg-[#0d1117] focus-within:border-[#e6edf3] transition-colors">
                <User size={16} className="text-[#8b949e] shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#e6edf3] placeholder:text-[#484f58] w-full text-sm"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#e6edf3] block">Password</label>
              <div className="flex items-center gap-3 border border-[#30363d] rounded-md px-3 py-2 bg-[#0d1117] focus-within:border-[#e6edf3] transition-colors">
                <Lock size={16} className="text-[#8b949e] shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#e6edf3] placeholder:text-[#484f58] w-full text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <div className="pt-2">
              <MathCaptcha onVerify={setCaptchaToken} />
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full bg-[#238636] text-white font-medium py-2 rounded-md text-sm hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4 border border-[rgba(240,246,252,0.1)]"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#8b949e]">
            Don't have an account?{" "}
            <button onClick={() => router.push("/register")} className="text-[#e6edf3] hover:underline">
              Create an account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
