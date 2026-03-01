import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { type UserProfile as UserProfileType, type PostWithUser, type UserStats, type UserProfileTheme, getRankFromLevel, getXPForLevel } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PaymentModal } from "@/components/PaymentModal";
import { useToast } from "@/hooks/use-toast";
import { getGlowStyle, hasCustomGlow } from "@/lib/usernameGlow";
import {
  Calendar, Award, MessageSquare, FileText, Shield, AlertTriangle,
  Edit2, Check, X, Camera, Loader2, Crown, BadgeCheck, Trophy, AtSign,
  BarChart3, TrendingUp, ThumbsUp, ThumbsDown, Clock, Sparkles, Palette, Tag
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";
import { AchievementBadge } from "@/components/AchievementBadge";
import { type AchievementWithStatus } from "@shared/schema";

export default function UserProfile() {
  const { user: currentUser } = useAuth();
  const [, params] = useRoute("/u/:username");
  const username = params?.username ?? "";
  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [tab, setTab] = useState<"posts" | "comments" | "achievements" | "stats">("posts");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [editFlair, setEditFlair] = useState("");
  const [editingFlair, setEditingFlair] = useState(false);
  const [themeGradientStart, setThemeGradientStart] = useState("#6366f1");
  const [themeGradientEnd, setThemeGradientEnd] = useState("#8b5cf6");
  const [themeAccentColor, setThemeAccentColor] = useState("#6366f1");
  const [editingTheme, setEditingTheme] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean; invoiceId: string; paymentUrl: string; description: string; amount: number; finalAmount: number;
  }>({ isOpen: false, invoiceId: "", paymentUrl: "", description: "", amount: 0, finalAmount: 0 });
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery<UserProfileType>({
    queryKey: ["/api/users", username],
    staleTime: 0,
  });

  useEffect(() => {
    setAvatarError(false);
    setBannerError(false);
  }, [profile?.avatarUrl, profile?.bannerUrl]);

  const { data: userPosts } = useQuery<PostWithUser[]>({
    queryKey: ["/api/users", username, "posts"],
    enabled: tab === "posts",
  });

  const { data: userAchievements } = useQuery<AchievementWithStatus[]>({
    queryKey: ["/api/users", username, "achievements"],
    enabled: tab === "achievements",
  });

  const { data: levelData } = useQuery<{ xp: number; level: number; rank: string }>({
    queryKey: ["/api/users", username, "level"],
  });

  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/users", username, "stats"],
    enabled: tab === "stats",
  });

  const isOwnProfile = currentUser?.username === username;

  const { data: profileTheme } = useQuery<UserProfileTheme>({
    queryKey: ["/api/profile/theme"],
    enabled: !!currentUser && isOwnProfile,
  });

  useEffect(() => {
    if (profileTheme) {
      setThemeGradientStart(profileTheme.gradientFrom || "#6366f1");
      setThemeGradientEnd(profileTheme.gradientTo || "#8b5cf6");
      setThemeAccentColor(profileTheme.accentColor || "#6366f1");
    }
  }, [profileTheme]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/profile", { displayName: editDisplayName, bio: editBio }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
    },
  });

  const flairMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/profile/flair", { flair: editFlair }),
    onSuccess: () => {
      setEditingFlair(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
      toast({ title: "Flair berhasil diubah" });
    },
    onError: () => {
      toast({ title: "Gagal mengubah flair", variant: "destructive" });
    },
  });

  const themeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/profile/theme", {
        gradientFrom: themeGradientStart,
        gradientTo: themeGradientEnd,
        accentColor: themeAccentColor,
      }),
    onSuccess: () => {
      setEditingTheme(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/theme"] });
      toast({ title: "Tema profil berhasil diubah" });
    },
    onError: () => {
      toast({ title: "Gagal mengubah tema", variant: "destructive" });
    },
  });

  const changeUsernameMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw { ...data, _isApiError: true };
      }
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "Berhasil", description: data.message || "Username berhasil diubah" });
      setEditingUsername(false);
      setNewUsername("");
      setUsernameError("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation(`/u/${data.user?.username || newUsername}`);
    },
    onError: async (err: any) => {
      if (err._isApiError && (err.reserved || err.shortUsername)) {
        setUsernameError(err.message);
        try {
          const buyRes = await fetch("/api/payments/buy-username", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: newUsername, reservedId: err.reservedId }),
            credentials: "include",
          });
          if (buyRes.ok) {
            const buyData = await buyRes.json();
            setPaymentModal({
              isOpen: true,
              invoiceId: buyData.invoiceId,
              paymentUrl: buyData.paymentUrl,
              description: `Beli Username: ${newUsername}`,
              amount: err.price || 0,
              finalAmount: buyData.finalAmount || err.price || 0,
            });
          }
        } catch {}
      } else {
        setUsernameError(err.message || "Gagal mengubah username");
      }
    },
  });

  const startEditing = () => {
    setEditDisplayName(profile?.displayName || "");
    setEditBio(profile?.bio || "");
    setEditing(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Ukuran maksimal 4MB", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Avatar berhasil diubah" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Gagal upload avatar", description: data.message || "Coba file yang lebih kecil", variant: "destructive" });
      }
    } catch {
      toast({ title: "Gagal upload avatar", description: "Terjadi kesalahan jaringan", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Ukuran maksimal 4MB", variant: "destructive" });
      return;
    }
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/banner", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
        toast({ title: "Banner berhasil diubah" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Gagal upload banner", description: data.message || "Coba file yang lebih kecil", variant: "destructive" });
      }
    } catch {
      toast({ title: "Gagal upload banner", description: "Terjadi kesalahan jaringan", variant: "destructive" });
    } finally {
      setUploadingBanner(false);
    }
  };

  const currentLevel = levelData?.level ?? profile?.level ?? 0;
  const currentXP = levelData?.xp ?? profile?.xp ?? 0;
  const currentRank = levelData?.rank ?? profile?.rank ?? getRankFromLevel(currentLevel);
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(currentLevel + 1);
  const xpProgress = xpForNextLevel > xpForCurrentLevel
    ? ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
    : 0;

  const bannerGradient = profile?.profileTheme?.gradientFrom && profile?.profileTheme?.gradientTo
    ? `linear-gradient(135deg, ${profile.profileTheme.gradientFrom}, ${profile.profileTheme.gradientTo})`
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[700px] mx-auto px-4 py-6 mobile-feed-padding">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 bg-muted/50 rounded-2xl animate-pulse" />
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <p className="text-sm font-medium text-muted-foreground">Pengguna tidak ditemukan</p>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-2xl overflow-hidden mb-6">
              <div className="relative h-28 sm:h-36">
                {profile.bannerUrl && !bannerError ? (
                  <img src={profile.bannerUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setBannerError(true)} />
                ) : bannerGradient ? (
                  <div className="w-full h-full" style={{ background: bannerGradient }} />
                ) : (
                  <div className="w-full h-full bg-gradient-brand opacity-80" />
                )}
                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => bannerRef.current?.click()}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                      data-testid="button-edit-banner"
                    >
                      {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                    <input
                      ref={bannerRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleBannerUpload}
                    />
                  </>
                )}
              </div>
              <div className="px-5 sm:px-6 -mt-10 sm:-mt-12">
                <div className="flex items-end gap-4">
                  <div className="relative shrink-0">
                    {profile.avatarUrl && !avatarError ? (
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="w-18 h-18 sm:w-22 sm:h-22 rounded-full border-4 border-card object-cover shadow-lg"
                        style={{ width: '72px', height: '72px' }}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="rounded-full bg-gradient-brand border-4 border-card flex items-center justify-center text-white text-xl sm:text-2xl font-bold uppercase shadow-lg" style={{ width: '72px', height: '72px' }}>
                        {profile.username[0]}
                      </div>
                    )}
                    {isOwnProfile && (
                      <>
                        <button
                          onClick={() => avatarRef.current?.click()}
                          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white shadow-md hover:bg-primary/90 transition-colors"
                          data-testid="button-edit-avatar"
                        >
                          {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          ref={avatarRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </>
                    )}
                  </div>
                  {isOwnProfile && !editing && (
                    <div className="mb-1 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs gap-1.5 h-8"
                        onClick={startEditing}
                        data-testid="button-edit-profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 sm:px-6 pt-3 pb-5 sm:pb-6">
                <div className="mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-xl font-bold text-foreground inline-flex items-center gap-1.5">
                        {profile.displayName || profile.username}
                        {profile.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" data-testid="badge-profile-verified" />}
                        {profile.isPremium && <Crown className="w-5 h-5 text-yellow-500" data-testid="badge-profile-premium" />}
                      </h1>
                      {profile.role === "admin" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" />
                          ADMIN
                        </span>
                      )}
                      {profile.reputation <= -300 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          MUSUH PUBLIK
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm ${profile.isPremiumUsername ? (hasCustomGlow(profile.usernameGlow) ? "font-bold" : "username-glow") : "text-muted-foreground"}`}
                        style={profile.isPremiumUsername ? getGlowStyle(profile.usernameGlow) : undefined}
                      >u/{profile.username}</p>
                      {isOwnProfile && !editingUsername && (
                        <button
                          onClick={() => { setEditingUsername(true); setNewUsername(""); setUsernameError(""); }}
                          className="text-[10px] text-primary hover:underline cursor-pointer"
                          data-testid="button-edit-username"
                        >
                          Ubah
                        </button>
                      )}
                    </div>
                    {profile.customFlair && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground mt-1" data-testid="text-user-flair">
                        <Tag className="w-3 h-3" />
                        {profile.customFlair}
                      </span>
                    )}
                    {editingUsername && isOwnProfile && (
                      <div className="mt-2 space-y-2 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              value={newUsername}
                              onChange={(e) => { setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "")); setUsernameError(""); }}
                              placeholder="username_baru"
                              className="h-8 text-xs pl-8 rounded-lg"
                              maxLength={20}
                              data-testid="input-new-username"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1 rounded-lg px-3"
                            onClick={() => changeUsernameMutation.mutate()}
                            disabled={!newUsername.trim() || newUsername.length < 1 || changeUsernameMutation.isPending}
                            data-testid="button-save-username"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                            onClick={() => { setEditingUsername(false); setUsernameError(""); }}
                            data-testid="button-cancel-username"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        {usernameError && (
                          <p className="text-[11px] text-destructive" data-testid="text-username-error">{usernameError}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Huruf, angka, underscore. Username premium/pendek memerlukan pembayaran.
                        </p>
                      </div>
                    )}
                  </div>

                {profile.badges && profile.badges.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {profile.badges.map((badge) => (
                      <span
                        key={badge.id}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: badge.color, backgroundColor: `${badge.color}15` }}
                        title={badge.description}
                        data-testid={`badge-${badge.id}`}
                      >
                        <span>{badge.icon}</span>
                        {badge.name}
                      </span>
                    ))}
                  </div>
                )}

                {editing ? (
                  <div className="space-y-3 mb-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nama Tampilan</Label>
                      <Input
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="Nama tampilan kamu"
                        className="h-10 rounded-xl"
                        maxLength={50}
                        data-testid="input-display-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bio</Label>
                      <Textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Ceritakan tentang dirimu..."
                        className="resize-none min-h-[80px] rounded-xl"
                        maxLength={500}
                        data-testid="textarea-bio"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-9 text-xs gap-1 rounded-xl" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} data-testid="button-save-profile">
                        <Check className="w-3 h-3" />
                        Simpan
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 text-xs gap-1 rounded-xl" onClick={() => setEditing(false)}>
                        <X className="w-3 h-3" />
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : profile.bio ? (
                  <p className="text-sm text-muted-foreground mb-4 max-w-lg leading-relaxed">{profile.bio}</p>
                ) : null}

                <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span className={`font-semibold ${profile.reputation >= 0 ? "text-primary" : "text-destructive"}`}>
                      {profile.reputation >= 0 ? "+" : ""}{profile.reputation}
                    </span>
                    karma
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {profile.postCount} postingan
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {profile.commentCount} komentar
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Bergabung {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true, locale: idLocale })}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-muted/40 rounded-xl" data-testid="section-level-xp">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-semibold text-foreground" data-testid="text-level">
                        Level {currentLevel}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary" data-testid="text-rank">
                        {currentRank}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground" data-testid="text-xp">
                      {currentXP} / {xpForNextLevel} XP
                    </span>
                  </div>
                  <Progress value={Math.min(xpProgress, 100)} className="h-2" data-testid="progress-xp" />
                </div>

                {isOwnProfile && profile.isPremium && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs gap-1.5"
                        onClick={() => { setEditingFlair(true); setEditFlair(profile.customFlair || ""); }}
                        data-testid="button-edit-flair"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {profile.customFlair ? "Ubah Flair" : "Tambah Flair"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs gap-1.5"
                        onClick={() => setEditingTheme(!editingTheme)}
                        data-testid="button-edit-theme"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        Tema Profil
                      </Button>
                    </div>

                    {editingFlair && (
                      <div className="flex items-center gap-2 max-w-xs">
                        <Input
                          value={editFlair}
                          onChange={(e) => setEditFlair(e.target.value)}
                          placeholder="Flair kamu (maks 20 karakter)"
                          className="h-8 text-xs rounded-lg"
                          maxLength={20}
                          data-testid="input-flair"
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 rounded-lg px-3"
                          onClick={() => flairMutation.mutate()}
                          disabled={flairMutation.isPending}
                          data-testid="button-save-flair"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => setEditingFlair(false)}
                          data-testid="button-cancel-flair"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {editingTheme && (
                      <Card className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground">Kustomisasi Tema</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Gradient Awal</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={themeGradientStart}
                                onChange={(e) => setThemeGradientStart(e.target.value)}
                                className="w-8 h-8 rounded-md border border-input cursor-pointer"
                                data-testid="input-gradient-start"
                              />
                              <span className="text-[10px] text-muted-foreground">{themeGradientStart}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Gradient Akhir</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={themeGradientEnd}
                                onChange={(e) => setThemeGradientEnd(e.target.value)}
                                className="w-8 h-8 rounded-md border border-input cursor-pointer"
                                data-testid="input-gradient-end"
                              />
                              <span className="text-[10px] text-muted-foreground">{themeGradientEnd}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Warna Aksen</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={themeAccentColor}
                              onChange={(e) => setThemeAccentColor(e.target.value)}
                              className="w-8 h-8 rounded-md border border-input cursor-pointer"
                              data-testid="input-accent-color"
                            />
                            <span className="text-[10px] text-muted-foreground">{themeAccentColor}</span>
                          </div>
                        </div>
                        <div className="h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${themeGradientStart}, ${themeGradientEnd})` }} data-testid="preview-gradient" />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => themeMutation.mutate()}
                            disabled={themeMutation.isPending}
                            data-testid="button-save-theme"
                          >
                            {themeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Simpan Tema
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditingTheme(false)}>
                            Batal
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 mb-5">
              <button
                onClick={() => setTab("posts")}
                className={`flex-1 px-3 py-2.5 text-sm rounded-full transition-all ${
                  tab === "posts" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-posts"
              >
                Postingan
              </button>
              <button
                onClick={() => setTab("comments")}
                className={`flex-1 px-3 py-2.5 text-sm rounded-full transition-all ${
                  tab === "comments" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-comments"
              >
                Komentar
              </button>
              <button
                onClick={() => setTab("achievements")}
                className={`flex-1 px-3 py-2.5 text-sm rounded-full transition-all flex items-center justify-center gap-1.5 ${
                  tab === "achievements" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-achievements"
              >
                <Trophy className="w-3.5 h-3.5" />
                Pencapaian
              </button>
              <button
                onClick={() => setTab("stats")}
                className={`flex-1 px-3 py-2.5 text-sm rounded-full transition-all flex items-center justify-center gap-1.5 ${
                  tab === "stats" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-stats"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Statistik
              </button>
            </div>

            {tab === "posts" && (
              <div className="space-y-2">
                {!userPosts || userPosts.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada postingan</p>
                  </div>
                ) : (
                  userPosts.map((post) => <PostCard key={post.id} post={post} />)
                )}
              </div>
            )}

            {tab === "comments" && (
              <div className="text-center py-16">
                <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Riwayat komentar segera hadir</p>
              </div>
            )}

            {tab === "achievements" && (
              <div className="space-y-2" data-testid="list-user-achievements">
                {!userAchievements || userAchievements.length === 0 ? (
                  <div className="text-center py-16">
                    <Trophy className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada pencapaian</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userAchievements.map((a) => (
                      <AchievementBadge key={a.id} achievement={a} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "stats" && (
              <div className="space-y-4" data-testid="section-stats">
                {!userStats ? (
                  <div className="text-center py-16">
                    <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-muted-foreground">Memuat statistik...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card className="p-4 text-center">
                        <FileText className="w-5 h-5 text-primary mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground" data-testid="text-stat-posts">{userStats.totalPosts}</p>
                        <p className="text-[11px] text-muted-foreground">Total Post</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <MessageSquare className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground" data-testid="text-stat-comments">{userStats.totalComments}</p>
                        <p className="text-[11px] text-muted-foreground">Total Komentar</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <ThumbsUp className="w-5 h-5 text-green-500 mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground" data-testid="text-stat-upvotes">{userStats.totalUpvotesReceived}</p>
                        <p className="text-[11px] text-muted-foreground">Upvote Diterima</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <ThumbsDown className="w-5 h-5 text-red-500 mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground" data-testid="text-stat-downvotes">{userStats.totalDownvotesReceived}</p>
                        <p className="text-[11px] text-muted-foreground">Downvote Diterima</p>
                      </Card>
                    </div>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">Jam Paling Aktif</span>
                      </div>
                      <p className="text-2xl font-bold text-primary" data-testid="text-favorite-hour">
                        {String(userStats.favoriteHour).padStart(2, "0")}:00
                      </p>
                      <p className="text-[11px] text-muted-foreground">Waktu kamu paling sering posting</p>
                    </Card>

                    {userStats.activityGraph && userStats.activityGraph.length > 0 && (
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">Aktivitas 30 Hari Terakhir</span>
                        </div>
                        <div className="flex items-end gap-[2px] h-24" data-testid="chart-activity">
                          {userStats.activityGraph.slice(-30).map((day, i) => {
                            const total = day.posts + day.comments;
                            const maxTotal = Math.max(...userStats.activityGraph.slice(-30).map(d => d.posts + d.comments), 1);
                            const heightPct = (total / maxTotal) * 100;
                            return (
                              <div
                                key={i}
                                className="flex-1 min-w-0 rounded-t-sm bg-primary/60 hover:bg-primary transition-colors"
                                style={{ height: `${Math.max(heightPct, 2)}%` }}
                                title={`${day.date}: ${day.posts} post, ${day.comments} komentar`}
                                data-testid={`bar-activity-${i}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {userStats.activityGraph.slice(-30)[0]?.date}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {userStats.activityGraph.slice(-30)[userStats.activityGraph.slice(-30).length - 1]?.date}
                          </span>
                        </div>
                      </Card>
                    )}

                    {userStats.topPost && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          Postingan Terbaik
                        </p>
                        <PostCard post={userStats.topPost} />
                      </div>
                    )}

                    {userStats.favoriteTags && userStats.favoriteTags.length > 0 && (
                      <Card className="p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Tag Favorit</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {userStats.favoriteTags.map((t) => (
                            <span
                              key={t.tag}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                              data-testid={`tag-${t.tag}`}
                            >
                              #{t.tag} ({t.count})
                            </span>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(p => ({ ...p, isOpen: false }))}
        invoiceId={paymentModal.invoiceId}
        paymentUrl={paymentModal.paymentUrl}
        description={paymentModal.description}
        amount={paymentModal.amount}
        finalAmount={paymentModal.finalAmount}
      />
    </div>
  );
}