"use client";
import { motion } from "motion/react";
import { Code, Key, Shield, Users, CreditCard, BombIcon, Server, Image, Megaphone } from "lucide-react";

const adminEndpoints = [
  {
    method: "GET",
    path: "/api/users",
    desc: "List all users",
    auth: "Admin",
    icon: Users,
  },
  {
    method: "POST",
    path: "/api/add-user",
    desc: "Create a new user",
    auth: "Admin",
    icon: Users,
  },
  {
    method: "PUT",
    path: "/api/users/{id}",
    desc: "Update a user",
    auth: "Admin",
    icon: Users,
  },
  {
    method: "DELETE",
    path: "/api/remove-user/{id}",
    desc: "Delete a user",
    auth: "Admin",
    icon: Users,
  },
  {
    method: "GET",
    path: "/api/plans",
    desc: "List all plans",
    auth: "Admin",
    icon: CreditCard,
  },
  {
    method: "POST",
    path: "/api/plans",
    desc: "Create a plan",
    auth: "Admin",
    icon: CreditCard,
  },
  {
    method: "PUT",
    path: "/api/plans/{name}",
    desc: "Update a plan",
    auth: "Admin",
    icon: CreditCard,
  },
  {
    method: "DELETE",
    path: "/api/plans/{name}",
    desc: "Delete a plan",
    auth: "Admin",
    icon: CreditCard,
  },
  {
    method: "GET",
    path: "/api/methods",
    desc: "List all attack methods",
    auth: "Admin",
    icon: BombIcon,
  },
  {
    method: "POST",
    path: "/api/methods",
    desc: "Create an attack method",
    auth: "Admin",
    icon: BombIcon,
  },
  {
    method: "PUT",
    path: "/api/methods/{name}",
    desc: "Update an attack method",
    auth: "Admin",
    icon: BombIcon,
  },
  {
    method: "DELETE",
    path: "/api/methods/{name}",
    desc: "Delete an attack method",
    auth: "Admin",
    icon: BombIcon,
  },
  {
    method: "GET",
    path: "/api/servers",
    desc: "List connected servers/bots",
    auth: "Admin",
    icon: Server,
  },
  {
    method: "GET",
    path: "/api/proofs",
    desc: "List power proofs",
    auth: "Admin",
    icon: Image,
  },
  {
    method: "POST",
    path: "/api/proofs",
    desc: "Add power proof (payload: {type,url,caption})",
    auth: "Admin",
    icon: Image,
  },
  {
    method: "DELETE",
    path: "/api/proofs/{id}",
    desc: "Delete a power proof",
    auth: "Admin",
    icon: Image,
  },
  {
    method: "GET",
    path: "/api/broadcasts",
    desc: "List active broadcasts",
    auth: "Admin",
    icon: Megaphone,
  },
  {
    method: "POST",
    path: "/api/broadcasts",
    desc: "Create broadcast (payload: {text,end_time,media_url,caption})",
    auth: "Admin",
    icon: Megaphone,
  },
  {
    method: "DELETE",
    path: "/api/broadcasts/{id}",
    desc: "Delete a broadcast",
    auth: "Admin",
    icon: Megaphone,
  },
];

const methodColors: Record<string, string> = {
  GET: "text-success",
  POST: "text-primary",
  PUT: "text-warning",
  DELETE: "text-danger",
};

export default function AdminApiDocs() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-medium text-white">Admin API Reference</h2>
        <p className="text-xs text-text-muted mt-0.5">Admin-only endpoints for managing the platform</p>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Method</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Endpoint</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Description</th>
              <th className="text-left px-3 py-2.5 text-text-muted font-medium uppercase tracking-wider">Auth</th>
            </tr>
          </thead>
          <tbody>
            {adminEndpoints.map((ep, i) => {
              const Icon = ep.icon;
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className={`font-mono font-medium ${methodColors[ep.method] || "text-text-muted"}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-white">{ep.path}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Icon size={12} className="text-text-muted shrink-0" />
                      <span className="text-text-muted">{ep.desc}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded">
                      <Shield size={10} />
                      Admin
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
