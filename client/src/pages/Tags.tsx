import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Flame } from "lucide-react";
import { type TrendingTag } from "@shared/schema";

export default function Tags() {
  const { data: tags, isLoading } = useQuery<TrendingTag[]>({
    queryKey: ["/api/tags/trending"],
  });

  const maxCount = tags && tags.length > 0 ? tags[0].count : 1;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-trending-title">
              Trending 24 Jam
            </h1>
            <p className="text-xs text-muted-foreground">Hashtag paling sering digunakan</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !tags || tags.length === 0 ? (
          <div className="text-center py-16" data-testid="text-empty-tags">
            <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Belum ada hashtag trending</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag, index) => {
              const isTop3 = index < 3;
              const barWidth = Math.max(8, (tag.count / maxCount) * 100);

              return (
                <div
                  key={tag.tag}
                  className="relative rounded-lg overflow-hidden bg-card p-3 flex items-center gap-3"
                  data-testid={`tag-item-${index}`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500/15 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/5 rounded-lg transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />

                  <span className="relative text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
                    {index + 1}
                  </span>

                  <span
                    className={`relative font-semibold ${
                      isTop3
                        ? "text-base bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent"
                        : "text-sm text-foreground"
                    }`}
                    data-testid={`text-tag-name-${index}`}
                  >
                    #{tag.tag}
                  </span>

                  <span className="relative ml-auto text-xs text-muted-foreground shrink-0" data-testid={`text-tag-count-${index}`}>
                    {tag.count}x
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}