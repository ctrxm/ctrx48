import { useQuery } from "@tanstack/react-query";
import { type PostWithUser } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import { Skull, Flame } from "lucide-react";
import { Header } from "@/components/Header";

export default function Home() {
  const { data: posts, isLoading } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts"],
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-700" />
            <h1 className="text-xs font-mono font-bold text-neutral-400 tracking-widest uppercase">
              Active Threads
            </h1>
          </div>
          <span className="text-[10px] font-mono text-neutral-600">
            {posts?.length ?? 0} threads
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#111111] border border-neutral-800/40 animate-pulse" />
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Skull className="w-12 h-12 text-neutral-800 mb-4" />
            <p className="text-sm font-mono text-neutral-600">No threads alive.</p>
            <p className="text-xs font-mono text-neutral-700 mt-1">Be the first to start the chaos.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-800/30 mt-16 py-6">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <span className="text-[10px] font-mono text-neutral-700">
            ritual48 — posts die in 48 hours
          </span>
          <span className="text-[10px] font-mono text-neutral-800">
            no mercy
          </span>
        </div>
      </footer>
    </div>
  );
}
