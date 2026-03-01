import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users, FileText, Skull, Eye, EyeOff, Ban, Shield, AlertTriangle,
  Lock, Trash2, Flame, Clock, BarChart3, Activity, UserX,
  Settings, Award, Plus, X, Megaphone, ExternalLink, CreditCard, Wrench,
  AtSign, Banknote, Check, AlertCircle, Loader2, Palette, Target, Trophy
} from "lucide-react";
import { useState } from "react";
import { getGlowStyle, hasCustomGlow } from "@/lib/usernameGlow";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Badge, Ad, Payment } from "@shared/schema";

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
  email: string | null;
  role: string;
  isBanned: boolean;
  shadowBanned: boolean;
  reputation: number;
  isPremiumUsername: boolean;
  usernameGlow: string | null;
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
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"overview" | "users" | "posts" | "settings" | "badges" | "ads" | "transactions" | "reserved-usernames" | "withdrawals" | "challenges">("overview");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const tabs = [
    { key: "overview" as const, label: "Ringkasan", icon: BarChart3 },
    { key: "users" as const, label: "Pengguna", icon: Users },
    { key: "posts" as const, label: "Postingan", icon: FileText },
    { key: "badges" as const, label: "Lencana", icon: Award },
    { key: "ads" as const, label: "Iklan", icon: Megaphone },
    { key: "transactions" as const, label: "Transaksi", icon: CreditCard },
    { key: "reserved-usernames" as const, label: "Username", icon: AtSign },
    { key: "withdrawals" as const, label: "Penarikan", icon: Banknote },
    { key: "challenges" as const, label: "Tantangan", icon: Target },
    { key: "settings" as const, label: "Pengaturan", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 mobile-feed-padding">
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-md shadow-primary/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Panel Admin</h1>
            <p className="text-xs text-muted-foreground">Kelola pengguna, postingan, lencana, dan pengaturan forum</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 mb-6 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 flex-none sm:flex-1 px-3 sm:px-4 py-2.5 text-sm rounded-full transition-all whitespace-nowrap ${
                tab === key ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {tab === "overview" && <StatsPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "posts" && <PostsPanel />}
        {tab === "badges" && <BadgesPanel />}
        {tab === "ads" && <AdsPanel />}
        {tab === "transactions" && <TransactionsPanel />}
        {tab === "reserved-usernames" && <ReservedUsernamesPanel />}
        {tab === "withdrawals" && <WithdrawalsPanel />}
        {tab === "challenges" && <ChallengesPanel />}
        {tab === "settings" && <SettingsPanel />}
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
        <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
      ))}
    </div>;
  }

  const items = [
    { label: "Total Pengguna", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500 bg-blue-500/10" },
    { label: "Aktif (24j)", value: stats?.activeUsers ?? 0, icon: Activity, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Total Postingan", value: stats?.totalPosts ?? 0, icon: FileText, color: "text-purple-500 bg-purple-500/10" },
    { label: "Post Aktif", value: stats?.activePosts ?? 0, icon: Flame, color: "text-primary bg-primary/10" },
    { label: "Post Kedaluwarsa", value: stats?.deadPosts ?? 0, icon: Skull, color: "text-muted-foreground bg-muted" },
    { label: "Shadow Ban", value: stats?.shadowBannedUsers ?? 0, icon: EyeOff, color: "text-amber-500 bg-amber-500/10" },
    { label: "Musuh Publik", value: stats?.publicEnemies ?? 0, icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-card rounded-xl p-4" data-testid={`stat-${item.label.toLowerCase().replace(/[\s()\/]+/g, "-")}`}>
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

  const { data: allBadges } = useQuery<Badge[]>({
    queryKey: ["/api/admin/badges"],
  });

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [editingGlow, setEditingGlow] = useState<string | null>(null);
  const [userGlow1, setUserGlow1] = useState("#8b5cf6");
  const [userGlow2, setUserGlow2] = useState("#ec4899");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const awardBadgeMutation = useMutation({
    mutationFn: ({ userId, badgeId }: { userId: string; badgeId: string }) =>
      apiRequest("POST", "/api/admin/badges/award", { userId, badgeId }),
    onSuccess: () => {
      setSelectedUser(null);
      setSelectedBadge("");
    },
  });

  if (isLoading) return <div className="h-40 bg-card rounded-xl animate-pulse" />;

  return (
    <div className="bg-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pengguna</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Status</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Karma</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Aksi</th>
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
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`text-sm font-medium ${u.isPremiumUsername ? (hasCustomGlow(u.usernameGlow) ? "" : "username-glow") : "text-foreground"}`}
                          style={u.isPremiumUsername ? getGlowStyle(u.usernameGlow) : undefined}
                        >{u.username}</p>
                        {u.isPremiumUsername && (
                          <span className="text-[9px] font-semibold text-purple-500 bg-purple-500/10 px-1 py-0.5 rounded-full leading-none">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {u.email ? u.email : "Tanpa email"} · Bergabung {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: idLocale })}
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
                      <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Diblokir</span>
                    )}
                    {u.shadowBanned && (
                      <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Shadow</span>
                    )}
                    {u.reputation <= -300 && (
                      <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Musuh</span>
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
                      title={u.isBanned ? "Hapus blokir" : "Blokir"}
                      data-testid={`button-ban-${u.id}`}
                    >
                      <Ban className={`w-3.5 h-3.5 ${u.isBanned ? "text-destructive" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => updateMutation.mutate({ id: u.id, data: { shadowBanned: !u.shadowBanned } })}
                      title={u.shadowBanned ? "Hapus shadow ban" : "Shadow ban"}
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
                        title="Jadikan admin"
                        data-testid={`button-promote-${u.id}`}
                      >
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {allBadges && allBadges.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)}
                        title="Beri lencana"
                        data-testid={`button-award-badge-${u.id}`}
                      >
                        <Award className={`w-3.5 h-3.5 ${selectedUser === u.id ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                    )}
                    {u.isPremiumUsername && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          if (editingGlow === u.id) {
                            setEditingGlow(null);
                          } else {
                            setEditingGlow(u.id);
                            if (u.usernameGlow && u.usernameGlow !== "purple") {
                              const parts = u.usernameGlow.split(",");
                              setUserGlow1(parts[0]?.trim() || "#8b5cf6");
                              setUserGlow2(parts[1]?.trim() || "#ec4899");
                            } else {
                              setUserGlow1("#8b5cf6");
                              setUserGlow2("#ec4899");
                            }
                          }
                        }}
                        title="Ubah warna gradient username"
                        data-testid={`button-edit-glow-${u.id}`}
                      >
                        <Palette className={`w-3.5 h-3.5 ${editingGlow === u.id ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                    )}
                  </div>
                  {selectedUser === u.id && allBadges && (
                    <div className="mt-2 flex items-center gap-2 justify-end">
                      <select
                        value={selectedBadge}
                        onChange={(e) => setSelectedBadge(e.target.value)}
                        className="text-xs h-7 rounded border border-border bg-background px-2"
                        data-testid={`select-badge-${u.id}`}
                      >
                        <option value="">Pilih lencana...</option>
                        {allBadges.map((b) => (
                          <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2"
                        disabled={!selectedBadge}
                        onClick={() => awardBadgeMutation.mutate({ userId: u.id, badgeId: selectedBadge })}
                        data-testid={`button-confirm-badge-${u.id}`}
                      >
                        Beri
                      </Button>
                    </div>
                  )}
                  {editingGlow === u.id && (
                    <div className="mt-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-[10px] font-medium text-muted-foreground mb-2">Warna Gradient Username</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[10px] text-muted-foreground">Warna 1</Label>
                          <input
                            type="color"
                            value={userGlow1}
                            onChange={(e) => setUserGlow1(e.target.value)}
                            className="w-7 h-7 rounded cursor-pointer border border-border"
                            data-testid={`input-user-glow-1-${u.id}`}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[10px] text-muted-foreground">Warna 2</Label>
                          <input
                            type="color"
                            value={userGlow2}
                            onChange={(e) => setUserGlow2(e.target.value)}
                            className="w-7 h-7 rounded cursor-pointer border border-border"
                            data-testid={`input-user-glow-2-${u.id}`}
                          />
                        </div>
                        <span
                          className="text-xs font-bold"
                          style={getGlowStyle(`${userGlow1},${userGlow2}`) || undefined}
                        >
                          u/{u.username}
                        </span>
                        <Button
                          size="sm"
                          className="h-6 text-[10px] px-2 ml-auto"
                          onClick={() => {
                            updateMutation.mutate({
                              id: u.id,
                              data: { usernameGlow: `${userGlow1},${userGlow2}` },
                            });
                            setEditingGlow(null);
                          }}
                          disabled={updateMutation.isPending}
                          data-testid={`button-save-glow-${u.id}`}
                        >
                          Simpan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => {
                            updateMutation.mutate({
                              id: u.id,
                              data: { usernameGlow: "purple" },
                            });
                            setEditingGlow(null);
                          }}
                          data-testid={`button-reset-glow-${u.id}`}
                        >
                          Reset Default
                        </Button>
                      </div>
                    </div>
                  )}
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

  if (isLoading) return <div className="h-40 bg-card rounded-xl animate-pulse" />;

  return (
    <div className="space-y-2">
      {posts?.map((p) => {
        const isDead = new Date(p.expiresAt) <= new Date();
        return (
          <div
            key={p.id}
            className={`bg-card rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 ${p.isDeleted ? "opacity-50" : ""}`}
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
                <span>oleh {p.username}</span>
                <span className={`font-mono ${p.score < 0 ? "text-destructive" : ""}`}>
                  skor: {p.score}
                </span>
                <span className="font-mono">panas: {p.heat}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { isLocked: !p.isLocked } })}
                title={p.isLocked ? "Buka kunci" : "Kunci"}
                data-testid={`button-lock-${p.id}`}
              >
                <Lock className={`w-3.5 h-3.5 ${p.isLocked ? "text-destructive" : "text-muted-foreground"}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { isDeleted: true } })}
                title="Hapus"
                data-testid={`button-delete-${p.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { expiresAt: new Date().toISOString() } })}
                title="Paksa kedaluwarsa"
                data-testid={`button-expire-${p.id}`}
              >
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateMutation.mutate({ id: p.id, data: { heat: p.heat + 100 } })}
                title="Tingkatkan panas"
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

function BadgesPanel() {
  const { data: badges, isLoading } = useQuery<Badge[]>({
    queryKey: ["/api/admin/badges"],
  });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#f97316");

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/badges", { name, description, icon, color }),
    onSuccess: () => {
      setCreating(false);
      setName("");
      setDescription("");
      setIcon("");
      setColor("#f97316");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/badges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges"] });
    },
  });

  if (isLoading) return <div className="h-40 bg-card rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Lencana ({badges?.length ?? 0})</h2>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreating(!creating)} data-testid="button-create-badge">
          <Plus className="w-3.5 h-3.5" />
          Buat Lencana
        </Button>
      </div>

      {creating && (
        <div className="bg-card rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lencana" className="h-9" data-testid="input-badge-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ikon (emoji)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🔥" className="h-9" data-testid="input-badge-icon" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Deskripsi</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi lencana" className="h-9" data-testid="input-badge-description" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Warna</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#f97316" className="h-9 flex-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={() => createMutation.mutate()} disabled={!name || !icon || !description} data-testid="button-save-badge">
              Buat
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCreating(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badges?.map((badge) => (
          <div key={badge.id} className="bg-card rounded-xl p-4 flex items-center justify-between" data-testid={`admin-badge-${badge.id}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{badge.icon}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: badge.color }}>{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => deleteMutation.mutate(badge.id)}
              data-testid={`button-delete-badge-${badge.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      {(!badges || badges.length === 0) && !creating && (
        <div className="bg-card rounded-xl text-center py-12">
          <Award className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Belum ada lencana yang dibuat</p>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, testId }: { checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
      data-testid={testId}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingsPanel() {
  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
  });

  const [blockedDomains, setBlockedDomains] = useState("");
  const [postExpiry, setPostExpiry] = useState("48");
  const [siteName, setSiteName] = useState("CTRXL48");
  const [siteDescription, setSiteDescription] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [maxPostLength, setMaxPostLength] = useState("5000");
  const [maxCommentLength, setMaxCommentLength] = useState("1000");
  const [whisperEnabled, setWhisperEnabled] = useState(true);
  const [whisperDailyLimit, setWhisperDailyLimit] = useState("1");
  const [karmaShopEnabled, setKarmaShopEnabled] = useState(true);
  const [confessionEnabled, setConfessionEnabled] = useState(true);
  const [chaosEnabled, setChaosEnabled] = useState(true);
  const [pollEnabled, setPollEnabled] = useState(true);
  const [minReputationPost, setMinReputationPost] = useState("-100");
  const [publicEnemyThreshold, setPublicEnemyThreshold] = useState("-300");
  const [autoLockScore, setAutoLockScore] = useState("-500");
  const [hideScoreThreshold, setHideScoreThreshold] = useState("-50");
  const [feedAdsInterval, setFeedAdsInterval] = useState("5");
  const [premiumUsernamePrice, setPremiumUsernamePrice] = useState("50000");
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupContent, setPopupContent] = useState("");
  const [popupButtonText, setPopupButtonText] = useState("");
  const [popupButtonUrl, setPopupButtonUrl] = useState("");
  const [popupImageUrl, setPopupImageUrl] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (settings && !loaded) {
    setBlockedDomains(settings["blocked_domains"] || "");
    setPostExpiry(settings["post_expiry_hours"] || "48");
    setSiteName(settings["site_name"] || "CTRXL48");
    setSiteDescription(settings["site_description"] || "");
    setMaintenanceMode(settings["maintenance_mode"] === "true");
    setRegistrationOpen(settings["registration_open"] !== "false");
    setMaxPostLength(settings["max_post_length"] || "5000");
    setMaxCommentLength(settings["max_comment_length"] || "1000");
    setWhisperEnabled(settings["whisper_enabled"] !== "false");
    setWhisperDailyLimit(settings["whisper_daily_limit"] || "1");
    setKarmaShopEnabled(settings["karma_shop_enabled"] !== "false");
    setConfessionEnabled(settings["confession_enabled"] !== "false");
    setChaosEnabled(settings["chaos_enabled"] !== "false");
    setPollEnabled(settings["poll_enabled"] !== "false");
    setMinReputationPost(settings["min_reputation_post"] || "-100");
    setPublicEnemyThreshold(settings["public_enemy_threshold"] || "-300");
    setAutoLockScore(settings["auto_lock_score"] || "-500");
    setHideScoreThreshold(settings["hide_score_threshold"] || "-50");
    setFeedAdsInterval(settings["feed_ads_interval"] || "5");
    setPremiumUsernamePrice(settings["premium_username_price"] || "50000");
    setPopupEnabled(settings["popup_enabled"] === "true");
    setPopupTitle(settings["popup_title"] || "");
    setPopupContent(settings["popup_content"] || "");
    setPopupButtonText(settings["popup_button_text"] || "");
    setPopupButtonUrl(settings["popup_button_url"] || "");
    setPopupImageUrl(settings["popup_image_url"] || "");
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/admin/settings", {
      blocked_domains: blockedDomains,
      post_expiry_hours: postExpiry,
      site_name: siteName,
      site_description: siteDescription,
      maintenance_mode: maintenanceMode ? "true" : "false",
      registration_open: registrationOpen ? "true" : "false",
      max_post_length: maxPostLength,
      max_comment_length: maxCommentLength,
      whisper_enabled: whisperEnabled ? "true" : "false",
      whisper_daily_limit: whisperDailyLimit,
      karma_shop_enabled: karmaShopEnabled ? "true" : "false",
      confession_enabled: confessionEnabled ? "true" : "false",
      chaos_enabled: chaosEnabled ? "true" : "false",
      poll_enabled: pollEnabled ? "true" : "false",
      min_reputation_post: minReputationPost,
      public_enemy_threshold: publicEnemyThreshold,
      auto_lock_score: autoLockScore,
      hide_score_threshold: hideScoreThreshold,
      feed_ads_interval: feedAdsInterval,
      premium_username_price: premiumUsernamePrice,
      popup_enabled: popupEnabled ? "true" : "false",
      popup_title: popupTitle,
      popup_content: popupContent,
      popup_button_text: popupButtonText,
      popup_button_url: popupButtonUrl,
      popup_image_url: popupImageUrl,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/popup"] });
    },
  });

  if (isLoading) return <div className="h-40 bg-card rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Pengaturan Umum
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nama Situs</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="h-9" data-testid="input-site-name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Deskripsi Situs</Label>
            <Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} placeholder="Deskripsi singkat tentang forum..." className="resize-none min-h-[80px]" data-testid="textarea-site-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Kedaluwarsa Post (jam)</Label>
              <Input type="number" value={postExpiry} onChange={(e) => setPostExpiry(e.target.value)} className="h-9" data-testid="input-post-expiry" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Iklan di Feed (setiap N post)</Label>
              <Input type="number" value={feedAdsInterval} onChange={(e) => setFeedAdsInterval(e.target.value)} className="h-9" data-testid="input-feed-ads-interval" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Harga Username Premium (Rp)</Label>
            <Input type="number" value={premiumUsernamePrice} onChange={(e) => setPremiumUsernamePrice(e.target.value)} className="h-9" data-testid="input-premium-username-price" />
            <p className="text-[10px] text-muted-foreground">Harga pembelian username premium via bayar.gg</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Pendaftaran Terbuka</p>
              <p className="text-[10px] text-muted-foreground">Izinkan pengguna baru mendaftar</p>
            </div>
            <ToggleSwitch checked={registrationOpen} onChange={setRegistrationOpen} testId="toggle-registration" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Konten & Batas
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Maks. Panjang Post</Label>
              <Input type="number" value={maxPostLength} onChange={(e) => setMaxPostLength(e.target.value)} className="h-9" data-testid="input-max-post-length" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Maks. Panjang Komentar</Label>
              <Input type="number" value={maxCommentLength} onChange={(e) => setMaxCommentLength(e.target.value)} className="h-9" data-testid="input-max-comment-length" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Min. Reputasi Posting</Label>
              <Input type="number" value={minReputationPost} onChange={(e) => setMinReputationPost(e.target.value)} className="h-9" data-testid="input-min-rep-post" />
              <p className="text-[10px] text-muted-foreground">User di bawah ini tidak bisa posting</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Batas Bisikan/Hari</Label>
              <Input type="number" value={whisperDailyLimit} onChange={(e) => setWhisperDailyLimit(e.target.value)} className="h-9" data-testid="input-whisper-limit" />
              <p className="text-[10px] text-muted-foreground">Per orang per hari</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Skor & Reputasi
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sembunyikan Post (skor)</Label>
              <Input type="number" value={hideScoreThreshold} onChange={(e) => setHideScoreThreshold(e.target.value)} className="h-9" data-testid="input-hide-score" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auto-Kunci (skor)</Label>
              <Input type="number" value={autoLockScore} onChange={(e) => setAutoLockScore(e.target.value)} className="h-9" data-testid="input-auto-lock-score" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Musuh Publik (rep)</Label>
              <Input type="number" value={publicEnemyThreshold} onChange={(e) => setPublicEnemyThreshold(e.target.value)} className="h-9" data-testid="input-public-enemy" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Fitur On/Off
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Bisikan (Whisper)</p>
              <p className="text-[10px] text-muted-foreground">DM anonim antar pengguna</p>
            </div>
            <ToggleSwitch checked={whisperEnabled} onChange={setWhisperEnabled} testId="toggle-whisper" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Toko Karma</p>
              <p className="text-[10px] text-muted-foreground">Tukar karma dengan item spesial</p>
            </div>
            <ToggleSwitch checked={karmaShopEnabled} onChange={setKarmaShopEnabled} testId="toggle-karma-shop" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Mode Confession</p>
              <p className="text-[10px] text-muted-foreground">Posting tanpa identitas</p>
            </div>
            <ToggleSwitch checked={confessionEnabled} onChange={setConfessionEnabled} testId="toggle-confession" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Mode Chaos</p>
              <p className="text-[10px] text-muted-foreground">Mode kacau di feed</p>
            </div>
            <ToggleSwitch checked={chaosEnabled} onChange={setChaosEnabled} testId="toggle-chaos" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Polling</p>
              <p className="text-[10px] text-muted-foreground">Fitur polling di postingan</p>
            </div>
            <ToggleSwitch checked={pollEnabled} onChange={setPollEnabled} testId="toggle-poll" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Mode Pemeliharaan
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Aktifkan mode pemeliharaan</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Hanya admin yang bisa mengakses situs.
            </p>
          </div>
          <ToggleSwitch checked={maintenanceMode} onChange={setMaintenanceMode} testId="toggle-maintenance" />
        </div>
        {maintenanceMode && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Mode pemeliharaan akan aktif setelah disimpan. Hanya admin yang bisa mengakses situs.
            </p>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Ban className="w-4 h-4" />
          Pemblokiran Domain
        </h3>
        <div className="space-y-2">
          <Label className="text-xs">Domain Email/Tautan yang Diblokir</Label>
          <Textarea
            value={blockedDomains}
            onChange={(e) => setBlockedDomains(e.target.value)}
            placeholder="contoh.com, spam.org (pisahkan dengan koma)"
            className="resize-none min-h-[100px]"
            data-testid="textarea-blocked-domains"
          />
          <p className="text-[11px] text-muted-foreground">
            Daftar domain yang dipisahkan koma.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          Pop-up Pengumuman
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Aktifkan Pop-up</p>
              <p className="text-[10px] text-muted-foreground">Tampilkan pop-up saat pengguna membuka situs (1x/24 jam)</p>
            </div>
            <ToggleSwitch checked={popupEnabled} onChange={setPopupEnabled} testId="toggle-popup" />
          </div>
          {popupEnabled && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label className="text-xs">Judul Pop-up</Label>
                <Input value={popupTitle} onChange={(e) => setPopupTitle(e.target.value)} placeholder="Pengumuman Penting" className="h-9" data-testid="input-popup-title" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Isi Pop-up</Label>
                <Textarea value={popupContent} onChange={(e) => setPopupContent(e.target.value)} placeholder="Tulis pesan pengumuman di sini..." className="resize-none min-h-[100px]" data-testid="textarea-popup-content" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL Gambar (opsional)</Label>
                <Input value={popupImageUrl} onChange={(e) => setPopupImageUrl(e.target.value)} placeholder="https://contoh.com/gambar.jpg" className="h-9" data-testid="input-popup-image" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Teks Tombol (opsional)</Label>
                  <Input value={popupButtonText} onChange={(e) => setPopupButtonText(e.target.value)} placeholder="Lihat Selengkapnya" className="h-9" data-testid="input-popup-button-text" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">URL Tombol (opsional)</Label>
                  <Input value={popupButtonUrl} onChange={(e) => setPopupButtonUrl(e.target.value)} placeholder="https://..." className="h-9" data-testid="input-popup-button-url" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-10 px-6" data-testid="button-save-settings">
        {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </div>
  );
}

type AdminPayment = Payment & { username: string };

function TransactionsPanel() {
  const { data: payments, isLoading } = useQuery<AdminPayment[]>({
    queryKey: ["/api/admin/payments"],
  });

  if (isLoading) return <div className="h-40 bg-card rounded-xl animate-pulse" />;

  const typeLabels: Record<string, string> = {
    premium: "Premium",
    verified: "Terverifikasi",
    boost: "Boost",
    tip: "Tip",
    group: "Grup",
  };

  const statusColors: Record<string, string> = {
    paid: "text-green-500 bg-green-500/10",
    pending: "text-amber-500 bg-amber-500/10",
    failed: "text-destructive bg-destructive/10",
    expired: "text-muted-foreground bg-muted",
  };

  const totalRevenue = payments?.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const paidCount = payments?.filter(p => p.status === "paid").length ?? 0;
  const pendingCount = payments?.filter(p => p.status === "pending").length ?? 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Pendapatan</p>
          <p className="text-xl font-bold text-green-500 tabular-nums" data-testid="stat-total-revenue">Rp {totalRevenue.toLocaleString("id-ID")}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Lunas</p>
          <p className="text-xl font-bold text-foreground tabular-nums" data-testid="stat-paid-count">{paidCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Menunggu</p>
          <p className="text-xl font-bold text-amber-500 tabular-nums" data-testid="stat-pending-count">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pengguna</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Tipe</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Jumlah</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Invoice</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {payments?.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors" data-testid={`transaction-${p.id}`}>
                  <td className="p-3">
                    <span className="text-sm font-medium text-foreground">{p.username}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {typeLabels[p.type] || p.type}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
                      Rp {p.amount.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[p.status] || "text-muted-foreground bg-muted"}`}>
                      {p.status === "paid" ? "Lunas" : p.status === "pending" ? "Menunggu" : p.status === "failed" ? "Gagal" : "Kedaluwarsa"}
                    </span>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-[10px] text-muted-foreground font-mono">{p.invoiceId}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(p.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!payments || payments.length === 0) && (
          <div className="text-center py-12">
            <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
          </div>
        )}
      </div>
    </div>
  );
}

