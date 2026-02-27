import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Plus, Lock, Globe, UserPlus, LogOut, Loader2 } from "lucide-react";
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
    onError: (err: any) => setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to create group"),
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
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-foreground">Groups</h1>
            <p className="text-sm text-muted-foreground">Join communities that share your interests</p>
          </div>
          {user && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setCreating(!creating)} data-testid="button-create-group">
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          )}
        </div>

        {creating && (
          <div className="bg-card border border-card-border rounded-xl p-5 mb-6 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground mb-4">Create a New Group</h2>
            {error && (
              <div className="text-sm text-destructive mb-3">{error}</div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Group Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                    }}
                    placeholder="My Group"
                    className="h-9"
                    data-testid="input-group-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">URL Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="my-group"
                    className="h-9"
                    data-testid="input-group-slug"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this group about?"
                  className="resize-none min-h-[80px]"
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
                <span className="text-sm text-foreground">Private group (invite only)</span>
              </label>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={() => createMutation.mutate()} disabled={!name || !slug || createMutation.isPending} data-testid="button-save-group">
                  {createMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setCreating(false); setError(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-card border border-card-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">No groups yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Be the first to create a group</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
                data-testid={`card-group-${group.slug}`}
              >
                <div className="h-16">
                  {group.bannerUrl ? (
                    <img src={group.bannerUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-primary/20 via-pink-500/10 to-purple-500/5" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                    {group.isPrivate ? (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <Globe className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </span>
                    {user && (
                      group.isMember ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => leaveMutation.mutate(group.slug)}
                          disabled={leaveMutation.isPending}
                          data-testid={`button-leave-${group.slug}`}
                        >
                          <LogOut className="w-3 h-3" />
                          Leave
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => joinMutation.mutate(group.slug)}
                          disabled={joinMutation.isPending}
                          data-testid={`button-join-${group.slug}`}
                        >
                          <UserPlus className="w-3 h-3" />
                          Join
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
