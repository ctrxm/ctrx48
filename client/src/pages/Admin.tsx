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
  Settings, Award, Plus, X, Megaphone, ExternalLink, CreditCard, Wrench
} from "lucide-react";
import { useState } from "react";
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
  const [tab, setTab] = useState<"overview" | "users" | "posts" | "settings" | "badges" | "ads" | "transactions">("overview");

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
                      <p className="text-sm font-medium text-foreground">{u.username}</p>
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
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
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
