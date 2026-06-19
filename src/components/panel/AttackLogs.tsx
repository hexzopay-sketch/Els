"use client";
import { useEffect, useState } from 'react';
import { useAttackContext } from '@/contexts/AttackContext';
import api from '@/lib/api';
import { useToast } from "@/components/ToastPopup";
import { Search, XCircle } from 'lucide-react';

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
        <div className="bg-subtle border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-medium text-white">Attack Logs</h2>
                    <p className="text-xs text-text-muted">running attacks</p>
                </div>
            </div>

            <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    placeholder="Filter target..."
                    value={filterTarget}
                    onChange={(e) => setFilterTarget(e.target.value)}
                    className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                />
            </div>

            <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Target</th>
                            <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Method</th>
                            <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Time</th>
                            <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Layer</th>
                            <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                                    No running attacks
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log, i) => (
                                <tr key={log.attack_id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                                    <td className="px-3 py-2.5 text-white font-mono">{log.target}</td>
                                    <td className="px-3 py-2.5">
                                        <span className="text-primary font-mono">{log.method}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-text-muted font-mono">
                                        {formatTime(log.time_remaining)}/{formatTime(log.time_total)}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-text-muted">
                                            {log.layer || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <button
                                            onClick={() => stopAttack(log.attack_id)}
                                            className="text-text-muted hover:text-danger transition-colors"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
