import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Users, FileText, Skull, Eye, EyeOff, Ban, Shield, AlertTriangle,
  Lock, Trash2, Flame, Clock
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
    <div className="min-h-screen bg-[#0d0d0d]">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-4 h-4 text-red-700" />
          <h1 className="text-xs font-mono font-bold text-neutral-400 tracking-widest uppercase">
            Admin Control
          </h1>
        </div>

        <div className="flex gap-1 mb-6">
          {(["overview", "users", "posts"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-wider transition-colors ${
                tab === t
                  ? "bg-red-900/30 text-red-300 border border-red-800/30"
                  : "text-neutral-600 hover:text-neutral-400 border border-transparent"
              }`}
              data-testid={`tab-${t}`}
            >
              {t.toUpperCase()}
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
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-20 bg-[#111111] border border-neutral-800/40 animate-pulse" />
      ))}
    </div>;
  }

  const items = [
    { label: "TOTAL USERS", value: stats?.totalUsers ?? 0, icon: Users },
    { label: "ACTIVE (24H)", value: stats?.activeUsers ?? 0, icon: Users },
    { label: "TOTAL POSTS", value: stats?.totalPosts ?? 0, icon: FileText },
    { label: "ACTIVE POSTS", value: stats?.activePosts ?? 0, icon: Flame },
    { label: "DEAD POSTS", value: stats?.deadPosts ?? 0, icon: Skull },
    { label: "SHADOW BANNED", value: stats?.shadowBannedUsers ?? 0, icon: EyeOff },
    { label: "PUBLIC ENEMIES", value: stats?.publicEnemies ?? 0, icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="bg-[#111111] border border-neutral-800/40 p-3" data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <item.icon className="w-3 h-3 text-neutral-600" />
            <span className="text-[9px] font-mono text-neutral-600 tracking-wider">{item.label}</span>
          </div>
          <span className="text-xl font-mono font-bold text-neutral-200 tabular-nums">{item.value}</span>
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

  if (isLoading) return <div className="h-40 bg-[#111111] animate-pulse" />;

  return (
    <div className="space-y-0.5">
      {users?.map((u) => (
        <div
          key={u.id}
          className="bg-[#111111] border border-neutral-800/40 p-3 flex items-center justify-between"
          data-testid={`admin-user-${u.id}`}
        >
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-neutral-200">{u.username}</span>
                {u.role === "admin" && (
                  <span className="text-[9px] font-mono text-red-500 bg-red-950/40 px-1 py-0 border border-red-900/30">ADMIN</span>
                )}
                {u.isBanned && (
                  <span className="text-[9px] font-mono text-red-400 bg-red-950/40 px-1 py-0 border border-red-900/30">BANNED</span>
                )}
                {u.shadowBanned && (
                  <span className="text-[9px] font-mono text-amber-500 bg-amber-950/40 px-1 py-0 border border-amber-900/30">SHADOW</span>
                )}
                {u.reputation <= -300 && (
                  <span className="text-[9px] font-mono text-red-500 bg-red-950/40 px-1 py-0 border border-red-900/30">ENEMY</span>
                )}
              </div>
              <span className={`text-[10px] font-mono tabular-nums ${u.reputation < 0 ? "text-red-500" : "text-neutral-600"}`}>
                rep: {u.reputation}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] font-mono text-neutral-500 hover:text-red-400 hover:bg-red-950/20"
              onClick={() => updateMutation.mutate({ id: u.id, data: { isBanned: !u.isBanned } })}
              data-testid={`button-ban-${u.id}`}
            >
              <Ban className="w-3 h-3 mr-1" />
              {u.isBanned ? "UNBAN" : "BAN"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] font-mono text-neutral-500 hover:text-amber-400 hover:bg-amber-950/20"
              onClick={() => updateMutation.mutate({ id: u.id, data: { shadowBanned: !u.shadowBanned } })}
              data-testid={`button-shadow-${u.id}`}
            >
              {u.shadowBanned ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </Button>
            {u.role !== "admin" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-mono text-neutral-500 hover:text-red-400 hover:bg-red-950/20"
                onClick={() => updateMutation.mutate({ id: u.id, data: { role: "admin" } })}
                data-testid={`button-promote-${u.id}`}
              >
                <Shield className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
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

  if (isLoading) return <div className="h-40 bg-[#111111] animate-pulse" />;

  return (
    <div className="space-y-0.5">
      {posts?.map((p) => {
        const isDead = new Date(p.expiresAt) <= new Date();
        return (
          <div
            key={p.id}
            className="bg-[#111111] border border-neutral-800/40 p-3 flex items-center justify-between"
            data-testid={`admin-post-${p.id}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-200 truncate">{p.title}</span>
                {p.isLocked && <Lock className="w-3 h-3 text-red-600 flex-shrink-0" />}
                {isDead && <Skull className="w-3 h-3 text-neutral-600 flex-shrink-0" />}
                {p.isDeleted && <Trash2 className="w-3 h-3 text-neutral-600 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] font-mono text-neutral-600">{p.username}</span>
                <span className={`text-[10px] font-mono tabular-nums ${p.score < 0 ? "text-red-500" : "text-neutral-600"}`}>
                  score: {p.score}
                </span>
                <span className="text-[10px] font-mono text-neutral-700 tabular-nums">
                  heat: {p.heat}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-mono text-neutral-500 hover:text-red-400 hover:bg-red-950/20"
                onClick={() => updateMutation.mutate({ id: p.id, data: { isLocked: !p.isLocked } })}
                data-testid={`button-lock-${p.id}`}
              >
                <Lock className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-mono text-neutral-500 hover:text-red-400 hover:bg-red-950/20"
                onClick={() => updateMutation.mutate({ id: p.id, data: { isDeleted: true } })}
                data-testid={`button-delete-${p.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-mono text-neutral-500 hover:text-amber-400 hover:bg-amber-950/20"
                onClick={() => updateMutation.mutate({ id: p.id, data: { expiresAt: new Date().toISOString() } })}
                data-testid={`button-expire-${p.id}`}
              >
                <Clock className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-mono text-neutral-500 hover:text-orange-400 hover:bg-orange-950/20"
                onClick={() => updateMutation.mutate({ id: p.id, data: { heat: p.heat + 100 } })}
                data-testid={`button-boost-${p.id}`}
              >
                <Flame className="w-3 h-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
