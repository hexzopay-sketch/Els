"use client";
import React, { useEffect, useState } from 'react';
import Layer4Form from '@/components/panel/Layer4Form';
import Layer7Form from '@/components/panel/Layer7Form';
import api from '@/lib/api';

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

export default function Panel() {
    const [activeLayer, setActiveLayer] = useState<'L4' | 'L7'>('L4');
    const [methods, setMethods] = useState<Method[]>([]);

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const response = await api.get("/methods");
                setMethods(response.data);
            } catch (err: unknown) {
                console.error("Erro ao buscar métodos:", err);
            }
        };
        fetchMethods();
    }, []);

    return (
        <div className="bg-subtle border border-border rounded-lg p-5">
            <div className="flex border-b border-border pb-4 mb-4 gap-1">
                <button
                    onClick={() => setActiveLayer('L4')}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeLayer === 'L4' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-white'
                    }`}
                >
                    Layer 4
                </button>
                <button
                    onClick={() => setActiveLayer('L7')}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeLayer === 'L7' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-white'
                    }`}
                >
                    Layer 7
                </button>
            </div>

            <div>
                {activeLayer === 'L4' ? (
                    <Layer4Form methods={methods.filter(m => m.layer4)} />
                ) : (
                    <Layer7Form methods={methods.filter(m => m.layer7)} />
                )}
            </div>
        </div>
    );
}
