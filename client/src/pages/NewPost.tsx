import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Timer, Info } from "lucide-react";

export default function NewPost() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/posts", { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setLocation("/");
    },
    onError: (err: any) => setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to create post"),
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-foreground mb-1">Create a Post</h1>
        <p className="text-sm text-muted-foreground mb-6">Share your thoughts with the community</p>

        <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-primary mb-5">
            <Timer className="w-4 h-4 shrink-0" />
            <span>This post will expire in 48 hours. You cannot edit it after posting.</span>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Title</Label>
              <Input
                id="title"
                placeholder="An interesting title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="h-10"
                data-testid="input-title"
              />
              <p className="text-[11px] text-muted-foreground text-right">{title.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">Content</Label>
              <Textarea
                id="content"
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-none"
                data-testid="textarea-content"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => setLocation("/")}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || !content.trim() || createMutation.isPending}
                className="h-10 px-6"
                data-testid="button-create-post"
              >
                {createMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
