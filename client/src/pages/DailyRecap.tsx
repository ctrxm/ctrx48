import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Calendar, TrendingUp, MessageSquare, Heart, FileText, Ghost } from "lucide-react";
import type { DailyRecap } from "@shared/schema";

export default function DailyRecap() {
  const { data: recap, isLoading } = useQuery<DailyRecap>({
    queryKey: ["/api/recap"],
  });

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hasActivity = recap && (recap.totalPosts > 0 || recap.totalComments > 0 || recap.totalReactions > 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[700px] mx-auto px-4 py-6 mobile-feed-padding">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-recap-title">Rekap Harian</h1>
            <p className="text-xs text-muted-foreground" data-testid="text-recap-date">{today}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 mt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-card rounded-xl animate-pulse" />
            ))}
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : !hasActivity ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-recap">
            <Ghost className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">Belum ada aktivitas hari ini</p>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {recap.topPost && (
              <Link href={`/post/${recap.topPost.id}`}>
                <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-top-post">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">Post Terbaik</span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground line-clamp-1" data-testid="text-top-post-title">{recap.topPost.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span data-testid="text-top-post-author">{recap.topPost.isConfession ? "Anonim" : recap.topPost.username}</span>
                    <span data-testid="text-top-post-score">Skor: {recap.topPost.score}</span>
                  </div>
                </Card>
              </Link>
            )}

            {recap.mostCommented && (
              <Link href={`/post/${recap.mostCommented.id}`}>
                <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-most-commented">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Paling Ramai</span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground line-clamp-1" data-testid="text-most-commented-title">{recap.mostCommented.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span data-testid="text-most-commented-author">{recap.mostCommented.isConfession ? "Anonim" : recap.mostCommented.username}</span>
                    <span data-testid="text-most-commented-count">{recap.mostCommented.commentCount} komentar</span>
                  </div>
                </Card>
              </Link>
            )}

            {recap.mostReacted && (
              <Link href={`/post/${recap.mostReacted.id}`}>
                <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-most-reacted">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-semibold text-pink-500 uppercase tracking-wide">Paling Direaksi</span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground line-clamp-1" data-testid="text-most-reacted-title">{recap.mostReacted.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span data-testid="text-most-reacted-author">{recap.mostReacted.isConfession ? "Anonim" : recap.mostReacted.username}</span>
                  </div>
                </Card>
              </Link>
            )}

            <div className="grid grid-cols-3 gap-3" data-testid="stats-summary">
              <Card className="p-4 text-center">
                <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xl font-bold text-foreground" data-testid="text-total-posts">{recap.totalPosts}</p>
                <p className="text-[10px] text-muted-foreground">Postingan</p>
              </Card>
              <Card className="p-4 text-center">
                <MessageSquare className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xl font-bold text-foreground" data-testid="text-total-comments">{recap.totalComments}</p>
                <p className="text-[10px] text-muted-foreground">Komentar</p>
              </Card>
              <Card className="p-4 text-center">
                <Heart className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xl font-bold text-foreground" data-testid="text-total-reactions">{recap.totalReactions}</p>
                <p className="text-[10px] text-muted-foreground">Reaksi</p>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
