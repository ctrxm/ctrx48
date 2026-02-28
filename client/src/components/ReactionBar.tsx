import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { type ReactionSummary } from "@shared/schema";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const REACTION_EMOJIS = [
  { emoji: "🔥", label: "Api" },
  { emoji: "💀", label: "Tengkorak" },
  { emoji: "😂", label: "Ketawa" },
  { emoji: "🤡", label: "Badut" },
  { emoji: "👏", label: "Tepuk" },
  { emoji: "💯", label: "100" },
  { emoji: "🤮", label: "Muntah" },
  { emoji: "🫡", label: "Salut" },
];

export function ReactionBar({
  postId,
  reactions = [],
  queryKeyBase,
}: {
  postId: string;
  reactions?: ReactionSummary[];
  queryKeyBase?: string[];
}) {
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);

  const addReaction = useMutation({
    mutationFn: (emoji: string) =>
      apiRequest("POST", "/api/reactions", { postId, emoji }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      if (queryKeyBase) {
        queryClient.invalidateQueries({ queryKey: queryKeyBase });
      }
    },
  });

  const removeReaction = useMutation({
    mutationFn: (emoji: string) =>
      apiRequest("DELETE", "/api/reactions", { postId, emoji }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      if (queryKeyBase) {
        queryClient.invalidateQueries({ queryKey: queryKeyBase });
      }
    },
  });

  const handleToggle = (emoji: string, userReacted: boolean) => {
    if (!user) return;
    if (userReacted) {
      removeReaction.mutate(emoji);
    } else {
      addReaction.mutate(emoji);
    }
  };

  const handlePickerSelect = (emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing?.userReacted) {
      removeReaction.mutate(emoji);
    } else {
      addReaction.mutate(emoji);
    }
    setPickerOpen(false);
  };

  const activeReactions = reactions.filter((r) => r.count > 0);

  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid={`reactions-bar-${postId}`}>
      {activeReactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleToggle(r.emoji, r.userReacted)}
          disabled={!user || addReaction.isPending || removeReaction.isPending}
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
            r.userReacted
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-muted/50 text-muted-foreground border border-transparent"
          }`}
          data-testid={`button-reaction-${r.emoji}-${postId}`}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}

      {user && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground bg-muted/30 border border-transparent transition-colors"
              data-testid={`button-add-reaction-${postId}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex items-center gap-1" data-testid={`reaction-picker-${postId}`}>
              {REACTION_EMOJIS.map((item) => {
                const existing = reactions.find((r) => r.emoji === item.emoji);
                return (
                  <button
                    key={item.emoji}
                    onClick={() => handlePickerSelect(item.emoji)}
                    className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-colors ${
                      existing?.userReacted ? "bg-primary/15" : "hover:bg-muted"
                    }`}
                    title={item.label}
                    data-testid={`button-picker-${item.emoji}-${postId}`}
                  >
                    {item.emoji}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
