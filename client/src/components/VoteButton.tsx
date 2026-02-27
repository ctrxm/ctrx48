import { ArrowUp, ArrowDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface VoteButtonProps {
  score: number;
  userVote: number | null;
  postId?: string;
  commentId?: string;
  horizontal?: boolean;
}

export function VoteButton({ score, userVote, postId, commentId, horizontal: _horizontal }: VoteButtonProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

  const handleVote = (value: number) => {
    if (!user) {
      setLocation("/login");
      return;
    }
    voteMutation.mutate(value);
  };

  const scoreColor = score > 0
    ? "text-primary"
    : score < 0
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div className="inline-flex items-center gap-0 bg-muted/50 rounded-full">
      <button
        onClick={() => handleVote(1)}
        disabled={voteMutation.isPending}
        className={`p-1.5 rounded-full transition-colors ${
          userVote === 1
            ? "text-primary"
            : "text-muted-foreground hover:text-primary"
        } disabled:opacity-40`}
        data-testid={`button-upvote-${postId || commentId}`}
      >
        <ArrowUp className={`w-4 h-4 ${userVote === 1 ? "stroke-[2.5]" : ""}`} />
      </button>
      <span
        className={`font-semibold text-xs tabular-nums min-w-[20px] text-center select-none ${scoreColor}`}
        data-testid={`text-score-${postId || commentId}`}
      >
        {score > 999 ? `${(score / 1000).toFixed(1)}k` : score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={voteMutation.isPending}
        className={`p-1.5 rounded-full transition-colors ${
          userVote === -1
            ? "text-destructive"
            : "text-muted-foreground hover:text-destructive"
        } disabled:opacity-40`}
        data-testid={`button-downvote-${postId || commentId}`}
      >
        <ArrowDown className={`w-4 h-4 ${userVote === -1 ? "stroke-[2.5]" : ""}`} />
      </button>
    </div>
  );
}
