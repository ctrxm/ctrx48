import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type PostWithUser, type CommentWithUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { VoteButton } from "@/components/VoteButton";
import { ReactionBar } from "@/components/ReactionBar";
import { CommentItem } from "@/components/CommentItem";
import { SidebarWidget } from "@/components/SidebarWidget";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Lock, Skull, MessageSquare, AlertTriangle,
  ArrowLeft, Timer, Share2, ExternalLink, Bookmark, BookmarkCheck, Tag, Users,
  Crown, BadgeCheck
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

const FLAIR_COLORS: Record<string, string> = {
  "Diskusi": "bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400",
  "Curhat": "bg-purple-500/10 text-purple-500 dark:bg-purple-500/15 dark:text-purple-400",
  "Meme": "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400",
  "Berita": "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Opini": "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
};

export default function PostDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/post/:id");
  const postId = params?.id ?? "";
  const [commentContent, setCommentContent] = useState("");
  const [sortComments, setSortComments] = useState<"new" | "top">("top");

  const { data: post, isLoading: postLoading } = useQuery<PostWithUser>({
    queryKey: ["/api/posts", postId],
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (post?.isBookmarked) {
        return apiRequest("DELETE", `/api/bookmarks/${postId}`);
      }
      return apiRequest("POST", "/api/bookmarks", { postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
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
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6 mobile-feed-padding">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 max-w-[700px]">
            <Link href="/" data-testid="link-back">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke beranda
              </span>
            </Link>

            {postLoading ? (
              <div className="space-y-3">
                <div className="h-8 bg-card rounded-xl animate-pulse w-2/3" />
                <div className="h-40 bg-card rounded-xl animate-pulse" />
              </div>
            ) : !post ? (
              <div className="bg-card rounded-xl text-center py-20">
                <Skull className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Postingan tidak ditemukan</p>
              </div>
            ) : (
              <>
                {isDead && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-xl mb-3" data-testid="banner-dead">
                    <Skull className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Postingan ini sudah kedaluwarsa</span>
                  </div>
                )}

                {post.isLocked && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/5 rounded-xl mb-3" data-testid="banner-locked">
                    <Lock className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">Thread ini telah dikunci</span>
                  </div>
                )}

                <article className="bg-card rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={post.avatarUrl || undefined} referrerPolicy="no-referrer" />
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {post.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {post.groupSlug && post.groupName && (
                          <>
                            <Link href={`/groups/${post.groupSlug}`}>
                              <span className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-0.5">
                                <Users className="w-3 h-3" />
                                g/{post.groupSlug}
                              </span>
                            </Link>
                            <span className="text-muted-foreground text-xs">·</span>
                          </>
                        )}
                        <Link href={`/u/${post.username}`}>
                          <span className="text-xs font-medium text-foreground hover:underline cursor-pointer inline-flex items-center gap-0.5">
                            {post.username}
                            {post.isVerifiedUser && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                            {post.isPremiumUser && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                          </span>
                        </Link>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: idLocale })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                      {post.flair && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${FLAIR_COLORS[post.flair] || "bg-primary/10 text-primary"}`} data-testid="badge-flair">
                          <Tag className="w-2.5 h-2.5" />
                          {post.flair}
                        </span>
                      )}
                      {post.isPublicEnemy && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          MUSUH PUBLIK
                        </span>
                      )}
                    </div>
                  </div>

                  <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-3" data-testid="text-post-title">
                    {post.title}
                  </h1>

                  {post.type === "image" && post.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img src={post.imageUrl} alt="" className="w-full max-h-[500px] object-contain bg-black/5 dark:bg-white/5" referrerPolicy="no-referrer" data-testid="img-post" />
                    </div>
                  )}

                  {post.type === "link" && post.linkUrl && (
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-4 rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-colors"
                      data-testid="link-external"
                    >
                      {post.linkImage && (
                        <img src={post.linkImage} alt="" className="w-full h-48 object-cover" />
                      )}
                      <div className="p-3 bg-muted/50">
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

                  {(post.reactions && post.reactions.length > 0) || user ? (
                    <div className="pt-3 border-t border-border mb-2">
                      <ReactionBar postId={post.id} reactions={post.reactions} queryKeyBase={["/api/posts", postId]} />
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 pt-3 border-t border-border flex-wrap">
                    <VoteButton score={post.score} userVote={post.userVote} postId={post.id} horizontal />

                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {post.commentCount}
                    </span>

                    {!isDead && timeLeft && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Timer className="w-3 h-3" />
                        {timeLeft}
                      </span>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                      <button
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md"
                        onClick={() => navigator.clipboard.writeText(window.location.href)}
                        data-testid="button-share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Bagikan
                      </button>

                      {user && (
                        <button
                          className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-md ${
                            post.isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => bookmarkMutation.mutate()}
                          disabled={bookmarkMutation.isPending}
                          data-testid="button-bookmark"
                        >
                          {post.isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          {post.isBookmarked ? "Tersimpan" : "Simpan"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>

                <div className="mt-6">
                  {user && !post.isLocked && !isDead && (
                    <div className="bg-card rounded-xl p-4 mb-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        Komentar sebagai <span className="text-foreground font-medium">{user.username}</span>
                      </p>
                      <Textarea
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder="Apa pendapatmu?"
                        className="min-h-[100px] resize-none mb-3 rounded-xl"
                        data-testid="textarea-comment"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => commentMutation.mutate()}
                          disabled={!commentContent.trim() || commentMutation.isPending}
                          size="sm"
                          data-testid="button-submit-comment"
                        >
                          {commentMutation.isPending ? "Mengirim..." : "Komentar"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-semibold text-foreground">
                      {post.commentCount} Komentar
                    </span>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
                      <button
                        onClick={() => setSortComments("top")}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          sortComments === "top" ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Teratas
                      </button>
                      <button
                        onClick={() => setSortComments("new")}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          sortComments === "new" ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Terbaru
                      </button>
                    </div>
                  </div>

                  {commentsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : sortedRootComments.length === 0 ? (
                    <div className="bg-card rounded-xl text-center py-12">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Belum ada komentar. Jadilah yang pertama berbagi pendapat.</p>
                    </div>
                  ) : (
                    <div className="bg-card rounded-xl p-3 sm:p-4">
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