"use client";
import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, XCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

type Toast = {
    id: number;
    type: ToastType;
    message: string;
};

const ToastContext = createContext<
    | { showToast: (message: string, type?: ToastType) => void }
    | undefined
>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, x: 80, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm backdrop-blur-sm
                ${toast.type === "success" ? "bg-green-600/90 border-green-500/50 text-white" : ""}
                ${toast.type === "error" ? "bg-red-600/90 border-red-500/50 text-white" : ""}
                ${toast.type === "info" ? "bg-gray-800/90 border-gray-700/50 text-white" : ""}`}
                        >
                            {toast.type === "success" && <CheckCircle size={18} className="text-green-200" />}
                            {toast.type === "error" && <XCircle size={18} className="text-red-200" />}
                            {toast.type === "info" && <Info size={18} className="text-gray-200" />}
                            <span>{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
}
