import { useQuery } from "@tanstack/react-query";
import { type PostWithUser } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import PostSkeleton from "@/components/PostSkeleton";
import { SidebarWidget } from "@/components/SidebarWidget";
import { Header } from "@/components/Header";
import { Flame, TrendingUp, Sparkles, MessageSquare } from "lucide-react";
import { useState } from "react";

type SortMode = "hot" | "new" | "top";

export default function Home() {
  const [sort, setSort] = useState<SortMode>("hot");

  const { data: posts, isLoading } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts"],
  });

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 max-w-[640px] mx-auto lg:mx-0">
            <div className="flex items-center gap-1 mb-4 bg-muted/50 rounded-full p-1 w-fit">
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
                  <div
                    key={post.id}
                    className="post-card-enter"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <PostCard post={post} />
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
