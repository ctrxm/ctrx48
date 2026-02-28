import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useState } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Skull, TrendingUp, ArrowUp, Crown } from "lucide-react";

type LeaderboardData = {
  topUsers: {
    id: string;
    username: string;
    reputation: number;
    avatarUrl?: string | null;
    isPremium?: boolean;
    isVerified?: boolean;
  }[];
  topPosts: {
    id: string;
    title: string;
    score: number;
    username: string;
    commentCount: number;
  }[];
  publicEnemies: {
    id: string;
    username: string;
    reputation: number;
    avatarUrl?: string | null;
  }[];
};

const RANK_ICONS = [
  { color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { color: "text-slate-400", bg: "bg-slate-400/10" },
  { color: "text-amber-600", bg: "bg-amber-600/10" },
];

export default function Leaderboard() {
  const [tab, setTab] = useState<"users" | "posts" | "enemies">("users");

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/leaderboard"],
  });

  const tabs = [
    { key: "users" as const, label: "Top Pengguna", icon: Trophy },
    { key: "posts" as const, label: "Post Terbaik", icon: TrendingUp },
    { key: "enemies" as const, label: "Musuh Publik", icon: Skull },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[700px] mx-auto px-4 py-6 mobile-feed-padding">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-leaderboard-title">Peringkat</h1>
            <p className="text-xs text-muted-foreground">Sepanjang waktu</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-xs rounded-full transition-all flex items-center justify-center gap-1.5 ${
                tab === t.key ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground"
              }`}
              data-testid={`tab-${t.key}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {tab === "users" && (
              <div className="space-y-2" data-testid="list-top-users">
                {(!data?.topUsers || data.topUsers.length === 0) ? (
                  <div className="text-center py-16">
                    <Trophy className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  </div>
                ) : (
                  data.topUsers.map((u, idx) => (
                    <Link key={u.id} href={`/u/${u.username}`}>
                      <div className="bg-card rounded-xl p-4 flex items-center gap-3 cursor-pointer" data-testid={`row-user-${idx}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          idx < 3 ? RANK_ICONS[idx].bg + " " + RANK_ICONS[idx].color : "bg-muted text-muted-foreground"
                        }`}>
                          {idx < 3 ? (
                            <Medal className="w-4 h-4" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={u.avatarUrl || undefined} referrerPolicy="no-referrer" />
                          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                            {u.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{u.username}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {u.isPremium && <Crown className="w-3 h-3 text-yellow-500" />}
                            karma
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-primary flex items-center gap-1">
                            <ArrowUp className="w-3 h-3" />
                            +{u.reputation}
                          </span>
                          <span className="text-[10px] text-muted-foreground">karma</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {tab === "posts" && (
              <div className="space-y-2" data-testid="list-top-posts">
                {(!data?.topPosts || data.topPosts.length === 0) ? (
                  <div className="text-center py-16">
                    <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  </div>
                ) : (
                  data.topPosts.map((p, idx) => (
                    <Link key={p.id} href={`/post/${p.id}`}>
                      <div className="bg-card rounded-xl p-4 flex items-center gap-3 cursor-pointer" data-testid={`row-post-${idx}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          idx < 3 ? RANK_ICONS[idx].bg + " " + RANK_ICONS[idx].color : "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</p>
                          <p className="text-xs text-muted-foreground">oleh {p.username} · {p.commentCount} komentar</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-primary">+{p.score}</span>
                          <p className="text-[10px] text-muted-foreground">skor</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {tab === "enemies" && (
              <div className="space-y-2" data-testid="list-enemies">
                {(!data?.publicEnemies || data.publicEnemies.length === 0) ? (
                  <div className="text-center py-16">
                    <Skull className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Tidak ada musuh publik</p>
                  </div>
                ) : (
                  data.publicEnemies.map((u, idx) => (
                    <Link key={u.id} href={`/u/${u.username}`}>
                      <div className="bg-card rounded-xl p-4 flex items-center gap-3 cursor-pointer" data-testid={`row-enemy-${idx}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/10 text-destructive shrink-0">
                          <Skull className="w-4 h-4" />
                        </div>
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={u.avatarUrl || undefined} referrerPolicy="no-referrer" />
                          <AvatarFallback className="text-xs bg-destructive/10 text-destructive">
                            {u.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{u.username}</p>
                        </div>
                        <span className="text-sm font-bold text-destructive shrink-0">
                          {u.reputation}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
