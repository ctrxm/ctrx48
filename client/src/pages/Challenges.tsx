import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { SidebarWidget } from "@/components/SidebarWidget";
import { useAuth } from "@/lib/auth";
import { type ChallengeWithProgress } from "@shared/schema";
import { Target, Trophy, Clock, CheckCircle2 } from "lucide-react";

function formatTimeRemaining(endsAt: string | Date): string {
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return "Berakhir";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} hari ${hours % 24} jam`;
  }
  return `${hours} jam ${minutes} menit`;
}

function ChallengeCard({ challenge }: { challenge: ChallengeWithProgress }) {
  const progress = challenge.userProgress ?? 0;
  const progressPercent = Math.min((progress / challenge.target) * 100, 100);
  const isCompleted = challenge.userCompleted ?? false;

  return (
    <div
      className={`bg-card rounded-xl p-4 border ${isCompleted ? "border-green-500/30" : "border-border/50"}`}
      data-testid={`card-challenge-${challenge.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isCompleted ? "bg-green-500/10" : "bg-muted/50"
        }`}>
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Target className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm font-semibold ${isCompleted ? "text-green-500" : "text-foreground"}`} data-testid={`text-challenge-title-${challenge.id}`}>
              {challenge.title}
            </h3>
            {isCompleted && (
              <span className="text-[10px] font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                Selesai
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-challenge-desc-${challenge.id}`}>
            {challenge.description}
          </p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-medium text-foreground" data-testid={`text-challenge-reward-${challenge.id}`}>
                +{challenge.rewardKarma} karma
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground" data-testid={`text-challenge-time-${challenge.id}`}>
                {formatTimeRemaining(challenge.endsAt)}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">
                {progress}/{challenge.target}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden" data-testid={`progress-challenge-${challenge.id}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted ? "bg-green-500" : "bg-gradient-brand"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Challenges() {
  const { user } = useAuth();

  const { data: challenges, isLoading } = useQuery<ChallengeWithProgress[]>({
    queryKey: ["/api/challenges"],
  });

  const dailyChallenges = (challenges || []).filter((c) => c.type === "daily");
  const weeklyChallenges = (challenges || []).filter((c) => c.type === "weekly");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 max-w-[640px] mx-auto lg:mx-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground" data-testid="text-challenges-title">Tantangan</h1>
                <p className="text-xs text-muted-foreground">
                  {user ? "Selesaikan tantangan untuk mendapatkan karma bonus" : "Masuk untuk ikut tantangan"}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {dailyChallenges.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold text-foreground" data-testid="section-daily">Tantangan Harian</h2>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {dailyChallenges.filter((c) => c.userCompleted).length}/{dailyChallenges.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dailyChallenges.map((c) => (
                        <ChallengeCard key={c.id} challenge={c} />
                      ))}
                    </div>
                  </div>
                )}

                {weeklyChallenges.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold text-foreground" data-testid="section-weekly">Tantangan Mingguan</h2>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {weeklyChallenges.filter((c) => c.userCompleted).length}/{weeklyChallenges.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {weeklyChallenges.map((c) => (
                        <ChallengeCard key={c.id} challenge={c} />
                      ))}
                    </div>
                  </div>
                )}

                {dailyChallenges.length === 0 && weeklyChallenges.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                      <Target className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1" data-testid="text-empty-challenges">Belum ada tantangan</p>
                    <p className="text-xs text-muted-foreground">Tantangan baru akan segera hadir</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-16">
              <SidebarWidget />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
