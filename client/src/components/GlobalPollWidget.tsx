import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { GlobalPollWithOptions } from "@shared/schema";
import { BarChart3, Check, Clock, Loader2, Vote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function formatTimeRemaining(expiresAt: string | Date): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  if (diff <= 0) return "Berakhir";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}j ${minutes}m tersisa`;
  return `${minutes}m tersisa`;
}

function PollItem({ poll }: { poll: GlobalPollWithOptions }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const hasVoted = !!poll.userVotedOptionId;

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      apiRequest("POST", `/api/global-polls/${poll.id}/vote`, { optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-polls"] });
      toast({ title: "Suara tercatat!", description: "Terima kasih sudah memilih." });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal memilih", description: error.message, variant: "destructive" });
      setSelectedOption(null);
    },
  });

  const handleVote = () => {
    if (!selectedOption || hasVoted || voteMutation.isPending || !user) return;
    voteMutation.mutate(selectedOption);
  };

  const showResults = hasVoted || voteMutation.isPending;

  return (
    <div className="space-y-3" data-testid={`global-poll-${poll.id}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground" data-testid={`global-poll-title-${poll.id}`}>
          {poll.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" />
          <span data-testid={`global-poll-expiry-${poll.id}`}>{formatTimeRemaining(poll.expiresAt)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const percentage = poll.totalVotes > 0
            ? Math.round((option.voteCount / poll.totalVotes) * 100)
            : 0;
          const isUserChoice = poll.userVotedOptionId === option.id;
          const isSelected = selectedOption === option.id;

          return (
            <button
              key={option.id}
              onClick={() => {
                if (!hasVoted && !voteMutation.isPending && user) {
                  setSelectedOption(option.id);
                }
              }}
              disabled={hasVoted || voteMutation.isPending || !user}
              className={`relative w-full text-left rounded-md overflow-hidden transition-all ${
                showResults
                  ? "cursor-default"
                  : user
                    ? "cursor-pointer hover:bg-primary/5"
                    : "cursor-not-allowed opacity-70"
              } ${
                isUserChoice
                  ? "border-2 border-primary/50"
                  : isSelected
                    ? "border-2 border-primary/30"
                    : "border border-border"
              }`}
              data-testid={`global-poll-option-${option.id}`}
            >
              {showResults && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isUserChoice && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                  {!showResults && isSelected && (
                    <div className="w-3 h-3 rounded-full border-2 border-primary bg-primary/20 shrink-0" />
                  )}
                  {!showResults && !isSelected && (
                    <div className="w-3 h-3 rounded-full border border-border shrink-0" />
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
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BarChart3 className="w-3.5 h-3.5" />
          <span data-testid={`global-poll-votes-${poll.id}`}>{poll.totalVotes} suara</span>
          {hasVoted && (
            <span className="text-primary font-medium ml-1">Sudah memilih</span>
          )}
        </div>
        {!hasVoted && user && !voteMutation.isPending && selectedOption && (
          <Button
            size="sm"
            onClick={handleVote}
            data-testid={`global-poll-vote-btn-${poll.id}`}
          >
            <Vote className="w-3.5 h-3.5" />
            Pilih
          </Button>
        )}
        {voteMutation.isPending && (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        )}
      </div>
    </div>
  );
}

export function GlobalPollWidget() {
  const { data: polls, isLoading } = useQuery<GlobalPollWithOptions[]>({
    queryKey: ["/api/global-polls"],
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card className="p-4 mb-4" data-testid="global-poll-loading">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!polls || polls.length === 0) return null;

  return (
    <div className="space-y-3 mb-4" data-testid="global-poll-widget">
      {polls.map((poll) => (
        <Card key={poll.id} className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Vote className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Polling Global</span>
          </div>
          <PollItem poll={poll} />
        </Card>
      ))}
    </div>
  );
}
