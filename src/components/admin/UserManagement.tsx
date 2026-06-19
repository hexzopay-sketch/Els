"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trash2, Plus, User, Search, Edit3, Eye, EyeOff, X } from "lucide-react";
import api from "@/lib/api";
import Loader from "@/components/Loader";

interface UserData {
  id: string;
  username: string;
  email: string;
  password: string;
  rule: string | null;
  plan: string; // aqui é o nome do plano
  join_date: string;
  expiration_date: string | null;
}

interface Plan {
  name: string;
  max_concurrents: number;
  max_seconds: number;
  min_seconds: number;
  premium: boolean;
  api_access: boolean;
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [searchOpen, setSearchOpen] = useState(false);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [planName, setPlanName] = useState(""); // mudou de planId para planName
  const [expires, setExpires] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users");
    }
  };

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlans(res.data);
      if (res.data.length > 0 && !planName) {
        setPlanName(res.data[0].name); // usa o name
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Failed to load plans");
    }
  };


  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const token = localStorage.getItem("token");
      const userData = {
        username,
        email,
        password,
        plan: planName, // envia o nome do plano
        rule: role,
        expiration_date: expires ? new Date(expires).toISOString() : null,
      };

      if (isEditing) {
        await api.put(`/users/${editingUserId}`, userData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      } else {
        await api.post("/add-user", userData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }

      await fetchUsers();
      resetForm();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null) {
        const apiErr = err as ApiError;
        const msg = apiErr.response?.data?.detail || "Failed to process user";
        setError(msg);
      } else {
        setError("Failed to process user");
      }
    }
  };

  const handleEdit = (user: UserData) => {
    setUsername(user.username);
    setEmail(user.email);
    setPassword("");
    setRole(user.rule || "User");
    setPlanName(user.plan); // usa o nome do plano do usuário
    setExpires(user.expiration_date ? user.expiration_date.split("T")[0] : "");
    setIsEditing(true);
    setEditingUserId(user.id);
  };

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("User");
    setPlanName(plans.length > 0 ? plans[0].name : "");
    setExpires("");
    setIsEditing(false);
    setEditingUserId("");
  };
 
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = localStorage.getItem("token");
      await api.delete(`/remove-user/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null) {
        const apiErr = err as ApiError;
        const msg = apiErr.response?.data?.detail || "Failed to delete user";
        setError(msg);
      } else {
        setError("Failed to delete user");
      }
    }

  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No expiration";
    return new Date(dateString).toLocaleDateString("en-US");
  };

  const getPlanName = (planName: string) => {
    // Busca o plano pelo nome (que é o identificador)
    const plan = plans.find((p) => p.name === planName);
    return plan ? plan.name : planName;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const [plansRes, usersRes] = await Promise.all([
          api.get("/plans", { headers: { Authorization: `Bearer ${token}` } }),
          api.get("/users", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setPlans(plansRes.data);
        if (plansRes.data.length > 0) {
          setPlanName(plansRes.data[0].name);
        }
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load data");
      }
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <Loader variant={1} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">User Management</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 bg-muted border border-border rounded-lg text-text-muted hover:text-white transition-colors"
            title="Search users"
            type="button"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSearchOpen(false)}>
          <div className="bg-panel border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Search Users</h3>
              <button onClick={() => setSearchOpen(false)} className="text-text-muted hover:text-white transition-colors" type="button">
                <X size={18} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {searchTerm && filteredUsers.length === 0 && (
              <p className="text-text-muted text-sm mt-3 text-center">No users match your search.</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-600/20 border border-red-600 rounded-lg text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Add/Edit User Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-subtle/50 backdrop-blur-sm rounded-lg p-6 border border-border"
      >
        <h3 className="text-lg font-medium text-white mb-4">
          {isEditing ? "Edit User" : "Add User"}
        </h3>
        <form
          onSubmit={handleAddUser}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-muted border border-border rounded-lg px-4 py-2 text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-muted border border-border rounded-lg px-4 py-2 text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="password"
            placeholder={
              isEditing
                ? "New password (leave blank to keep)"
                : "Password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEditing}
            className="bg-muted border border-border rounded-lg px-4 py-2 text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="bg-muted border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {plans.map((plan) => (
              <option key={plan.name} value={plan.name}>
                {plan.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="bg-muted border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-muted border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
          <div className="flex gap-2 md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="flex-1 bg-primary text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              {isEditing ? "Update" : "Add"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-muted transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* User Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-text-muted border border-border rounded-lg">
          <thead className="text-xs uppercase bg-background border-b border-border">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Password</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-text-muted">
                  No users found.
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border hover:bg-muted"
              >
                <td className="px-4 py-2">{user.username}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{getPlanName(user.plan)}</td>
                <td className="px-4 py-2">{user.rule || "User"}</td>
                <td className="px-4 py-2">{formatDate(user.join_date)}</td>
                <td className="px-4 py-2">{formatDate(user.expiration_date)}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type={showPasswords[user.id] ? "text" : "password"}
                      readOnly
                      value={showPasswords[user.id] ? user.password : "••••••••••••••••"}
                      className="bg-muted text-white rounded px-2 py-1 w-full max-w-[130px] text-xs"
                    />
                    <button
                      onClick={() => togglePasswordVisibility(user.id)}
                      className="text-text-muted hover:text-slate-200"
                      title={showPasswords[user.id] ? "Hide" : "Show"}
                      type="button"
                    >
                      {showPasswords[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-1 rounded hover:bg-muted"
                    title="Edit user"
                    type="button"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-1 rounded hover:bg-red-700 text-red-400"
                    title="Delete user"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
