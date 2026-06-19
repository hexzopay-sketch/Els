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

    if (!isClient || isLoading) return null;

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
                            className="fixed inset-y-0 left-0 z-50 w-64 bg-panel border-r border-border p-4 md:hidden"
                        >
                            <div className="flex justify-end mb-6">
                                <button onClick={toggleSidebar} className="text-text-muted hover:text-white transition-colors">
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
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                                                pathname === href
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-text-muted hover:text-white hover:bg-muted/30"
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
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                                                pathname === "/login"
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-text-muted hover:text-white hover:bg-muted/30"
                                            }`}
                                        >
                                            <LogIn size={20} />
                                            Login
                                        </Link>
                                        <Link
                                            href="/register"
                                            onClick={toggleSidebar}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                                                pathname === "/register"
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-text-muted hover:text-white hover:bg-muted/30"
                                            }`}
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
                <aside className="hidden md:flex fixed left-0 top-0 z-40 h-full w-16 flex-col items-center bg-panel border-r border-border pt-14">
                    {filtered.map(({ href, icon, label }) => {
                        const active = pathname === href;
                        return (
                            <Link key={href} href={href}
                                className={`group relative flex items-center justify-center w-full h-12 transition-colors ${
                                    active ? "text-primary" : "text-text-muted hover:text-white"
                                }`}
                            >
                                <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                                {icon}
                                <span className="absolute left-14 whitespace-nowrap rounded-lg bg-gray-900 border border-border px-3 py-1.5 text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </aside>
            )}
        </>
    );
}
