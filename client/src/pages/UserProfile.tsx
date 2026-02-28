import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type UserProfile as UserProfileType, type PostWithUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar, Award, MessageSquare, FileText, Shield, AlertTriangle,
  Edit2, Check, X, Camera, Loader2, Crown, BadgeCheck, Trophy
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
  const [tab, setTab] = useState<"posts" | "comments" | "achievements">("posts");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
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

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/profile", { displayName: editDisplayName, bio: editBio }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
    },
  });

  const isOwnProfile = currentUser?.username === username;

  const startEditing = () => {
    setEditDisplayName(profile?.displayName || "");
    setEditBio(profile?.bio || "");
    setEditing(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      }
    } finally {
      setUploadingBanner(false);
    }
  };

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
              <div className="p-5 sm:p-6 -mt-10 sm:-mt-12">
                <div className="flex items-end gap-4 mb-4">
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
                  <div className="flex-1 min-w-0 pb-1">
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
                    <p className={`text-sm ${profile.isPremiumUsername ? "username-glow" : "text-muted-foreground"}`}>u/{profile.username}</p>
                  </div>
                  {isOwnProfile && !editing && (
                    <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 shrink-0 rounded-xl" onClick={startEditing} data-testid="button-edit-profile">
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </Button>
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
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 mb-5">
              <button
                onClick={() => setTab("posts")}
                className={`flex-1 px-4 py-2.5 text-sm rounded-full transition-all ${
                  tab === "posts" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-posts"
              >
                Postingan
              </button>
              <button
                onClick={() => setTab("comments")}
                className={`flex-1 px-4 py-2.5 text-sm rounded-full transition-all ${
                  tab === "comments" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-comments"
              >
                Komentar
              </button>
              <button
                onClick={() => setTab("achievements")}
                className={`flex-1 px-4 py-2.5 text-sm rounded-full transition-all flex items-center justify-center gap-1.5 ${
                  tab === "achievements" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-achievements"
              >
                <Trophy className="w-3.5 h-3.5" />
                Pencapaian
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
          </>
        )}
      </main>
    </div>
  );
}
