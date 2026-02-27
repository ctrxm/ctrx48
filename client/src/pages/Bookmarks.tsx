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
        <main className="max-w-3xl mx-auto px-4 py-6">
          <div className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </span>
        </Link>

        <h1 className="text-lg font-bold text-foreground mb-1">Postingan Tersimpan</h1>
        <p className="text-sm text-muted-foreground mb-6">Postingan yang kamu simpan sebelum kedaluwarsa</p>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl text-center py-20">
            <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada postingan tersimpan</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Klik ikon simpan di postingan untuk menyimpannya</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </main>
    </div>
  );
}
