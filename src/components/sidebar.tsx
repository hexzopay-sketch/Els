"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Zap, Code, Blocks, LogIn, UserPlus, User, X, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";

const items = [
    { href: "/dashboard", icon: <Home size={20} />, label: "Dashboard" },
    { href: "/panel", icon: <Zap size={20} />, label: "Panel" },
    { href: "/api", icon: <Code size={20} />, label: "API" },
    { href: "/profile", icon: <User size={20} />, label: "Profile" },
    { href: "/admin", icon: <Blocks size={20} />, label: "Admin", admin: true },
    { href: "/power-proof", icon: <ShieldCheck size={20} />, label: "Power Proof" },
];

export function Sidebar() {
    const [isClient, setIsClient] = useState(false);
    const { toggleSidebar, sidebarOpen } = useSidebar();
    const { isLogged, isLoading, isAdmin } = useAuth();
    const pathname = usePathname();

    useEffect(() => { setIsClient(true); }, []);

    const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");
    if (!isClient || isLoading || isAuthPage) return null;

    const filtered = items.filter(item => !item.admin || isAdmin);

    return (
        <>
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={toggleSidebar}
                            className="fixed inset-0 bg-black/60 z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 left-0 z-50 w-64 bg-[#161b22] border-r border-[#30363d] p-4 md:hidden"
                        >
                            <div className="flex justify-end mb-6">
                                <button onClick={toggleSidebar} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <nav className="flex flex-col gap-1">
                                {isLogged ? (
                                    filtered.map(({ href, icon, label }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={toggleSidebar}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                                                pathname === href
                                                    ? "bg-[#e6edf3]/10 text-[#e6edf3]"
                                                    : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50"
                                            }`}
                                        >
                                            {icon}
                                            {label}
                                        </Link>
                                    ))
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            onClick={toggleSidebar}
                                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50 transition-all duration-200"
                                        >
                                            <LogIn size={20} />
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/register"
                                            onClick={toggleSidebar}
                                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50 transition-all duration-200"
                                        >
                                            <UserPlus size={20} />
                                            Register
                                        </Link>
                                    </>
                                )}
                            </nav>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {isLogged && (
                <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-16 bg-[#161b22] border-r border-[#30363d] flex-col items-center py-4 gap-2">
                    {filtered.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                                pathname === item.href
                                    ? "bg-[#e6edf3]/10 text-[#e6edf3]"
                                    : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50"
                            }`}
                            title={item.label}
                        >
                            {item.icon}
                            <span className="absolute left-14 px-2 py-1 bg-[#21262d] border border-[#30363d] text-xs text-[#e6edf3] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </aside>
            )}
        </>
    );
}
