import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import { Bookmark, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { PostWithUser } from "@shared/schema";

export default function Bookmarks() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: posts, isLoading } = useQuery<PostWithUser[]>({
    queryKey: ["/api/bookmarks"],
    enabled: !!user,
  });

  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-[640px] mx-auto px-4 py-6">
          <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[640px] mx-auto px-4 py-6 mobile-feed-padding">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </span>
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Tersimpan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Postingan yang kamu simpan sebelum kedaluwarsa</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada postingan tersimpan</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Klik ikon simpan di postingan untuk menyimpannya</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </main>
    </div>
  );
}
