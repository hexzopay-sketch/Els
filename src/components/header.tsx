"use client";
import Link from "next/link";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { LogOut } from "lucide-react";

export function Header() {
    const { toggleSidebar } = useSidebar();
    const { isLogged, logout } = useAuth();
    const [avatar, setAvatar] = useState<string | null>(null);

    useEffect(() => {
        if (!isLogged) return;
        api.get("/profile").then(res => {
            if (res.data?.avatar_url) setAvatar(res.data.avatar_url);
        }).catch(() => {});
    }, [isLogged]);

    return (
        <motion.header
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`sticky top-0 z-50 h-14 bg-subtle border-b border-border flex items-center px-4 md:px-6 ${isLogged ? "md:ml-16" : ""}`}
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSidebar}
                        className="text-text-muted hover:text-white transition-colors md:hidden"
                        aria-label="Menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <Link href="/" className="flex items-center gap-2">
                        <img src="imagens/logo.png" alt="Logo" className="h-8 w-auto" />
                        <span className="font-bold text-sm tracking-wide text-white hidden sm:block">
                            LEVL7<span className="text-primary">STRESSER</span>
                        </span>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    {isLogged ? (
                        <>
                            <Link href="/profile" className="hover:opacity-80 transition-opacity">
                                {avatar ? (
                                    <img
                                        src={avatar}
                                        alt="Profile"
                                        className="h-7 w-7 rounded-full object-cover border border-border"
                                    />
                                ) : (
                                    <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center">
                                        <svg className="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )}
                            </Link>
                            <button
                                onClick={logout}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                                title="Sign out"
                            >
                                <LogOut size={14} />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </>
                    ) : (
                        <Link href="/profile" className="hover:opacity-80 transition-opacity">
                            <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </Link>
                    )}
                </div>
            </div>
        </motion.header>
    );
}
