import { ChevronUp, ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useState } from "react";

interface VoteButtonProps {
  score: number;
  userVote: number | null;
  postId?: string;
  commentId?: string;
  horizontal?: boolean;
}

export function VoteButton({ score: initialScore, userVote: initialVote, postId, commentId, horizontal: _horizontal }: VoteButtonProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [optimisticScore, setOptimisticScore] = useState<number | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<number | null | undefined>(undefined);

  const score = optimisticScore !== null ? optimisticScore : initialScore;
  const userVote = optimisticVote !== undefined ? optimisticVote : initialVote;

  const voteMutation = useMutation({
    mutationFn: (value: number) =>
      apiRequest("POST", "/api/votes", { postId, commentId, value }),
    onMutate: (value: number) => {
      const currentVote = optimisticVote !== undefined ? optimisticVote : initialVote;
      const currentScore = optimisticScore !== null ? optimisticScore : initialScore;

      let newVote: number | null;
      let scoreDelta: number;

      if (currentVote === value) {
        newVote = null;
        scoreDelta = -value;
      } else if (currentVote === -value) {
        newVote = value;
        scoreDelta = value * 2;
      } else {
        newVote = value;
        scoreDelta = value;
      }

      setOptimisticScore(currentScore + scoreDelta);
      setOptimisticVote(newVote);
    },
    onSuccess: () => {
      if (postId) {
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      }
      if (commentId && postId) {
        queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      }
    },
    onError: () => {
      setOptimisticScore(null);
      setOptimisticVote(undefined);
    },
    onSettled: () => {
      setTimeout(() => {
        setOptimisticScore(null);
        setOptimisticVote(undefined);
      }, 500);
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
    ? "text-primary font-bold"
    : score < 0
      ? "text-destructive font-bold"
      : "text-muted-foreground";

  return (
    <div className="inline-flex items-center gap-0 bg-muted/50 rounded-full">
      <button
        onClick={() => handleVote(1)}
        className={`p-2 rounded-full transition-all duration-150 active:scale-90 ${
          userVote === 1
            ? "text-primary bg-primary/15"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        }`}
        data-testid={`button-upvote-${postId || commentId}`}
      >
        <ChevronUp className={`w-5 h-5 ${userVote === 1 ? "stroke-[3]" : "stroke-[2]"}`} />
      </button>
      <span
        className={`font-semibold text-sm tabular-nums min-w-[24px] text-center select-none ${scoreColor}`}
        data-testid={`text-score-${postId || commentId}`}
      >
        {score > 999 ? `${(score / 1000).toFixed(1)}k` : score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        className={`p-2 rounded-full transition-all duration-150 active:scale-90 ${
          userVote === -1
            ? "text-destructive bg-destructive/15"
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        }`}
        data-testid={`button-downvote-${postId || commentId}`}
      >
        <ChevronDown className={`w-5 h-5 ${userVote === -1 ? "stroke-[3]" : "stroke-[2]"}`} />
      </button>
    </div>
  );
}
