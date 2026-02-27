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
  Edit2, Check, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function UserProfile() {
  const { user: currentUser } = useAuth();
  const [, params] = useRoute("/u/:username");
  const username = params?.username ?? "";
  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [tab, setTab] = useState<"posts" | "comments">("posts");

  const { data: profile, isLoading } = useQuery<UserProfileType>({
    queryKey: ["/api/users", username],
  });

  const { data: userPosts } = useQuery<PostWithUser[]>({
    queryKey: ["/api/users", username, "posts"],
    enabled: tab === "posts",
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 bg-card border border-card-border rounded-xl animate-pulse" />
          </div>
        ) : !profile ? (
          <div className="bg-card border border-card-border rounded-xl text-center py-20">
            <p className="text-sm font-medium text-muted-foreground">User not found</p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden mb-6">
              <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
              <div className="p-4 sm:p-6 -mt-8 sm:-mt-10">
                <div className="flex items-end gap-4 mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 border-4 border-card flex items-center justify-center text-primary text-xl sm:text-2xl font-bold uppercase shrink-0">
                    {profile.username[0]}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-xl font-bold text-foreground">
                        {profile.displayName || profile.username}
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
                          PUBLIC ENEMY
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">u/{profile.username}</p>
                  </div>
                  {isOwnProfile && !editing && (
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={startEditing} data-testid="button-edit-profile">
                      <Edit2 className="w-3 h-3" />
                      Edit Profile
                    </Button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3 mb-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Display Name</Label>
                      <Input
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="h-9"
                        maxLength={50}
                        data-testid="input-display-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bio</Label>
                      <Textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="resize-none min-h-[80px]"
                        maxLength={500}
                        data-testid="textarea-bio"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs gap-1" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} data-testid="button-save-profile">
                        <Check className="w-3 h-3" />
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setEditing(false)}>
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : profile.bio ? (
                  <p className="text-sm text-muted-foreground mb-4 max-w-lg">{profile.bio}</p>
                ) : null}

                <div className="flex items-center gap-4 sm:gap-6 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span className={`font-semibold ${profile.reputation >= 0 ? "text-primary" : "text-destructive"}`}>
                      {profile.reputation >= 0 ? "+" : ""}{profile.reputation}
                    </span>
                    karma
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {profile.postCount} posts
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {profile.commentCount} comments
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-card border border-card-border rounded-lg p-1 mb-4">
              <button
                onClick={() => setTab("posts")}
                className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
                  tab === "posts" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-posts"
              >
                Posts
              </button>
              <button
                onClick={() => setTab("comments")}
                className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
                  tab === "comments" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-comments"
              >
                Comments
              </button>
            </div>

            {tab === "posts" && (
              <div className="space-y-2.5">
                {!userPosts || userPosts.length === 0 ? (
                  <div className="bg-card border border-card-border rounded-lg text-center py-16">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No posts yet</p>
                  </div>
                ) : (
                  userPosts.map((post) => <PostCard key={post.id} post={post} />)
                )}
              </div>
            )}

            {tab === "comments" && (
              <div className="bg-card border border-card-border rounded-lg text-center py-16">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Comment history coming soon</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
