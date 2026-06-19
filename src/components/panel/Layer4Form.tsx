"use client";
import { useState, useEffect } from 'react';
import MethodDropdown from '@/components/panel/MethodDropdown';
import { useToast } from "@/components/ToastPopup";
import { AxiosError } from "axios";
import { useAttackContext } from '@/contexts/AttackContext';
import api from '@/lib/api';
import Checkbox from "@/components/Checkbox";

interface Method {
    method: string;
    description: string;
    layer4: boolean;
    layer7: boolean;
    amplification: boolean;
    premium: boolean;
    concurrents: number;
    proxy: boolean;
}

export default function Layer4Form({ methods = [] }: { methods: Method[] }) {
    const { triggerRefresh } = useAttackContext();
    const { showToast } = useToast();
    const [ipv4, setIpv4] = useState('74.74.74.8');
    const [port, setPort] = useState('80');
    const [time, setTime] = useState('30');
    const [concurrents, setConcurrents] = useState(1);
    const [server, setServer] = useState('Layer4');
    const [protocol, setProtocol] = useState('Methods');
    const [filteredMethods, setFilteredMethods] = useState<Method[]>([]);
    const [selectedMethod, setSelectedMethod] = useState("");
    const [useProxy, setUseProxy] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const filtered = methods.filter(m =>
            m.layer4 && (protocol === 'Amplification' ? m.amplification : !m.amplification)
        );
        setFilteredMethods(filtered);
    }, [protocol, methods]);

    const launchAttack = async () => {
        setIsSubmitting(true);
        try {
            const response = await api.post("/launch",
                new URLSearchParams({
                    method: selectedMethod,
                    target: ipv4,
                    port: port,
                    time: time,
                    concurrents: concurrents.toString(),
                    layer: server,
                    proxy: useProxy ? "1" : "0"
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );

            if (response.data.success != false && response.data.ongoing != 0) {
                showToast("attack launched!", "success");
                triggerRefresh();
            } else {
                showToast("attack failed!", "error");
            }

        } catch (err) {
            const error = err as AxiosError<{ detail: string }>;
            showToast(error.response?.data?.detail || "Unexpected error", "error");
            console.error("Erro ao lançar ataque Layer4:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = !ipv4 || !port || !selectedMethod || isSubmitting;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Target</label>
                    <input
                        type="text"
                        value={ipv4}
                        onChange={(e) => setIpv4(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Port</label>
                    <input
                        type="text"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Time (s)</label>
                    <input
                        type="text"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Protocol</label>
                    <select
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    >
                        <option value="Methods">UDP / TCP</option>
                        <option value="Amplification">Amplification</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Method</label>
                <MethodDropdown
                    methods={filteredMethods}
                    value={selectedMethod}
                    onChange={setSelectedMethod}
                />
            </div>

            <div>
                <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Server Network</label>
                <select
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                >
                    <option value="Layer4">Normal Network</option>
                    <option value="Layer4_premium">Premium Network</option>
                </select>
            </div>

            <div>
                <Checkbox checked={useProxy} onChange={() => setUseProxy(!useProxy)} label="Use Proxy" />
            </div>

            <div>
                <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Concurrents: {concurrents}</label>
                <input
                    type="range"
                    min="1"
                    max="25"
                    value={concurrents}
                    onChange={(e) => setConcurrents(Number(e.target.value))}
                    className="w-full accent-primary"
                />
            </div>

            <button
                disabled={isDisabled}
                onClick={launchAttack}
                className={`w-full py-2 rounded-md text-sm font-medium transition-all ${
                    isDisabled
                        ? "bg-muted text-text-muted cursor-not-allowed"
                        : "bg-primary text-white hover:brightness-110"
                }`}
            >
                {isSubmitting ? "Launching..." : "Launch Attack"}
            </button>
        </div>
    );
}
