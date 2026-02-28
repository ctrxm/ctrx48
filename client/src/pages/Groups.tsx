import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Plus, Lock, Globe, UserPlus, LogOut } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import type { GroupWithInfo } from "@shared/schema";

export default function Groups() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");

  const { data: groups, isLoading } = useQuery<GroupWithInfo[]>({
    queryKey: ["/api/groups"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/groups", { name, slug, description, isPrivate }),
    onSuccess: () => {
      setCreating(false);
      setName("");
      setSlug("");
      setDescription("");
      setIsPrivate(false);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
    onError: (err: any) => setError(err.message?.replace(/^\d+:\s*/, "") || "Gagal membuat grup"),
  });

  const joinMutation = useMutation({
    mutationFn: (groupSlug: string) => apiRequest("POST", `/api/groups/${groupSlug}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (groupSlug: string) => apiRequest("POST", `/api/groups/${groupSlug}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 mobile-feed-padding">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Grup</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Bergabung dengan komunitas yang sesuai minatmu</p>
          </div>
          {user && (
            <Button size="sm" className="h-9 gap-1.5 rounded-xl shrink-0" onClick={() => setCreating(!creating)} data-testid="button-create-group">
              <Plus className="w-4 h-4" />
              Buat Grup
            </Button>
          )}
        </div>

        {creating && (
          <div className="bg-card rounded-2xl p-5 mb-6 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground mb-4">Buat Grup Baru</h2>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl mb-3">{error}</div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nama Grup</Label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                    }}
                    placeholder="Grup Saya"
                    className="h-10 rounded-xl"
                    data-testid="input-group-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Slug URL</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="grup-saya"
                    className="h-10 rounded-xl"
                    data-testid="input-group-slug"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deskripsi</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tentang apa grup ini?"
                  className="resize-none min-h-[80px] rounded-xl"
                  data-testid="textarea-group-description"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-private"
                />
                <span className="text-sm text-foreground">Grup privat (hanya undangan)</span>
              </label>
              <div className="flex gap-2">
                <Button size="sm" className="h-9 text-xs rounded-xl" onClick={() => createMutation.mutate()} disabled={!name || !slug || createMutation.isPending} data-testid="button-save-group">
                  {createMutation.isPending ? "Membuat..." : "Buat Grup"}
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-xs rounded-xl" onClick={() => { setCreating(false); setError(""); }}>
                  Batal
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada grup</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Jadilah yang pertama membuat grup</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-card rounded-2xl overflow-hidden hover:shadow-md transition-all"
                data-testid={`card-group-${group.slug}`}
              >
                <div className="flex items-center gap-4 p-4">
                  <Link href={`/groups/${group.slug}`}>
                    <div className="shrink-0 cursor-pointer">
                      {group.avatarUrl ? (
                        <img src={group.avatarUrl} alt="" className="w-14 h-14 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      ) : group.bannerUrl ? (
                        <img src={group.bannerUrl} alt="" className="w-14 h-14 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-brand opacity-80 flex items-center justify-center text-white text-lg font-bold uppercase">
                          {group.name[0]}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/groups/${group.slug}`}>
                        <h3 className="text-sm font-semibold text-foreground hover:text-primary cursor-pointer transition-colors truncate">{group.name}</h3>
                      </Link>
                      {group.isPrivate ? (
                        <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                      ) : (
                        <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {group.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{group.description}</p>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.memberCount} anggota
                    </span>
                  </div>
                  {user && (
                    <div className="shrink-0">
                      {group.isMember ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 rounded-lg"
                          onClick={() => leaveMutation.mutate(group.slug)}
                          disabled={leaveMutation.isPending}
                          data-testid={`button-leave-${group.slug}`}
                        >
                          <LogOut className="w-3 h-3" />
                          Keluar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 rounded-lg"
                          onClick={() => joinMutation.mutate(group.slug)}
                          disabled={joinMutation.isPending}
                          data-testid={`button-join-${group.slug}`}
                        >
                          <UserPlus className="w-3 h-3" />
                          Gabung
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
