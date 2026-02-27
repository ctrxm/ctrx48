import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Users, FileText, Skull, Eye, EyeOff, Ban, Shield, AlertTriangle,
  Lock, Trash2, Flame, Clock, BarChart3, Activity, UserX
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type Stats = {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  activePosts: number;
  deadPosts: number;
  shadowBannedUsers: number;
  publicEnemies: number;
};

type AdminUser = {
  id: string;
  username: string;
  role: string;
  isBanned: boolean;
  shadowBanned: boolean;
  reputation: number;
  createdAt: string;
};

type AdminPost = {
  id: string;
  title: string;
  username: string;
  score: number;
  heat: number;
  isLocked: boolean;
  isDeleted: boolean;
  expiresAt: string;
  createdAt: string;
};

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"overview" | "users" | "posts">("overview");

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Manage users, posts, and forum settings</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-card border border-card-border rounded-lg p-1 mb-6">
          {(["overview", "users", "posts"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-md transition-colors capitalize ${
                tab === t ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${t}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && <StatsPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "posts" && <PostsPanel />}
      </main>
    </div>
  );
}

function StatsPanel() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-24 bg-card border border-card-border rounded-xl animate-pulse" />
      ))}
    </div>;
  }

  const items = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500 bg-blue-500/10" },
    { label: "Active (24h)", value: stats?.activeUsers ?? 0, icon: Activity, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Total Posts", value: stats?.totalPosts ?? 0, icon: FileText, color: "text-purple-500 bg-purple-500/10" },
    { label: "Active Posts", value: stats?.activePosts ?? 0, icon: Flame, color: "text-primary bg-primary/10" },
    { label: "Dead Posts", value: stats?.deadPosts ?? 0, icon: Skull, color: "text-muted-foreground bg-muted" },
    { label: "Shadow Banned", value: stats?.shadowBannedUsers ?? 0, icon: EyeOff, color: "text-amber-500 bg-amber-500/10" },
    { label: "Public Enemies", value: stats?.publicEnemies ?? 0, icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-card border border-card-border rounded-xl p-4" data-testid={`stat-${item.label.toLowerCase().replace(/[\s()\/]+/g, "-")}`}>
          <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
            <item.icon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{item.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function UsersPanel() {
  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  if (isLoading) return <div className="h-40 bg-card border border-card-border rounded-xl animate-pulse" />;

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">User</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Status</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Karma</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors" data-testid={`admin-user-${u.id}`}>
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                      {u.username[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.username}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {u.role === "admin" && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Admin</span>
                    )}
                    {u.isBanned && (
                      <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Banned</span>
                    )}
                    {u.shadowBanned && (
                      <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Shadow</span>
                    )}
                    {u.reputation <= -300 && (
                      <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Enemy</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span className={`text-sm font-mono font-semibold tabular-nums ${u.reputation < 0 ? "text-destructive" : "text-foreground"}`}>
                    {u.reputation >= 0 ? "+" : ""}{u.reputation}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => updateMutation.mutate({ id: u.id, data: { isBanned: !u.isBanned } })}
                      title={u.isBanned ? "Unban" : "Ban"}
                      data-testid={`button-ban-${u.id}`}
                    >
                      <Ban className={`w-3.5 h-3.5 ${u.isBanned ? "text-destructive" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => updateMutation.mutate({ id: u.id, data: { shadowBanned: !u.shadowBanned } })}
                      title={u.shadowBanned ? "Remove shadow ban" : "Shadow ban"}
                      data-testid={`button-shadow-${u.id}`}
                    >
                      {u.shadowBanned ? <Eye className="w-3.5 h-3.5 text-amber-500" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                    {u.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => updateMutation.mutate({ id: u.id, data: { role: "admin" } })}
                        title="Promote to admin"
                        data-testid={`button-promote-${u.id}`}
                      >
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PostsPanel() {
  const { data: posts, isLoading } = useQuery<AdminPost[]>({
    queryKey: ["/api/admin/posts"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/posts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  if (isLoading) return <div className="h-40 bg-card border border-card-border rounded-xl animate-pulse" />;

  return (
    <div className="space-y-2">
      {posts?.map((p) => {
        const isDead = new Date(p.expiresAt) <= new Date();
        return (
          <div
            key={p.id}
            className={`bg-card border border-card-border rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 ${p.isDeleted ? "opacity-50" : ""}`}
            data-testid={`admin-post-${p.id}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground truncate">{p.title}</span>
                {p.isLocked && <Lock className="w-3.5 h-3.5 text-destructive shrink-0" />}
                {isDead && <Skull className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                {p.isDeleted && <Trash2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>by {p.username}</span>
                <span className={`font-mono ${p.score < 0 ? "text-destructive" : ""}`}>
                  score: {p.score}
                </span>
                <span className="font-mono">heat: {p.heat}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { isLocked: !p.isLocked } })}
                title={p.isLocked ? "Unlock" : "Lock"}
                data-testid={`button-lock-${p.id}`}
              >
                <Lock className={`w-3.5 h-3.5 ${p.isLocked ? "text-destructive" : "text-muted-foreground"}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { isDeleted: true } })}
                title="Delete"
                data-testid={`button-delete-${p.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { expiresAt: new Date().toISOString() } })}
                title="Force expire"
                data-testid={`button-expire-${p.id}`}
              >
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { heat: p.heat + 100 } })}
                title="Boost heat"
                data-testid={`button-boost-${p.id}`}
              >
                <Flame className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
