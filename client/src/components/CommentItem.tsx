import { type CommentWithUser } from "@shared/schema";
import { VoteButton } from "./VoteButton";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const isCollapsed = comment.score < -50;

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

  return (
    <div
      className={`${depth > 0 ? "ml-4 border-l border-neutral-800/40 pl-3" : ""} ${
        isCollapsed ? "opacity-40" : ""
      }`}
      data-testid={`comment-${comment.id}`}
    >
      <div className="py-2">
        <div className="flex items-start gap-2">
          <VoteButton
            score={comment.score}
            userVote={comment.userVote}
            postId={postId}
            commentId={comment.id}
            compact
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-neutral-500">{comment.username}</span>
              {comment.isPublicEnemy && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-red-500 bg-red-950/40 px-1 py-0 border border-red-900/30">
                  <AlertTriangle className="w-2 h-2" />
                  ENEMY
                </span>
              )}
              <span className="text-[10px] text-neutral-600">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

            {user && !isLocked && !isDead && (
              <button
                onClick={() => setReplying(!replying)}
                className="text-[10px] font-mono text-neutral-600 hover:text-neutral-400 mt-1 transition-colors"
                data-testid={`button-reply-${comment.id}`}
              >
                {replying ? "CANCEL" : "REPLY"}
              </button>
            )}

            {replying && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Your reply..."
                  className="min-h-[60px] text-xs bg-[#0d0d0d] border-neutral-800 text-neutral-300 placeholder:text-neutral-600 resize-none focus:border-red-900/50 focus:ring-0"
                  data-testid={`textarea-reply-${comment.id}`}
                />
                <Button
                  onClick={() => replyMutation.mutate()}
                  disabled={!replyContent.trim() || replyMutation.isPending}
                  size="sm"
                  className="h-7 text-[10px] font-mono bg-red-900/40 hover:bg-red-900/60 border border-red-800/30 text-red-200"
                  data-testid={`button-submit-reply-${comment.id}`}
                >
                  {replyMutation.isPending ? "..." : "SUBMIT"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && depth < 5 && (
        <div>
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
    </div>
  );
}
