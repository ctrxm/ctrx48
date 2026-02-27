import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type PostWithUser, type CommentWithUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { VoteButton } from "@/components/VoteButton";
import { CommentItem } from "@/components/CommentItem";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Lock, Skull, Flame, MessageSquare, AlertTriangle, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

function getTimeLeft(expiresAt: string | Date) {
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp <= now) return null;
  const diff = exp.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export default function PostDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/post/:id");
  const postId = params?.id ?? "";
  const [commentContent, setCommentContent] = useState("");

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

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/" data-testid="link-back">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-600 hover:text-neutral-400 cursor-pointer mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            BACK
          </span>
        </Link>

        {postLoading ? (
          <div className="space-y-3">
            <div className="h-8 bg-[#111111] animate-pulse w-2/3" />
            <div className="h-32 bg-[#111111] animate-pulse" />
          </div>
        ) : !post ? (
          <div className="text-center py-20">
            <Skull className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
            <p className="text-sm font-mono text-neutral-600">Thread not found.</p>
          </div>
        ) : (
          <>
            {isDead && (
              <div className="flex items-center gap-2 p-3 bg-neutral-900/60 border border-neutral-800 mb-4" data-testid="banner-dead">
                <Skull className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-mono text-neutral-500">THIS THREAD IS DEAD</span>
              </div>
            )}

            {post.isLocked && (
              <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 mb-4" data-testid="banner-locked">
                <Lock className="w-4 h-4 text-red-600" />
                <span className="text-xs font-mono text-red-500">THREAD LOCKED</span>
              </div>
            )}

            <div className="border border-neutral-800/40 bg-[#111111]">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <VoteButton score={post.score} userVote={post.userVote} postId={post.id} />
                  <div className="flex-1">
                    <h1 className="text-base font-medium text-neutral-100 leading-snug" data-testid="text-post-title">
                      {post.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] font-mono text-neutral-500">{post.username}</span>
                      {post.isPublicEnemy && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-red-500 bg-red-950/40 px-1.5 py-0.5 border border-red-900/30">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          PUBLIC ENEMY
                        </span>
                      )}
                      {!isDead && timeLeft && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-neutral-500">
                          <Clock className="w-2.5 h-2.5" />
                          {timeLeft}
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-600">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 ml-7 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap" data-testid="text-post-content">
                  {post.content}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-xs font-mono text-neutral-500">
                  {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
                </span>
              </div>

              {user && !post.isLocked && !isDead && (
                <div className="mb-6 space-y-2">
                  <Textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Add to the chaos..."
                    className="min-h-[80px] bg-[#111111] border-neutral-800 text-neutral-300 placeholder:text-neutral-600 text-sm resize-none focus:border-red-900/50 focus:ring-0"
                    data-testid="textarea-comment"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => commentMutation.mutate()}
                      disabled={!commentContent.trim() || commentMutation.isPending}
                      size="sm"
                      className="h-8 px-4 bg-red-900/40 hover:bg-red-900/60 border border-red-800/30 text-red-200 font-mono text-[11px] tracking-wider disabled:opacity-30"
                      data-testid="button-submit-comment"
                    >
                      {commentMutation.isPending ? "..." : "COMMENT"}
                    </Button>
                  </div>
                </div>
              )}

              {commentsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-[#111111] border border-neutral-800/40 animate-pulse" />
                  ))}
                </div>
              ) : rootComments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs font-mono text-neutral-700">No comments yet. Break the silence.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {rootComments.map((comment) => (
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
      </main>
    </div>
  );
}
