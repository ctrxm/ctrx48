import { Link } from "wouter";
import { type PostWithUser } from "@shared/schema";
import { VoteButton } from "./VoteButton";
import { Clock, Lock, Skull, Flame, MessageSquare, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getTimeLeft(expiresAt: string | Date) {
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp <= now) return null;
  const diff = exp.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function PostCard({ post }: { post: PostWithUser }) {
  const isDead = new Date(post.expiresAt) <= new Date();
  const timeLeft = getTimeLeft(post.expiresAt);
  const isCollapsed = post.score < -50;
  const isChaos = post.commentCount > 100;
  const isHot = post.commentCount > 50 && post.score < 0;

  return (
    <div
      className={`group border border-neutral-800/40 bg-[#111111] hover:bg-[#141414] transition-all duration-200 ${
        isDead ? "opacity-40" : ""
      } ${isCollapsed ? "opacity-60" : ""} ${post.isLocked ? "border-l-2 border-l-red-900/60" : ""}`}
      data-testid={`card-post-${post.id}`}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="pt-0.5">
          <VoteButton score={post.score} userVote={post.userVote} postId={post.id} />
        </div>

        <div className="flex-1 min-w-0">
          <Link href={`/post/${post.id}`} data-testid={`link-post-${post.id}`}>
            <h3 className="text-sm font-medium text-neutral-200 hover:text-white cursor-pointer leading-snug truncate">
              {post.title}
            </h3>
          </Link>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-neutral-500">
              {post.username}
            </span>

            {post.isPublicEnemy && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-red-500 bg-red-950/40 px-1.5 py-0.5 border border-red-900/30" data-testid={`badge-enemy-${post.id}`}>
                <AlertTriangle className="w-2.5 h-2.5" />
                PUBLIC ENEMY
              </span>
            )}

            {isDead ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 border border-neutral-800" data-testid={`badge-dead-${post.id}`}>
                <Skull className="w-2.5 h-2.5" />
                DEAD
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-neutral-500">
                <Clock className="w-2.5 h-2.5" />
                {timeLeft}
              </span>
            )}

            {post.isLocked && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-red-600 bg-red-950/30 px-1.5 py-0.5 border border-red-900/20" data-testid={`badge-locked-${post.id}`}>
                <Lock className="w-2.5 h-2.5" />
                LOCKED
              </span>
            )}

            {isChaos && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-orange-500 bg-orange-950/30 px-1.5 py-0.5 border border-orange-900/20 animate-pulse" data-testid={`badge-chaos-${post.id}`}>
                <Flame className="w-2.5 h-2.5" />
                CHAOS
              </span>
            )}

            {isHot && !isChaos && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-amber-600">
                <Flame className="w-2.5 h-2.5" />
                HOT
              </span>
            )}

            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-neutral-600">
              <MessageSquare className="w-2.5 h-2.5" />
              {post.commentCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
