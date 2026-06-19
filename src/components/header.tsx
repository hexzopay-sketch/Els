"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { LogOut } from "lucide-react";

export function Header() {
    const { toggleSidebar, sidebarOpen } = useSidebar();
    const { isLogged, logoutWithTransition } = useAuth();
    const [avatar, setAvatar] = useState<string | null>(null);

    const pathname = usePathname();
    const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");

    useEffect(() => {
        if (!isLogged) return;
        api.get("/profile").then(res => {
            if (res.data?.avatar_url) setAvatar(res.data.avatar_url);
        }).catch(() => {});
    }, [isLogged]);

    if (isAuthPage) return null;

    return (
        <motion.header
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`sticky top-0 z-50 h-14 bg-[#161b22]/80 backdrop-blur-sm border-b border-[#30363d] flex items-center px-4 md:px-6 ${isLogged ? "md:ml-16" : ""}`}
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSidebar}
                        className="relative flex items-center justify-center w-10 h-10 text-[#8b949e] hover:text-[#e6edf3] transition-colors md:hidden overflow-hidden"
                        aria-label="Menu"
                    >
                        <div className="relative flex flex-col items-center justify-center w-6 h-6">
                            <span className={`absolute h-[2px] bg-current rounded-full transition-all duration-400 ease-in-out ${sidebarOpen ? 'w-6 translate-y-0 rotate-45' : 'w-4 -translate-y-2'}`}></span>
                            <span className={`absolute h-[2px] bg-current rounded-full transition-all duration-400 ease-in-out w-6 ${sidebarOpen ? '-translate-x-10 opacity-0' : 'translate-x-0 opacity-100'}`}></span>
                            <span className={`absolute h-[2px] bg-current rounded-full transition-all duration-400 ease-in-out ${sidebarOpen ? 'w-6 translate-y-0 -rotate-45' : 'w-4 translate-y-2'}`}></span>
                        </div>
                    </button>
                    <Link href="/" className="flex items-center gap-2">
                        <img src="imagens/logo.png" alt="Logo" className="h-8 w-auto" />
                        <span className="font-bold text-sm tracking-wide text-[#e6edf3] hidden sm:block">
                            LEVL7<span className="text-[#58a6ff]">STRESSER</span>
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
                                        className="h-7 w-7 rounded-full object-cover border border-[#30363d]"
                                    />
                                ) : (
                                    <div className="h-7 w-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center">
                                        <svg className="h-3.5 w-3.5 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )}
                            </Link>
                            <button
                                onClick={logoutWithTransition}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 rounded-md transition-all"
                                title="Logout"
                            >
                                <LogOut size={14} />
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/login"
                                className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors px-2.5 py-1.5"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="text-xs font-medium bg-[#58a6ff] text-white px-3 py-1.5 rounded-md hover:brightness-110 transition-all"
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </motion.header>
    );
}
