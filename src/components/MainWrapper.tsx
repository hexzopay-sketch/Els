"use client";
import { useAuth } from "@/contexts/AuthContext";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const { isLogged } = useAuth();
  return (
    <main className={isLogged ? "md:ml-16" : ""}>{children}</main>
  );
}
