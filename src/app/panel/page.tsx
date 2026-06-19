"use client";
import AttackLogs from '@/components/panel/AttackLogs';
import Panel from '@/components/panel/Panel';
import { motion } from 'motion/react';

export default function DashboardAttack() {
    return (
        <div className="min-h-screen bg-[#0d1117]">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    <h1 className="text-lg font-semibold text-[#e6edf3] tracking-tight">Attack Panel</h1>
                    <p className="text-sm text-[#8b949e] mt-0.5">Launch and monitor attacks</p>
                </motion.div>
                <div className="grid lg:grid-cols-2 gap-5">
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
                    >
                        <Panel />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                    >
                        <AttackLogs />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