const PLACEMENT_OPTIONS = [
  { value: "sidebar", label: "Sidebar", desc: "Ditampilkan di sidebar kanan (desktop)" },
  { value: "feed", label: "Di Antara Feed", desc: "Muncul di antara postingan di feed utama" },
  { value: "header", label: "Banner Atas", desc: "Banner horizontal di bagian atas halaman" },
  { value: "post_detail", label: "Detail Post", desc: "Ditampilkan di halaman detail postingan" },
];

const PLACEMENT_LABELS: Record<string, string> = {
  sidebar: "Sidebar",
  feed: "Feed",
  header: "Banner Atas",
  post_detail: "Detail Post",
};

const PLACEMENT_COLORS: Record<string, string> = {
  sidebar: "text-blue-500 bg-blue-500/10",
  feed: "text-emerald-500 bg-emerald-500/10",
  header: "text-purple-500 bg-purple-500/10",
  post_detail: "text-amber-500 bg-amber-500/10",
};

function AdsPanel() {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placement, setPlacement] = useState("sidebar");

  const { data: adsList, isLoading } = useQuery<Ad[]>({
    queryKey: ["/api/ads"],
  });

  const invalidateAllAds = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/ads");
    }});
  };

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ads", { title, imageUrl, linkUrl, placement }),
    onSuccess: () => {
      invalidateAllAds();
      setTitle("");
      setImageUrl("");
      setLinkUrl("");
      setPlacement("sidebar");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/ads/${id}`),
    onSuccess: () => {
      invalidateAllAds();
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah Iklan Baru
        </h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Judul Iklan</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul iklan"
              className="mt-1"
              data-testid="input-ad-title"
            />
          </div>
          <div>
            <Label className="text-xs">URL Gambar</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              className="mt-1"
              data-testid="input-ad-image"
            />
          </div>
          <div>
            <Label className="text-xs">URL Tujuan</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
              data-testid="input-ad-link"
            />
          </div>
          <div>
            <Label className="text-xs">Penempatan Iklan</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {PLACEMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlacement(opt.value)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    placement === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                  data-testid={`placement-${opt.value}`}
                >
                  <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !title || !imageUrl || !linkUrl}
            className="h-9 text-sm"
            data-testid="button-create-ad"
          >
            {createMutation.isPending ? "Menyimpan..." : "Tambah Iklan"}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          Iklan Aktif ({adsList?.length ?? 0})
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>
        ) : adsList && adsList.length > 0 ? (
          <div className="space-y-3">
            {adsList.map((ad) => (
              <div key={ad.id} className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg" data-testid={`admin-ad-${ad.id}`}>
                <img src={ad.imageUrl} alt={ad.title} className="w-16 h-12 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{ad.title}</p>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${PLACEMENT_COLORS[ad.placement] || "text-muted-foreground bg-muted"}`}>
                      {PLACEMENT_LABELS[ad.placement] || ad.placement}
                    </span>
                  </div>
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {ad.linkUrl.substring(0, 40)}...
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate(ad.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-ad-${ad.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground text-sm">Belum ada iklan</p>
        )}
      </div>
    </div>
  );
}

