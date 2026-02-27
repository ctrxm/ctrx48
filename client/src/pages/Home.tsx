import { useQuery } from "@tanstack/react-query";
import { type PostWithUser } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import { SidebarWidget } from "@/components/SidebarWidget";
import { Header } from "@/components/Header";
import { Flame, TrendingUp, Clock, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    { key: "hot", label: "Hot", icon: Flame },
    { key: "new", label: "New", icon: Sparkles },
    { key: "top", label: "Top", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="bg-card border border-card-border rounded-lg p-2 mb-4 flex items-center gap-1">
              {sortOptions.map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={sort === key ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-8 text-xs gap-1.5 ${sort === key ? "font-semibold" : ""}`}
                  onClick={() => setSort(key)}
                  data-testid={`sort-${key}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-card border border-card-border rounded-lg h-32 animate-pulse" />
                ))}
              </div>
            ) : sortedPosts.length === 0 ? (
              <div className="bg-card border border-card-border rounded-lg flex flex-col items-center justify-center py-20 text-center">
                <Flame className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">No posts yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Be the first to start the conversation</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
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
