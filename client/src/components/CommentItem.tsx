import { type CommentWithUser } from "@shared/schema";
import { VoteButton } from "./VoteButton";
import { getGlowStyle, hasCustomGlow } from "@/lib/usernameGlow";
import { AlertTriangle, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";

interface CommentItemProps {
  comment: CommentWithUser;
  postId: string;
  isLocked: boolean;
  isDead: boolean;
  depth?: number;
  allComments: CommentWithUser[];
}

export function CommentItem({ comment, postId, isLocked, isDead, depth = 0, allComments }: CommentItemProps) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [collapsed, setCollapsed] = useState(comment.score < -50);

  const replies = allComments.filter(c => c.parentId === comment.id);

  const replyMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/comments", {
        postId,
        parentId: comment.id,
        content: replyContent,
      }),
    onSuccess: () => {
      setReplyContent("");
      setReplying(false);
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
    },
  });

  const depthColors = [
    "border-primary/30",
    "border-blue-500/30",
    "border-emerald-500/30",
    "border-purple-500/30",
    "border-amber-500/30",
  ];

  return (
    <div
      className={`${depth > 0 ? `ml-3 sm:ml-5 pl-3 border-l-2 ${depthColors[depth % depthColors.length]}` : ""}`}
      data-testid={`comment-${comment.id}`}
    >
      <div className="py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
              {comment.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link href={`/u/${comment.username}`}>
            <span
              className={`text-xs font-medium hover:underline cursor-pointer ${comment.isPremiumUsername ? (hasCustomGlow(comment.usernameGlow) ? "" : "username-glow") : "text-foreground"}`}
              style={comment.isPremiumUsername ? getGlowStyle(comment.usernameGlow) : undefined}
            >
              <span className="text-muted-foreground font-normal" style={comment.isPremiumUsername && hasCustomGlow(comment.usernameGlow) ? { WebkitTextFillColor: 'initial' } : undefined}>u/</span>
              {comment.username}
            </span>
          </Link>
          {comment.isPublicEnemy && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-2.5 h-2.5" />
              MUSUH
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: idLocale })}
          </span>
          {replies.length > 0 && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-auto"
            >
              {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              {collapsed ? `${replies.length} balasan` : ""}
            </button>
          )}
        </div>

        {!collapsed && (
          <>
            <div className="ml-8">
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

              <div className="flex items-center gap-2 mt-2">
                <VoteButton
                  score={comment.score}
                  userVote={comment.userVote}
                  postId={postId}
                  commentId={comment.id}
                  horizontal
                />
                {user && !isLocked && !isDead && (
                  <button
                    onClick={() => setReplying(!replying)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md transition-colors"
                    data-testid={`button-reply-${comment.id}`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Balas
                  </button>
                )}
              </div>

              {replying && (
                <div className="mt-2.5 space-y-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Tulis balasan kamu..."
                    className="min-h-[80px] text-sm resize-none rounded-xl"
                    data-testid={`textarea-reply-${comment.id}`}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => replyMutation.mutate()}
                      disabled={!replyContent.trim() || replyMutation.isPending}
                      size="sm"
                      data-testid={`button-submit-reply-${comment.id}`}
                    >
                      {replyMutation.isPending ? "Mengirim..." : "Balas"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setReplying(false); setReplyContent(""); }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {replies.length > 0 && depth < 5 && (
              <div className="mt-1">
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    isLocked={isLocked}
                    isDead={isDead}
                    depth={depth + 1}
                    allComments={allComments}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}