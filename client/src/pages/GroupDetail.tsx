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
  Shield, Crown, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { useState } from "react";

export default function GroupDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/groups/:slug");
  const slug = params?.slug ?? "";
  const [showMembers, setShowMembers] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Link href="/groups" data-testid="link-back-groups">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Grup
          </span>
        </Link>

        {isLoading ? (
          <div className="h-48 bg-card border border-card-border rounded-xl animate-pulse" />
        ) : !group ? (
          <div className="bg-card border border-card-border rounded-xl text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Grup tidak ditemukan</p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden mb-6">
              <div className="h-24 sm:h-32">
                {group.bannerUrl ? (
                  <img src={group.bannerUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary/20 via-pink-500/10 to-purple-500/5" />
                )}
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-xl font-bold text-foreground" data-testid="text-group-name">{group.name}</h1>
                      {group.isPrivate ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">g/{group.slug} · Dibuat oleh u/{group.creatorUsername}</p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">{group.description}</p>
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
                          className="h-9 gap-1.5"
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
                          className="h-9 gap-1.5"
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
                  className="h-8 text-xs gap-1.5"
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
                  <Button size="sm" className="h-8 text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Buat Postingan
                  </Button>
                </Link>
              )}
            </div>

            {showMembers && members && (
              <div className="bg-card border border-card-border rounded-xl p-4 mb-4 animate-fade-in">
                <h3 className="text-sm font-semibold mb-3">Anggota ({members.length})</h3>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between" data-testid={`member-${m.username}`}>
                      <div className="flex items-center gap-2">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold uppercase">
                            {m.username[0]}
                          </div>
                        )}
                        <Link href={`/u/${m.username}`}>
                          <span className="text-sm hover:underline cursor-pointer">{m.username}</span>
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
                          className="h-6 text-[10px] px-2"
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

            <div className="space-y-3">
              {!posts || posts.length === 0 ? (
                <div className="bg-card border border-card-border rounded-xl text-center py-16">
                  <Plus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada postingan di grup ini</p>
                  {group.isMember && (
                    <Link href={`/new?group=${slug}`}>
                      <Button size="sm" className="mt-3 h-8 text-xs gap-1.5">
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
