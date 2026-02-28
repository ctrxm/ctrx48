import { type AchievementWithStatus } from "@shared/schema";
import {
  PenSquare, FileText, Zap, MessageCircle, MessagesSquare, Crown,
  ThumbsUp, Vote, Gavel, Star, Award, Trophy, Shield, ShieldCheck
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  PenSquare, FileText, Zap, MessageCircle, MessagesSquare, Crown,
  ThumbsUp, Vote, Gavel, Star, Award, Trophy, Shield, ShieldCheck,
};

const CATEGORY_COLORS: Record<string, string> = {
  posts: "text-blue-500",
  votes: "text-purple-500",
  reputation: "text-yellow-500",
  comments: "text-emerald-500",
  survival: "text-red-500",
};

const CATEGORY_BG: Record<string, string> = {
  posts: "bg-blue-500/10 border-blue-500/20",
  votes: "bg-purple-500/10 border-purple-500/20",
  reputation: "bg-yellow-500/10 border-yellow-500/20",
  comments: "bg-emerald-500/10 border-emerald-500/20",
  survival: "bg-red-500/10 border-red-500/20",
};

const CATEGORY_GLOW: Record<string, string> = {
  posts: "shadow-blue-500/20",
  votes: "shadow-purple-500/20",
  reputation: "shadow-yellow-500/20",
  comments: "shadow-emerald-500/20",
  survival: "shadow-red-500/20",
};

export function AchievementBadge({ achievement }: { achievement: AchievementWithStatus }) {
  const unlocked = achievement.unlocked;
  const categoryColor = CATEGORY_COLORS[achievement.category] || "text-muted-foreground";
  const categoryBg = CATEGORY_BG[achievement.category] || "bg-muted/50 border-border";
  const categoryGlow = CATEGORY_GLOW[achievement.category] || "";
  const IconComponent = ICON_MAP[achievement.icon] || Star;

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all ${
        unlocked
          ? `${categoryBg} shadow-md ${categoryGlow}`
          : "bg-muted/30 border-border opacity-50 grayscale"
      }`}
      data-testid={`achievement-${achievement.key}`}
    >
      <div className="flex items-start gap-3">
        <div className={`${unlocked ? categoryColor : "text-muted-foreground"}`}>
          <IconComponent className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${unlocked ? categoryColor : "text-muted-foreground"}`}>
            {achievement.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {achievement.description}
          </p>
          {unlocked && achievement.unlockedAt && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Dibuka {new Date(achievement.unlockedAt).toLocaleDateString("id-ID")}
            </p>
          )}
        </div>
        {unlocked && (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
            achievement.category === "posts" ? "bg-blue-500" :
            achievement.category === "votes" ? "bg-purple-500" :
            achievement.category === "reputation" ? "bg-yellow-500" :
            achievement.category === "comments" ? "bg-emerald-500" :
            "bg-red-500"
          }`} data-testid={`badge-unlocked-${achievement.key}`}>
            &#10003;
          </div>
        )}
      </div>
    </div>
  );
}
