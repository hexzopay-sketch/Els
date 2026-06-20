"use client";
import { useEffect, useState } from 'react';
import { useAttackContext } from '@/contexts/AttackContext';
import api from '@/lib/api';
import { useToast } from "@/components/ToastPopup";
import { Search, XCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LaunchedAttack {
    attack_id: string;
    target: string;
    method: string;
    layer?: string;
    time_total: number;
    time_remaining: number;
}

export default function AttackLogs() {
    const { refreshAttacks } = useAttackContext();
    const { showToast } = useToast();
    const [logs, setLogs] = useState<LaunchedAttack[]>([]);
    const [filterTarget, setFilterTarget] = useState('');

    const fetchAttacks = async () => {
        try {
            const response = await api.get('/ongoing-attacks');
            if (response.data?.status === 'success') {
                setLogs(response.data.attacks);
            }
        } catch (err) {
            console.error("Erro ao buscar ataques em andamento:", err);
        }
    };

    useEffect(() => {
        fetchAttacks();
        const timer = setInterval(fetchAttacks, 2000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (refreshAttacks) {
            fetchAttacks();
        }
    }, [refreshAttacks]);

    const stopAttack = async (attackId: string) => {
        try {
            const response = await api.post('/stop', new URLSearchParams({
                attack_id: attackId
            }));
            setLogs(prev => prev.filter(log => log.attack_id !== attackId));
            if (response.data.success == true) {
                showToast("attack stopped!", "success");
            }
        } catch (err) {
            console.error("Erro ao parar ataque:", err);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.target.toLowerCase().includes(filterTarget.toLowerCase())
    );

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
            <div className="flex items-center gap-2 mb-4">
                <Activity size={15} className="text-[#e6edf3]" />
                <div>
                    <h2 className="text-sm font-medium text-[#e6edf3]">Attack Logs</h2>
                    <p className="text-xs text-[#8b949e]">running attacks</p>
                </div>
            </div>

            <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                <input
                    type="text"
                    placeholder="Filter target..."
                    value={filterTarget}
                    onChange={(e) => setFilterTarget(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#e6edf3]/50 transition-colors"
                />
            </div>

            <div className="border border-[#30363d] rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-[#30363d] bg-[#0d1117]/50">
                            <th className="text-left px-3 py-2.5 text-[#8b949e] font-medium uppercase tracking-wider">Target</th>
                            <th className="text-left px-3 py-2.5 text-[#8b949e] font-medium uppercase tracking-wider">Method</th>
                            <th className="text-left px-3 py-2.5 text-[#8b949e] font-medium uppercase tracking-wider">Time</th>
                            <th className="text-left px-3 py-2.5 text-[#8b949e] font-medium uppercase tracking-wider">Layer</th>
                            <th className="text-left px-3 py-2.5 text-[#8b949e] font-medium uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence initial={false}>
                            {filteredLogs.length === 0 ? (
                                <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <td colSpan={5} className="px-3 py-8 text-center text-[#8b949e]">
                                        No running attacks
                                    </td>
                                </motion.tr>
                            ) : (
                                filteredLogs.map((log, i) => (
                                    <motion.tr
                                        key={log.attack_id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="border-t border-[#30363d]/50 hover:bg-[#161b22]/50 transition-colors"
                                    >
                                        <td className="px-3 py-2.5 text-[#e6edf3] font-mono">{log.target}</td>
                                        <td className="px-3 py-2.5">
                                            <span className="text-[#e6edf3] font-mono">{log.method}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-[#8b949e] font-mono">
                                            {formatTime(log.time_remaining)}/{formatTime(log.time_total)}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="text-xs bg-[#21262d] px-1.5 py-0.5 rounded text-[#8b949e]">
                                                {log.layer || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <button
                                                onClick={() => stopAttack(log.attack_id)}
                                                className="text-[#f85149] hover:text-[#ff7b72] hover:bg-[#f85149]/10 p-1.5 rounded transition-colors"
                                                title="Stop Attack"
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
