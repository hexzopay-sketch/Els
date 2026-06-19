"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoginPage from "@/app/login/page";

export default function Home() {
  const { isLogged, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) return null;

  if (isLogged) {
    router.replace("/dashboard");
    return null;
  }

  return <LoginPage />;
}
