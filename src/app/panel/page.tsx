"use client";
import AttackLogs from '@/components/panel/AttackLogs';
import Panel from '@/components/panel/Panel';

export default function DashboardAttack() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <h1 className="text-lg font-semibold text-white">Attack Panel</h1>
                <div className="grid lg:grid-cols-2 gap-5">
                    <Panel />
                    <AttackLogs />
                </div>
            </div>
        </div>
    );
}