type ReservedUsername = {
  id: string;
  username: string;
  price: number;
  category: string;
  isAvailable: boolean;
  createdAt: string;
};

function ReservedUsernamesPanel() {
  const { data: usernames, isLoading } = useQuery<ReservedUsername[]>({
    queryKey: ["/api/admin/reserved-usernames"],
  });

  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState("");
  const [price, setPrice] = useState("50000");
  const [category, setCategory] = useState("premium");
  const [glowColor1, setGlowColor1] = useState("#8b5cf6");
  const [glowColor2, setGlowColor2] = useState("#ec4899");
  const [useCustomGlow, setUseCustomGlow] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/reserved-usernames", {
      username: username.toLowerCase().trim(),
      price: parseInt(price),
      category,
      glowColor: useCustomGlow ? `${glowColor1},${glowColor2}` : null,
    }),
    onSuccess: () => {
      setCreating(false);
      setUsername("");
      setPrice("50000");
      setCategory("premium");
      setGlowColor1("#8b5cf6");
      setGlowColor2("#ec4899");
      setUseCustomGlow(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reserved-usernames"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reserved-usernames"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/reserved-usernames/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reserved-usernames"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reserved-usernames"] });
    },
  });

  if (isLoading) return <div className="h-40 bg-card rounded-xl animate-pulse" />;

  const categoryLabels: Record<string, string> = {
    premium: "Premium",
    brand: "Brand",
    short: "Pendek",
    rare: "Langka",
  };

  const categoryColors: Record<string, string> = {
    premium: "text-purple-500 bg-purple-500/10",
    brand: "text-blue-500 bg-blue-500/10",
    short: "text-amber-500 bg-amber-500/10",
    rare: "text-pink-500 bg-pink-500/10",
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Username Premium ({usernames?.length ?? 0})</h2>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreating(!creating)} data-testid="button-create-reserved-username">
          <Plus className="w-3.5 h-3.5" />
          Tambah Username
        </Button>
      </div>

      {creating && (
        <div className="bg-card rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="username_keren"
                className="h-9"
                data-testid="input-reserved-username"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Harga (Rp)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50000"
                className="h-9"
                data-testid="input-reserved-price"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Kategori</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`text-xs p-2 rounded-lg border-2 transition-all ${
                    category === key ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/30"
                  }`}
                  data-testid={`category-${key}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomGlow"
                checked={useCustomGlow}
                onChange={(e) => setUseCustomGlow(e.target.checked)}
                className="rounded"
                data-testid="checkbox-custom-glow"
              />
              <Label htmlFor="useCustomGlow" className="text-xs cursor-pointer">Warna Gradient Kustom</Label>
            </div>
            {useCustomGlow && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Warna 1</Label>
                  <input
                    type="color"
                    value={glowColor1}
                    onChange={(e) => setGlowColor1(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                    data-testid="input-glow-color-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Warna 2</Label>
                  <input
                    type="color"
                    value={glowColor2}
                    onChange={(e) => setGlowColor2(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                    data-testid="input-glow-color-2"
                  />
                </div>
                <span
                  className="text-sm font-bold ml-2"
                  style={getGlowStyle(`${glowColor1},${glowColor2}`) || undefined}
                >
                  u/{username || "preview"}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => createMutation.mutate()}
              disabled={!username.trim() || !price || createMutation.isPending}
              data-testid="button-save-reserved-username"
            >
              {createMutation.isPending ? "Menyimpan..." : "Tambah"}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCreating(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Username</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Kategori</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Harga</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {usernames?.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors" data-testid={`reserved-username-${u.id}`}>
                  <td className="p-3">
                    <span
                      className={`text-sm font-medium ${hasCustomGlow(u.glowColor) ? "" : "username-glow"}`}
                      style={hasCustomGlow(u.glowColor) ? getGlowStyle(u.glowColor) : undefined}
                    >u/{u.username}</span>
                    {u.glowColor && (
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{u.glowColor}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[u.category] || "text-muted-foreground bg-muted"}`}>
                      {categoryLabels[u.category] || u.category}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
                      Rp {u.price.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      u.isAvailable ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"
                    }`}>
                      {u.isAvailable ? "Tersedia" : "Terjual"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => deleteMutation.mutate(u.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-reserved-${u.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!usernames || usernames.length === 0) && !creating && (
          <div className="text-center py-12">
            <AtSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada username premium yang ditambahkan</p>
          </div>
        )}
      </div>
    </div>
  );
}

type AdminWithdrawal = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  method: string;
  accountNumber: string;
  accountName: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
};

function WithdrawalsPanel() {
  const { data: withdrawals, isLoading } = useQuery<AdminWithdrawal[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status, adminNote }),
    onSuccess: () => {
      setProcessingId(null);
      setAdminNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
  });

  if (isLoading) return <div className="h-40 bg-card rounded-xl animate-pulse" />;

  const statusColors: Record<string, string> = {
    pending: "text-amber-500 bg-amber-500/10",
    approved: "text-green-500 bg-green-500/10",
    rejected: "text-destructive bg-destructive/10",
    completed: "text-blue-500 bg-blue-500/10",
  };

  const statusLabels: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
    completed: "Selesai",
  };

  const pendingCount = withdrawals?.filter(w => w.status === "pending").length ?? 0;
  const totalPending = withdrawals?.filter(w => w.status === "pending").reduce((sum, w) => sum + w.amount, 0) ?? 0;
  const totalApproved = withdrawals?.filter(w => w.status === "approved" || w.status === "completed").reduce((sum, w) => sum + w.amount, 0) ?? 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Menunggu</p>
          <p className="text-xl font-bold text-amber-500 tabular-nums" data-testid="stat-pending-withdrawals">{pendingCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Pending</p>
          <p className="text-xl font-bold text-foreground tabular-nums" data-testid="stat-total-pending">Rp {totalPending.toLocaleString("id-ID")}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Disetujui</p>
          <p className="text-xl font-bold text-green-500 tabular-nums" data-testid="stat-total-approved">Rp {totalApproved.toLocaleString("id-ID")}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pengguna</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Metode</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Jumlah</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals?.map((w) => (
                <tr key={w.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors" data-testid={`withdrawal-${w.id}`}>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{w.username}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(w.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                      </p>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <div>
                      <p className="text-xs font-medium text-foreground">{w.method}</p>
                      <p className="text-[10px] text-muted-foreground">{w.accountNumber} · {w.accountName}</p>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
                      Rp {w.amount.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[w.status] || "text-muted-foreground bg-muted"}`}>
                      {statusLabels[w.status] || w.status}
                    </span>
                    {w.adminNote && (
                      <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] truncate" title={w.adminNote}>
                        {w.adminNote}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {w.status === "pending" ? (
                      processingId === w.id ? (
                        <div className="space-y-2">
                          <Input
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="Catatan (opsional)..."
                            className="h-7 text-xs"
                            data-testid={`input-note-${w.id}`}
                          />
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => updateMutation.mutate({ id: w.id, status: "approved", adminNote })}
                              disabled={updateMutation.isPending}
                              data-testid={`button-approve-${w.id}`}
                            >
                              <Check className="w-3 h-3" />
                              Setuju
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs gap-1"
                              onClick={() => updateMutation.mutate({ id: w.id, status: "rejected", adminNote })}
                              disabled={updateMutation.isPending}
                              data-testid={`button-reject-${w.id}`}
                            >
                              <X className="w-3 h-3" />
                              Tolak
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => { setProcessingId(null); setAdminNote(""); }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setProcessingId(w.id); setAdminNote(""); }}
                          data-testid={`button-process-${w.id}`}
                        >
                          Proses
                        </Button>
                      )
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!withdrawals || withdrawals.length === 0) && (
          <div className="text-center py-12">
            <Banknote className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada permintaan penarikan</p>
          </div>
        )}
      </div>
    </div>
  );
}

