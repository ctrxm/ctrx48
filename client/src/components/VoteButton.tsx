import { ChevronUp, ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface VoteButtonProps {
  score: number;
  userVote: number | null;
  postId?: string;
  commentId?: string;
  compact?: boolean;
}

export function VoteButton({ score, userVote, postId, commentId, compact }: VoteButtonProps) {
  const { user } = useAuth();

  const voteMutation = useMutation({
    mutationFn: (value: number) =>
      apiRequest("POST", "/api/votes", { postId, commentId, value }),
    onSuccess: () => {
      if (postId) {
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      }
      if (commentId && postId) {
        queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const scoreColor = score > 0
    ? "text-emerald-500"
    : score < 0
    ? "text-red-500"
    : "text-neutral-500";

  return (
    <div className={`flex ${compact ? "flex-row items-center gap-1" : "flex-col items-center gap-0"}`}>
      <button
        onClick={() => user && voteMutation.mutate(1)}
        disabled={!user || voteMutation.isPending}
        className={`p-0.5 transition-colors ${
          userVote === 1
            ? "text-emerald-400"
            : "text-neutral-600 hover:text-emerald-400"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
        data-testid={`button-upvote-${postId || commentId}`}
      >
        <ChevronUp className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>
      <span className={`font-mono text-xs tabular-nums ${scoreColor} ${compact ? "min-w-[20px] text-center" : ""}`} data-testid={`text-score-${postId || commentId}`}>
        {score}
      </span>
      <button
        onClick={() => user && voteMutation.mutate(-1)}
        disabled={!user || voteMutation.isPending}
        className={`p-0.5 transition-colors ${
          userVote === -1
            ? "text-red-400"
            : "text-neutral-600 hover:text-red-400"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
        data-testid={`button-downvote-${postId || commentId}`}
      >
        <ChevronDown className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>
    </div>
  );
}
