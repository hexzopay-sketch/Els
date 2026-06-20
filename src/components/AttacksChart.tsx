"use client";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, TooltipProps } from "recharts";

interface AttackData {
  name: string;
  attacks: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-subtle/95 border border-border rounded-lg p-3 shadow-lg">
        <p className="text-text-muted text-xs font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AttacksChart({ data }: { data: AttackData[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="attacksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e6edf3" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#e6edf3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="attacks" stroke="#e6edf3" strokeWidth={2} fill="url(#attacksGradient)" name="Attacks" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
