import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type PostWithUser, type CommentWithUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { VoteButton } from "@/components/VoteButton";
import { CommentItem } from "@/components/CommentItem";
import { SidebarWidget } from "@/components/SidebarWidget";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, Lock, Skull, Flame, MessageSquare, AlertTriangle,
  ArrowLeft, Timer, Share2, ExternalLink, Image
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "wouter";

function getTimeLeft(expiresAt: string | Date) {
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp <= now) return null;
  const diff = exp.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}j ${minutes}m tersisa`;
  return `${minutes}m tersisa`;
}

export default function PostDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/post/:id");
  const postId = params?.id ?? "";
  const [commentContent, setCommentContent] = useState("");
  const [sortComments, setSortComments] = useState<"new" | "top">("top");

  const { data: post, isLoading: postLoading } = useQuery<PostWithUser>({
    queryKey: ["/api/posts", postId],
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/posts", postId, "comments"],
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/comments", { postId, content: commentContent }),
    onSuccess: () => {
      setCommentContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const isDead = post ? new Date(post.expiresAt) <= new Date() : false;
  const timeLeft = post ? getTimeLeft(post.expiresAt) : null;

  const rootComments = comments?.filter(c => !c.parentId) ?? [];
  const sortedRootComments = [...rootComments].sort((a, b) => {
    if (sortComments === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return b.score - a.score;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <Link href="/" data-testid="link-back">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke beranda
              </span>
            </Link>

            {postLoading ? (
              <div className="space-y-3">
                <div className="h-8 bg-card border border-card-border rounded-lg animate-pulse w-2/3" />
                <div className="h-40 bg-card border border-card-border rounded-lg animate-pulse" />
              </div>
            ) : !post ? (
              <div className="bg-card border border-card-border rounded-lg text-center py-20">
                <Skull className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Postingan tidak ditemukan</p>
              </div>
            ) : (
              <>
                {isDead && (
                  <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg mb-3" data-testid="banner-dead">
                    <Skull className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Postingan ini sudah kedaluwarsa</span>
                  </div>
                )}

                {post.isLocked && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg mb-3" data-testid="banner-locked">
                    <Lock className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">Thread ini telah dikunci</span>
                  </div>
                )}

                <article className="bg-card border border-card-border rounded-lg overflow-hidden">
                  <div className="flex gap-0">
                    <div className="flex flex-col items-center py-4 px-3 shrink-0 bg-accent/30">
                      <VoteButton score={post.score} userVote={post.userVote} postId={post.id} />
                    </div>

                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                        {post.avatarUrl && (
                          <img src={post.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                        )}
                        <Link href={`/u/${post.username}`}>
                          <span className="font-medium text-foreground/80 hover:underline cursor-pointer">
                            u/{post.username}
                          </span>
                        </Link>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: idLocale })}</span>
                        {post.isPublicEnemy && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            MUSUH PUBLIK
                          </span>
                        )}
                      </div>

                      <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-3" data-testid="text-post-title">
                        {post.title}
                      </h1>

                      {post.type === "image" && post.imageUrl && (
                        <div className="mb-4 rounded-lg overflow-hidden border border-border">
                          <img src={post.imageUrl} alt="" className="w-full max-h-[500px] object-contain bg-black/5" referrerPolicy="no-referrer" data-testid="img-post" />
                        </div>
                      )}

                      {post.type === "link" && post.linkUrl && (
                        <a
                          href={post.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mb-4 rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors"
                          data-testid="link-external"
                        >
                          {post.linkImage && (
                            <img src={post.linkImage} alt="" className="w-full h-48 object-cover" />
                          )}
                          <div className="p-3 bg-accent/30">
                            {post.linkTitle && (
                              <p className="text-sm font-medium text-foreground">{post.linkTitle}</p>
                            )}
                            {post.linkDescription && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.linkDescription}</p>
                            )}
                            <p className="text-xs text-primary mt-1 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {new URL(post.linkUrl).hostname}
                            </p>
                          </div>
                        </a>
                      )}

                      <div className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4" data-testid="text-post-content">
                        {post.content}
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.commentCount} komentar
                        </span>

                        {!isDead && timeLeft && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Timer className="w-3.5 h-3.5" />
                            {timeLeft}
                          </span>
                        )}

                        <button
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => navigator.clipboard.writeText(window.location.href)}
                          data-testid="button-share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Bagikan
                        </button>
                      </div>
                    </div>
                  </div>
                </article>

                <div className="mt-6">
                  {user && !post.isLocked && !isDead && (
                    <div className="bg-card border border-card-border rounded-lg p-4 mb-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        Komentar sebagai <span className="text-foreground font-medium">{user.username}</span>
                      </p>
                      <Textarea
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder="Apa pendapatmu?"
                        className="min-h-[100px] resize-none mb-3"
                        data-testid="textarea-comment"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => commentMutation.mutate()}
                          disabled={!commentContent.trim() || commentMutation.isPending}
                          size="sm"
                          className="h-8 px-5"
                          data-testid="button-submit-comment"
                        >
                          {commentMutation.isPending ? "Mengirim..." : "Komentar"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-medium text-foreground">
                      {post.commentCount} Komentar
                    </span>
                    <div className="flex items-center gap-1 bg-card border border-card-border rounded-md p-0.5">
                      <button
                        onClick={() => setSortComments("top")}
                        className={`px-2.5 py-1 text-xs rounded transition-colors ${
                          sortComments === "top" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Teratas
                      </button>
                      <button
                        onClick={() => setSortComments("new")}
                        className={`px-2.5 py-1 text-xs rounded transition-colors ${
                          sortComments === "new" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Terbaru
                      </button>
                    </div>
                  </div>

                  {commentsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-card border border-card-border rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : sortedRootComments.length === 0 ? (
                    <div className="bg-card border border-card-border rounded-lg text-center py-12">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Belum ada komentar. Jadilah yang pertama berbagi pendapat.</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-card-border rounded-lg p-3 sm:p-4">
                      {sortedRootComments.map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          postId={postId}
                          isLocked={post.isLocked}
                          isDead={isDead}
                          allComments={comments ?? []}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-16">
              <SidebarWidget />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
