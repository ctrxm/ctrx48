import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AchievementBadge } from "@/components/AchievementBadge";
import { useAuth } from "@/lib/auth";
import { type AchievementWithStatus } from "@shared/schema";
import { Award, FileText, ThumbsUp, Star, MessageSquare, Shield } from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: typeof Award }> = {
  posts: { label: "Posting", icon: FileText },
  votes: { label: "Voting", icon: ThumbsUp },
  reputation: { label: "Reputasi", icon: Star },
  comments: { label: "Komentar", icon: MessageSquare },
  survival: { label: "Survival", icon: Shield },
};

const CATEGORY_ORDER = ["posts", "votes", "reputation", "comments", "survival"];

export default function Achievements() {
  const { user } = useAuth();

  const { data: allAchievements, isLoading: allLoading } = useQuery<AchievementWithStatus[]>({
    queryKey: ["/api/achievements"],
  });

  const { data: userAchievements } = useQuery<AchievementWithStatus[]>({
    queryKey: ["/api/users", user?.username, "achievements"],
    enabled: !!user,
  });

  const achievements = user && userAchievements ? userAchievements : allAchievements;
  const isLoading = allLoading;

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = (achievements || []).filter((a) => a.category === cat);
    return acc;
  }, {} as Record<string, AchievementWithStatus[]>);

  const totalUnlocked = (achievements || []).filter((a) => a.unlocked).length;
  const totalAchievements = (achievements || []).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[700px] mx-auto px-4 py-6 mobile-feed-padding">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-achievements-title">Pencapaian</h1>
            <p className="text-xs text-muted-foreground">
              {user ? `${totalUnlocked} dari ${totalAchievements} dibuka` : "Masuk untuk melacak pencapaianmu"}
            </p>
          </div>
        </div>

        {totalAchievements > 0 && user && (
          <div className="mb-6 mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-brand rounded-full transition-all duration-500"
                style={{ width: `${(totalUnlocked / totalAchievements) * 100}%` }}
                data-testid="progress-achievements"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const meta = CATEGORY_META[cat] || { label: cat, icon: Award };
              const Icon = meta.icon;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground" data-testid={`section-${cat}`}>{meta.label}</h2>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {items.filter((a) => a.unlocked).length}/{items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((a) => (
                      <AchievementBadge key={a.id} achievement={a} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
