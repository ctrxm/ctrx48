import { Link } from "wouter";
import { type PostWithUser } from "@shared/schema";
import { VoteButton } from "./VoteButton";
import { Clock, Lock, Skull, Flame, MessageSquare, AlertTriangle, Timer } from "lucide-react";
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

function getExpiryPercent(createdAt: string | Date, expiresAt: string | Date) {
  const created = new Date(createdAt).getTime();
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const total = expires - created;
  const elapsed = now - created;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function PostCard({ post }: { post: PostWithUser }) {
  const isDead = new Date(post.expiresAt) <= new Date();
  const timeLeft = getTimeLeft(post.expiresAt);
  const isCollapsed = post.score < -50;
  const isChaos = post.commentCount > 100;
  const isHot = post.commentCount > 50 && post.score < 0;
  const expiryPercent = getExpiryPercent(post.createdAt, post.expiresAt);

  return (
    <article
      className={`group bg-card border border-card-border rounded-lg hover:border-border transition-all duration-200 ${
        isDead ? "opacity-50" : ""
      } ${isCollapsed ? "opacity-60" : ""}`}
      data-testid={`card-post-${post.id}`}
    >
      <div className="flex gap-0">
        <div className="flex flex-col items-center py-3 px-2 sm:px-3 shrink-0">
          <VoteButton score={post.score} userVote={post.userVote} postId={post.id} />
        </div>

        <div className="flex-1 min-w-0 py-2.5 pr-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
            <Link href={`/u/${post.username}`} data-testid={`link-user-${post.id}`}>
              <span className="font-medium text-foreground/80 hover:underline cursor-pointer">
                u/{post.username}
              </span>
            </Link>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>

            {post.isPublicEnemy && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full" data-testid={`badge-enemy-${post.id}`}>
                <AlertTriangle className="w-2.5 h-2.5" />
                PUBLIC ENEMY
              </span>
            )}
          </div>

          <Link href={`/post/${post.id}`} data-testid={`link-post-${post.id}`}>
            <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug hover:text-primary cursor-pointer transition-colors line-clamp-2 mb-1.5">
              {post.title}
            </h3>
          </Link>

          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
            {post.content}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Link href={`/post/${post.id}`}>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent px-2 py-1 rounded-md transition-colors" data-testid={`button-comments-${post.id}`}>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}</span>
              </button>
            </Link>

            {!isDead && timeLeft && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="w-3.5 h-3.5" />
                <span>{timeLeft} left</span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`h-full rounded-full transition-all ${
                      expiryPercent > 80 ? "bg-destructive" : expiryPercent > 50 ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${expiryPercent}%` }}
                  />
                </div>
              </div>
            )}

            {isDead && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md" data-testid={`badge-dead-${post.id}`}>
                <Skull className="w-3 h-3" />
                Expired
              </span>
            )}

            {post.isLocked && (
              <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-md" data-testid={`badge-locked-${post.id}`}>
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}

            {isChaos && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md animate-pulse" data-testid={`badge-chaos-${post.id}`}>
                <Flame className="w-3 h-3" />
                Chaos
              </span>
            )}

            {isHot && !isChaos && (
              <span className="inline-flex items-center gap-1 text-xs text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md">
                <Flame className="w-3 h-3" />
                Hot
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
