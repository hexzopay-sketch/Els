"use client";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const { isLogged } = useAuth();
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");
  
  return (
    <main className={isLogged && !isAuthPage ? "md:ml-16" : ""}>{children}</main>
  );
}
