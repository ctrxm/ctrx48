import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

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
    onError: (err: any) => setError(err.message),
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-xs font-mono font-bold text-neutral-400 tracking-widest uppercase mb-6">
          New Thread
        </h1>
        <p className="text-[10px] font-mono text-neutral-600 mb-4">
          This thread will self-destruct in 48 hours. No edits. No mercy.
        </p>

        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-red-950/30 border border-red-900/30 text-xs font-mono text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <Input
            placeholder="Thread title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="h-10 bg-[#111111] border-neutral-800 text-neutral-200 placeholder:text-neutral-600 font-mono text-sm focus:border-red-900/50 focus:ring-0"
            data-testid="input-title"
          />

          <Textarea
            placeholder="Speak your mind..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] bg-[#111111] border-neutral-800 text-neutral-200 placeholder:text-neutral-600 text-sm leading-relaxed resize-none focus:border-red-900/50 focus:ring-0"
            data-testid="textarea-content"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-700">
              {content.length} chars
            </span>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
              className="h-9 px-6 bg-red-900/50 hover:bg-red-900/70 border border-red-800/40 text-red-100 font-mono text-xs tracking-wider disabled:opacity-30"
              data-testid="button-create-post"
            >
              {createMutation.isPending ? "POSTING..." : "UNLEASH"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
