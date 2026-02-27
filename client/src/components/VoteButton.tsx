import { ArrowBigUp, ArrowBigDown } from "lucide-react";
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

export function VoteButton({ score, userVote, postId, commentId, horizontal }: VoteButtonProps) {
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
    <div className={`flex items-center ${horizontal ? "flex-row gap-1" : "flex-col gap-0"}`}>
      <button
        onClick={() => handleVote(1)}
        disabled={voteMutation.isPending}
        className={`p-0.5 rounded-sm transition-all duration-150 ${
          userVote === 1
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-primary hover:bg-primary/5"
        } disabled:opacity-40`}
        data-testid={`button-upvote-${postId || commentId}`}
      >
        <ArrowBigUp className={`${horizontal ? "w-5 h-5" : "w-5 h-5"} ${userVote === 1 ? "fill-current" : ""}`} />
      </button>
      <span
        className={`font-semibold text-xs tabular-nums min-w-[24px] text-center ${scoreColor}`}
        data-testid={`text-score-${postId || commentId}`}
      >
        {score > 999 ? `${(score / 1000).toFixed(1)}k` : score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={voteMutation.isPending}
        className={`p-0.5 rounded-sm transition-all duration-150 ${
          userVote === -1
            ? "text-destructive bg-destructive/10"
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        } disabled:opacity-40`}
        data-testid={`button-downvote-${postId || commentId}`}
      >
        <ArrowBigDown className={`${horizontal ? "w-5 h-5" : "w-5 h-5"} ${userVote === -1 ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}
