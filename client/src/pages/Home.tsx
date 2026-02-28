import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { type PostWithUser } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import PostSkeleton from "@/components/PostSkeleton";
import { SidebarWidget } from "@/components/SidebarWidget";
import { AdBanner } from "@/components/AdBanner";
import { Header } from "@/components/Header";
import { Flame, TrendingUp, Sparkles, MessageSquare, RefreshCw } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

type SortMode = "hot" | "new" | "top";

export default function Home() {
  const [sort, setSort] = useState<SortMode>("hot");
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const { data: posts, isLoading, isFetching } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts"],
    refetchInterval: 30000,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPulling(true);
      setPullDistance(Math.min(delta * 0.4, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    setPulling(false);
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, handleRefresh]);

  const sortedPosts = posts ? [...posts].sort((a, b) => {
    if (sort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "top") return b.score - a.score;
    return (b.heat + b.commentCount) - (a.heat + a.commentCount);
  }) : [];

  const sortOptions: { key: SortMode; label: string; icon: any }[] = [
    { key: "hot", label: "Populer", icon: Flame },
    { key: "new", label: "Terbaru", icon: Sparkles },
    { key: "top", label: "Teratas", icon: TrendingUp },
  ];

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={feedRef}
    >
      <Header />

      {(pulling || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: refreshing ? 48 : pullDistance }}
          data-testid="pull-refresh-indicator"
        >
          <RefreshCw className={`w-5 h-5 text-primary transition-transform ${
            refreshing ? "animate-spin" : pullDistance > 60 ? "text-primary" : "text-muted-foreground"
          }`} style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }} />
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <AdBanner placement="header" className="mb-4" />
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 max-w-[640px] mx-auto lg:mx-0">
            <div className="flex items-center gap-1 mb-4">
              <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 w-fit">
                {sortOptions.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      sort === key
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSort(key)}
                    data-testid={`sort-${key}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing || isFetching}
                className="ml-auto p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                title="Refresh feed"
                data-testid="button-refresh-feed"
              >
                <RefreshCw className={`w-4 h-4 ${(refreshing || isFetching) ? "animate-spin" : ""}`} />
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
            ) : sortedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1" data-testid="text-empty-title">Belum ada postingan</p>
                <p className="text-xs text-muted-foreground" data-testid="text-empty-subtitle">Jadilah yang pertama memulai percakapan</p>
              </div>
            ) : (
              <div className="space-y-2 mobile-feed-padding">
                {sortedPosts.map((post, index) => (
                  <div key={post.id}>
                    {index > 0 && index % 5 === 0 && (
                      <AdBanner placement="feed" className="mb-2" />
                    )}
                    <div
                      className="post-card-enter"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <PostCard post={post} />
                    </div>
                  </div>
                ))}
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
