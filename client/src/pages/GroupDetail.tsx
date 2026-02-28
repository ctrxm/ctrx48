import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import type { GroupWithInfo, PostWithUser } from "@shared/schema";
import {
  Users, Plus, Lock, Globe, UserPlus, LogOut, ArrowLeft,
  Shield, Crown, ChevronDown, ChevronUp, Camera, Loader2, ImageIcon
} from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export default function GroupDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/groups/:slug");
  const slug = params?.slug ?? "";
  const [showMembers, setShowMembers] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { toast } = useToast();

  const { data: group, isLoading } = useQuery<GroupWithInfo>({
    queryKey: ["/api/groups", slug],
  });

  const { data: posts } = useQuery<PostWithUser[]>({
    queryKey: ["/api/groups", slug, "posts"],
    enabled: !!group,
  });

  const { data: members } = useQuery<{ userId: string; username: string; role: string; avatarUrl?: string | null }[]>({
    queryKey: ["/api/groups", slug, "members"],
    enabled: showMembers && !!group,
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${slug}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${slug}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiRequest("PATCH", `/api/groups/${slug}/members/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", slug, "members"] });
    },
  });

  const isOwnerOrMod = group?.userRole === "owner" || group?.userRole === "moderator";

  const handleImageUpload = async (file: File, type: "banner" | "avatar") => {
    const setUploading = type === "banner" ? setUploadingBanner : setUploadingAvatar;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload gagal");
      const { url } = await res.json();
      await apiRequest("PATCH", `/api/groups/${slug}`, { [type === "banner" ? "bannerUrl" : "avatarUrl"]: url });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      if (type === "banner") setBannerError(false);
      else setAvatarError(false);
      toast({ title: `${type === "banner" ? "Banner" : "Foto"} grup berhasil diperbarui` });
    } catch (e: any) {
      toast({ title: "Gagal mengupload gambar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[700px] mx-auto px-4 py-6 mobile-feed-padding">
        <Link href="/groups" data-testid="link-back-groups">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Grup
          </span>
        </Link>

        {isLoading ? (
          <div className="h-48 bg-muted/50 rounded-2xl animate-pulse" />
        ) : !group ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Grup tidak ditemukan</p>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-2xl overflow-hidden mb-6">
              <div className="relative h-32 sm:h-40">
                {group.bannerUrl && !bannerError ? (
                  <img src={group.bannerUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setBannerError(true)} />
                ) : (
                  <div className="w-full h-full bg-gradient-brand opacity-70" />
                )}
                {isOwnerOrMod && (
                  <>
                    <button
                      onClick={() => bannerRef.current?.click()}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                      data-testid="button-edit-group-banner"
                    >
                      {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                    <input
                      ref={bannerRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "banner");
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>

              <div className="px-5 sm:px-6 -mt-8">
                <div className="flex items-end gap-3">
                  <div className="relative shrink-0">
                    {group.avatarUrl && !avatarError ? (
                      <img
                        src={group.avatarUrl}
                        alt=""
                        className="w-16 h-16 rounded-xl border-4 border-card object-cover shadow-lg"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-4 border-card bg-gradient-brand flex items-center justify-center text-white text-lg font-bold uppercase shadow-lg">
                        {group.name[0]}
                      </div>
                    )}
                    {isOwnerOrMod && (
                      <>
                        <button
                          onClick={() => avatarRef.current?.click()}
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shadow-md hover:bg-primary/90 transition-colors"
                          data-testid="button-edit-group-avatar"
                        >
                          {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                        </button>
                        <input
                          ref={avatarRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "avatar");
                            e.target.value = "";
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-6 pt-3 pb-5 sm:pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-xl font-bold text-foreground truncate" data-testid="text-group-name">{group.name}</h1>
                      {group.isPrivate ? <Lock className="w-4 h-4 text-muted-foreground shrink-0" /> : <Globe className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">g/{group.slug} · Dibuat oleh u/{group.creatorUsername}</p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{group.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {group.memberCount} anggota
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {user && (
                      group.isMember ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 rounded-xl"
                          onClick={() => leaveMutation.mutate()}
                          disabled={leaveMutation.isPending || group.userRole === "owner"}
                          data-testid="button-leave-group"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Keluar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 rounded-xl"
                          onClick={() => joinMutation.mutate()}
                          disabled={joinMutation.isPending}
                          data-testid="button-join-group"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Gabung
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-xl"
                  onClick={() => setShowMembers(!showMembers)}
                  data-testid="button-toggle-members"
                >
                  <Users className="w-3.5 h-3.5" />
                  Anggota
                  {showMembers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
              {group.isMember && (
                <Link href={`/new?group=${slug}`} data-testid="link-new-group-post">
                  <Button size="sm" className="h-8 text-xs gap-1.5 rounded-xl">
                    <Plus className="w-3.5 h-3.5" />
                    Buat Postingan
                  </Button>
                </Link>
              )}
            </div>

            {showMembers && members && (
              <div className="bg-card rounded-xl p-4 mb-4 animate-fade-in">
                <h3 className="text-sm font-semibold mb-3">Anggota ({members.length})</h3>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between" data-testid={`member-${m.username}`}>
                      <div className="flex items-center gap-2">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-bold uppercase">
                            {m.username[0]}
                          </div>
                        )}
                        <Link href={`/u/${m.username}`}>
                          <span className="text-sm hover:text-primary cursor-pointer transition-colors">{m.username}</span>
                        </Link>
                        {m.role === "owner" && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" />
                            Owner
                          </span>
                        )}
                        {m.role === "moderator" && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" />
                            Moderator
                          </span>
                        )}
                      </div>
                      {isOwnerOrMod && m.role !== "owner" && m.userId !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 rounded-lg"
                          onClick={() => roleMutation.mutate({
                            userId: m.userId,
                            role: m.role === "moderator" ? "member" : "moderator"
                          })}
                          disabled={roleMutation.isPending}
                          data-testid={`button-role-${m.username}`}
                        >
                          {m.role === "moderator" ? "Hapus Mod" : "Jadikan Mod"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {!posts || posts.length === 0 ? (
                <div className="text-center py-16">
                  <Plus className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada postingan di grup ini</p>
                  {group.isMember && (
                    <Link href={`/new?group=${slug}`}>
                      <Button size="sm" className="mt-4 h-8 text-xs gap-1.5 rounded-xl">
                        <Plus className="w-3.5 h-3.5" />
                        Jadi yang pertama posting
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                posts.map((post) => <PostCard key={post.id} post={post} />)
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
