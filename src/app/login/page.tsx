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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const { showToast } = useToast();
  const { login, admin } = useAuth();
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
      login(token);
      admin(isadmin);
      showToast("Logged in successfully!", "success");
      router.push("/dashboard");
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md relative"
      >
        <motion.div variants={slideRight} initial="initial" animate="animate"
          className="bg-panel border border-border rounded-xl p-8"
        >
          <div className="text-center mb-8">
            <motion.img
              variants={scaleIn} initial="initial" animate="animate"
              src="imagens/logo.png"
              alt="Logo"
              className="h-16 mx-auto mb-4"
            />
            <motion.h1 variants={slideLeft} initial="initial" animate="animate"
              className="text-2xl font-bold text-white"
            >
              Sign In
            </motion.h1>
            <p className="text-text-muted mt-1 text-sm">Sign in to access all features</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <motion.div variants={slideRight} initial="initial" animate="animate"
              className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-background focus-within:border-primary/50 transition-colors"
            >
              <User size={18} className="text-text-muted shrink-0" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-transparent text-white placeholder-text-muted focus:outline-none text-sm"
              />
            </motion.div>

            <motion.div variants={slideLeft} initial="initial" animate="animate"
              className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-background focus-within:border-primary/50 transition-colors"
            >
              <Lock size={18} className="text-text-muted shrink-0" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent text-white placeholder-text-muted focus:outline-none text-sm"
              />
            </motion.div>

            <motion.div variants={scaleIn} initial="initial" animate="animate">
              <MathCaptcha onVerify={setCaptchaToken} />
            </motion.div>

            <motion.button
              type="submit"
              disabled={isDisabled}
              variants={scaleIn} initial="initial" animate="animate"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-primary text-white font-medium py-2.5 rounded-lg text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </motion.button>

            <p className="text-center text-sm text-text-muted">
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-primary hover:underline">Register</a>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
