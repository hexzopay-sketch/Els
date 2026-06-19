"use client";
import { useState, useEffect } from 'react';
import MethodDropdown from '@/components/panel/MethodDropdown';
import { useAttackContext } from '@/contexts/AttackContext';
import { useToast } from "@/components/ToastPopup";
import { AxiosError } from "axios";
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

export default function Layer7Form({ methods = [] }: { methods: Method[] }) {
    const { showToast } = useToast();
    const { triggerRefresh } = useAttackContext();
    const [url, setUrl] = useState('https://google.com');
    const [requests, setRequests] = useState('100');
    const [server, setServer] = useState('Layer7');
    const [time, setTime] = useState('30');
    const [concurrents, setConcurrents] = useState(1);
    const [selectedMethod, setSelectedMethod] = useState("");
    const [protocol, setProtocol] = useState("Methods");
    const [useProxy, setUseProxy] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filtered = methods.filter((m) =>
        m.layer7 && !m.amplification
    );

    const launchAttack = async () => {
        setIsSubmitting(true);
        try {
            const response = await api.post("/launch",
                new URLSearchParams({
                    method: selectedMethod,
                    target: url,
                    time: time,
                    port: '',
                    rpc: requests,
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
            showToast("attack failed!", "error");
            console.error("Erro ao lançar ataque Layer4:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = !url || !requests || !selectedMethod || isSubmitting;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">URL</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Requests</label>
                    <input
                        type="text"
                        value={requests}
                        onChange={(e) => setRequests(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>
            </div>

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
                <label className="block text-text-muted text-xs mb-1.5 uppercase tracking-wider">Method</label>
                <MethodDropdown
                    methods={filtered}
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
                    <option value="Layer7">Normal Network</option>
                    <option value="Layer7_premium">Premium Network</option>
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
