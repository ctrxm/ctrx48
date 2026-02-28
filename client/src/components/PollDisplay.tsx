import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { PollWithResults } from "@shared/schema";
import { BarChart3, Check, Loader2 } from "lucide-react";

export function PollDisplay({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const { data: poll, isLoading } = useQuery<PollWithResults>({
    queryKey: ["/api/polls", postId],
  });

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      apiRequest("POST", `/api/polls/${postId}/vote`, { optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const handleVote = (optionId: string) => {
    if (!poll || poll.userVotedOptionId || voteMutation.isPending || !user) return;
    setSelectedOption(optionId);
    voteMutation.mutate(optionId);
  };

  if (isLoading) {
    return (
      <div className="mb-3 flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!poll || !poll.options || poll.options.length === 0) return null;

  const hasVoted = !!poll.userVotedOptionId;

  return (
    <div className="mb-3 space-y-2" data-testid={`poll-display-${postId}`}>
      {poll.options.map((option) => {
        const percentage = poll.totalVotes > 0
          ? Math.round((option.voteCount / poll.totalVotes) * 100)
          : 0;
        const isUserChoice = poll.userVotedOptionId === option.id;
        const showResults = hasVoted || voteMutation.isPending;

        return (
          <button
            key={option.id}
            onClick={() => handleVote(option.id)}
            disabled={hasVoted || voteMutation.isPending || !user}
            className={`relative w-full text-left rounded-lg overflow-hidden transition-all ${
              showResults
                ? "cursor-default"
                : user
                  ? "cursor-pointer hover:bg-primary/5"
                  : "cursor-not-allowed opacity-70"
            } ${
              isUserChoice
                ? "border-2 border-primary/50"
                : "border border-border"
            }`}
            data-testid={`poll-option-${option.id}`}
          >
            {showResults && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 transition-all duration-700 ease-out"
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className="relative flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {isUserChoice && (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
                <span className={`text-sm ${isUserChoice ? "font-semibold text-foreground" : "text-foreground"}`}>
                  {option.text}
                </span>
              </div>
              {showResults && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{option.voteCount}</span>
                  <span className="text-xs font-semibold text-foreground min-w-[2.5rem] text-right">{percentage}%</span>
                </div>
              )}
            </div>
          </button>
        );
      })}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
        <BarChart3 className="w-3.5 h-3.5" />
        <span data-testid={`poll-total-votes-${postId}`}>{poll.totalVotes} suara</span>
        {hasVoted && (
          <span className="text-primary font-medium ml-1">Sudah memilih</span>
        )}
      </div>
    </div>
  );
}