type ChallengeData = {
  id: string;
  title: string;
  description: string;
  type: string;
  metric: string;
  target: number;
  rewardKarma: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
};

function ChallengesPanel() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"daily" | "weekly">("daily");
  const [metric, setMetric] = useState("posts");
  const [target, setTarget] = useState("5");
  const [rewardKarma, setRewardKarma] = useState("50");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");

  const { data: challenges, isLoading } = useQuery<ChallengeData[]>({
    queryKey: ["/api/challenges"],
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/challenges", {
        title,
        description,
        type,
        metric,
        target: parseInt(target),
        rewardKarma: parseInt(rewardKarma),
        endsAt,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setType("daily");
      setMetric("posts");
      setTarget("5");
      setRewardKarma("50");
      setEndsAt("");
      setError("");
    },
    onError: (e: any) => {
      setError(e?.message || "Gagal membuat tantangan");
    },
  });

  const metricOptions = [
    { value: "posts", label: "Buat Postingan" },
    { value: "comments", label: "Buat Komentar" },
    { value: "votes", label: "Berikan Vote" },
    { value: "upvotes_received", label: "Terima Upvote" },
    { value: "karma", label: "Raih Karma" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Kelola Tantangan</h2>
        <Button
          size="sm"
          className="rounded-full text-xs gap-1.5"
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-challenge"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Batal" : "Buat Tantangan"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border p-4 space-y-3" data-testid="form-create-challenge">
          <div>
            <Label className="text-xs mb-1.5 block">Judul</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Raja Postingan Hari Ini"
              className="text-sm"
              data-testid="input-challenge-title"
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Deskripsi</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tantangan ini..."
              className="text-sm min-h-[60px]"
              data-testid="input-challenge-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Tipe</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "daily" | "weekly")}
                className="w-full h-9 px-3 text-sm rounded-md border bg-background"
                data-testid="select-challenge-type"
              >
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Metrik</Label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-md border bg-background"
                data-testid="select-challenge-metric"
              >
                {metricOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Target</Label>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                min="1"
                className="text-sm"
                data-testid="input-challenge-target"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Reward Karma</Label>
              <Input
                type="number"
                value={rewardKarma}
                onChange={(e) => setRewardKarma(e.target.value)}
                min="1"
                className="text-sm"
                data-testid="input-challenge-reward"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Berakhir</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="text-sm"
                data-testid="input-challenge-ends"
              />
            </div>
          </div>
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
          <Button
            onClick={() => { setError(""); createMutation.mutate(); }}
            disabled={!title || !description || !endsAt || !parseInt(target) || !parseInt(rewardKarma) || createMutation.isPending}
            className="w-full rounded-full text-sm"
            data-testid="button-submit-challenge"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Trophy className="w-4 h-4 mr-1.5" />
            )}
            Buat Tantangan
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {challenges && challenges.length > 0 ? (
          challenges.map((c) => {
            const isExpired = new Date(c.endsAt) < new Date();
            return (
              <div
                key={c.id}
                className={`bg-card rounded-xl border p-4 ${isExpired ? "opacity-60" : ""}`}
                data-testid={`challenge-card-${c.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        c.type === "daily"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-purple-500/10 text-purple-500"
                      }`}>
                        {c.type === "daily" ? "Harian" : "Mingguan"}
                      </span>
                      {isExpired && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Selesai
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {metricOptions.find(m => m.value === c.metric)?.label || c.metric}: {c.target}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        +{c.rewardKarma} karma
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isExpired ? "Berakhir" : "Berakhir"} {formatDistanceToNow(new Date(c.endsAt), { addSuffix: true, locale: idLocale })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada tantangan</p>
          </div>
        )}
      </div>
    </div>
  );
}
