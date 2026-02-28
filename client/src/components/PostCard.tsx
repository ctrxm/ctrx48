import { Link } from "wouter";
import { useState } from "react";
import { type PostWithUser } from "@shared/schema";
import { VoteButton } from "./VoteButton";
import { PaymentModal } from "./PaymentModal";
import { PollDisplay } from "./PollDisplay";
import { ReactionBar } from "./ReactionBar";
import { Lock, Skull, Flame, MessageSquare, AlertTriangle, Timer, ExternalLink, Bookmark, BookmarkCheck, Tag, Users, Crown, BadgeCheck, Rocket, Heart, Ghost, Pin, LinkIcon } from "lucide-react";
import { UserHoverCard } from "./UserHoverCard";
import { getGlowStyle, hasCustomGlow } from "@/lib/usernameGlow";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HASHTAG_REGEX = /#[\w\u00C0-\u024F]+/g;

function renderWithHashtags(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(HASHTAG_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-purple-500 dark:text-purple-400 font-medium">
        {match[0]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function getTimeLeft(expiresAt: string | Date) {
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp <= now) return null;
  const diff = exp.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

function getTimerColor(expiresAt: string | Date) {
  const exp = new Date(expiresAt);
  const now = new Date();
  const hoursLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft > 24) return "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400";
  if (hoursLeft > 12) return "text-yellow-600 bg-yellow-500/10 dark:text-yellow-400";
  if (hoursLeft > 6) return "text-orange-600 bg-orange-500/10 dark:text-orange-400";
  return "text-destructive bg-destructive/10 animate-countdown";
}

function getGlowClass(score: number) {
  if (score >= 50) return "post-glow-strong";
  if (score >= 25) return "post-glow";
  return "";
}

const FLAIR_COLORS: Record<string, string> = {
  "Diskusi": "bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400",
  "Curhat": "bg-purple-500/10 text-purple-500 dark:bg-purple-500/15 dark:text-purple-400",
  "Meme": "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400",
  "Berita": "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Opini": "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
};

export function PostCard({ post }: { post: PostWithUser }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isDead = new Date(post.expiresAt) <= new Date();
  const timeLeft = getTimeLeft(post.expiresAt);
  const isCollapsed = post.score < -50;
  const isChaos = post.commentCount > 100;
  const isHot = post.commentCount > 50 && post.score < 0;
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean; invoiceId: string; paymentUrl: string; description: string; amount: number; finalAmount: number;
  }>({ isOpen: false, invoiceId: "", paymentUrl: "", description: "", amount: 0, finalAmount: 0 });

  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (post.isBookmarked) {
        return apiRequest("DELETE", `/api/bookmarks/${post.id}`);
      }
      return apiRequest("POST", "/api/bookmarks", { postId: post.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
  });

  const handleBoost = async () => {
    try {
      const res = await apiRequest("POST", `/api/payments/boost/${post.id}`);
      const data = await res.json();
      setPaymentModal({ isOpen: true, invoiceId: data.invoiceId, paymentUrl: data.paymentUrl, description: "Boost Postingan", amount: 5000, finalAmount: data.finalAmount });
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
  };

  const handleTip = async () => {
    try {
      const res = await apiRequest("POST", `/api/payments/tip/${post.id}`, { amount: 5000 });
      const data = await res.json();
      setPaymentModal({ isOpen: true, invoiceId: data.invoiceId, paymentUrl: data.paymentUrl, description: "Tip Rp 5.000", amount: 5000, finalAmount: data.finalAmount });
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
  };

  return (
    <article
      className={`group bg-card rounded-xl hover:shadow-md transition-all duration-200 ${
        isDead ? "opacity-50" : ""
      } ${isCollapsed ? "opacity-60" : ""} ${!isDead ? getGlowClass(post.score) : ""}`}
      data-testid={`card-post-${post.id}`}
    >
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          {post.isConfession ? (
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                <Ghost className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserHoverCard username={post.username}>
              <Link href={`/u/${post.username}`} data-testid={`link-user-${post.id}`}>
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarImage src={post.avatarUrl || undefined} alt={post.username} referrerPolicy="no-referrer" />
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                    {post.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </UserHoverCard>
          )}

          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            {post.isConfession ? (
              <span className="text-sm font-semibold text-muted-foreground inline-flex items-center gap-1" data-testid={`text-anon-${post.id}`}>
                <Ghost className="w-3.5 h-3.5" />
                Anonim
              </span>
            ) : (
              <UserHoverCard username={post.username}>
                <Link href={`/u/${post.username}`} data-testid={`link-user-name-${post.id}`}>
                  <span
                    className={`text-sm font-semibold hover:underline cursor-pointer inline-flex items-center gap-1 ${post.isPremiumUsername ? (hasCustomGlow(post.usernameGlow) ? "" : "username-glow") : "text-foreground"}`}
                    style={post.isPremiumUsername ? getGlowStyle(post.usernameGlow) : undefined}
                  >
                    <span className="text-muted-foreground font-normal text-xs" style={post.isPremiumUsername && hasCustomGlow(post.usernameGlow) ? { WebkitTextFillColor: 'initial' } : undefined}>u/</span>
                    {post.username}
                    {post.isVerifiedUser && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" data-testid={`badge-verified-${post.id}`} />}
                    {post.isPremiumUser && <Crown className="w-3.5 h-3.5 text-yellow-500" data-testid={`badge-premium-${post.id}`} />}
                  </span>
                </Link>
              </UserHoverCard>
            )}

            {post.groupSlug && post.groupName && (
              <>
                <span className="text-muted-foreground text-xs">di</span>
                <Link href={`/groups/${post.groupSlug}`} data-testid={`link-group-${post.id}`}>
                  <span className="text-xs font-medium text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5">
                    <span className="text-muted-foreground font-normal">g/</span>
                    {post.groupName}
                  </span>
                </Link>
              </>
            )}

            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: idLocale })}
            </span>

            {post.isPublicEnemy && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full" data-testid={`badge-enemy-${post.id}`}>
                <AlertTriangle className="w-2.5 h-2.5" />
                MUSUH PUBLIK
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {post.flair && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${FLAIR_COLORS[post.flair] || "bg-primary/10 text-primary"}`} data-testid={`badge-flair-${post.id}`}>
                <Tag className="w-2.5 h-2.5" />
                {post.flair}
              </span>
            )}
          </div>
        </div>

        <Link href={`/post/${post.id}`} data-testid={`link-post-${post.id}`}>
          <h3 className="text-base font-bold text-foreground leading-snug hover:text-primary cursor-pointer transition-colors line-clamp-2 mb-2">
            {renderWithHashtags(post.title)}
          </h3>
        </Link>

        {post.type === "image" && post.imageUrl && (
          <Link href={`/post/${post.id}`}>
            <div className="mb-3 rounded-xl overflow-hidden cursor-pointer">
              <img src={post.imageUrl} alt="" className="w-full max-h-72 object-cover" />
            </div>
          </Link>
        )}

        {post.type === "link" && post.linkUrl && (
          <Link href={`/post/${post.id}`}>
            <div className="mb-3 rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary/30 transition-colors">
              {post.linkImage && (
                <img src={post.linkImage} alt="" className="w-full h-36 object-cover" />
              )}
              <div className="p-3 bg-muted/30">
                {post.linkTitle && (
                  <p className="text-sm font-medium text-foreground line-clamp-1">{post.linkTitle}</p>
                )}
                {post.linkDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.linkDescription}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {new URL(post.linkUrl).hostname}
                </p>
              </div>
            </div>
          </Link>
        )}

        {post.type === "text" && post.content && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
            {renderWithHashtags(post.content)}
          </p>
        )}

        {post.type === "poll" && (
          <PollDisplay postId={post.id} />
        )}

        {post.threadId && (
          <Link href={`/post/${post.threadId}`}>
            <div className="flex items-center gap-1.5 text-xs text-primary mb-3 cursor-pointer hover:underline" data-testid={`link-thread-${post.id}`}>
              <LinkIcon className="w-3 h-3" />
              <span>Lanjutan thread...</span>
            </div>
          </Link>
        )}

        <div className="flex items-center gap-1 flex-wrap pt-1 -ml-1">
          <VoteButton score={post.score} userVote={post.userVote} postId={post.id} />

          <Link href={`/post/${post.id}`}>
            <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-full transition-colors hover:bg-muted/50" data-testid={`button-comments-${post.id}`}>
              <MessageSquare className="w-4 h-4" />
              <span>{post.commentCount}</span>
            </button>
          </Link>

          {user && (
            <button
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                post.isBookmarked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              onClick={() => bookmarkMutation.mutate()}
              disabled={bookmarkMutation.isPending}
              data-testid={`button-bookmark-${post.id}`}
            >
              {post.isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span className="hidden sm:inline">{post.isBookmarked ? "Tersimpan" : "Simpan"}</span>
            </button>
          )}

          {user && !isDead && user.id === post.userId && (
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 px-2.5 py-1.5 rounded-full transition-colors hover:bg-orange-500/10"
              onClick={handleBoost}
              data-testid={`button-boost-${post.id}`}
            >
              <Rocket className="w-4 h-4" />
              <span className="hidden sm:inline">Boost</span>
            </button>
          )}

          {user && user.id !== post.userId && (
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-500 px-2.5 py-1.5 rounded-full transition-colors hover:bg-pink-500/10"
              onClick={handleTip}
              data-testid={`button-tip-${post.id}`}
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Tip</span>
            </button>
          )}

          {(post.tipTotal ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-full" data-testid={`badge-tips-${post.id}`}>
              <Heart className="w-3 h-3" />
              Rp {(post.tipTotal ?? 0).toLocaleString("id-ID")}
            </span>
          )}

          <div className="flex-1" />

          {!isDead && timeLeft && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${getTimerColor(post.expiresAt)}`}
              data-testid={`timer-${post.id}`}
            >
              <Timer className="w-3 h-3" />
              {timeLeft}
            </span>
          )}

          {post.isPinned && (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full" data-testid={`badge-pinned-${post.id}`}>
              <Pin className="w-3 h-3" />
              Disematkan
            </span>
          )}

          {isDead && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full" data-testid={`badge-dead-${post.id}`}>
              <Skull className="w-3 h-3" />
              Kedaluwarsa
            </span>
          )}

          {post.isLocked && (
            <span className="inline-flex items-center gap-1 text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full" data-testid={`badge-locked-${post.id}`}>
              <Lock className="w-3 h-3" />
              Dikunci
            </span>
          )}

          {isChaos && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full" data-testid={`badge-chaos-${post.id}`}>
              <Flame className="w-3 h-3" />
              Kacau
            </span>
          )}

          {isHot && !isChaos && (
            <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 bg-orange-500/10 dark:text-orange-400 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3" />
              Panas
            </span>
          )}
        </div>

        {(post.reactions && post.reactions.length > 0) || user ? (
          <div className="pt-1.5">
            <ReactionBar postId={post.id} reactions={post.reactions} />
          </div>
        ) : null}
      </div>

      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(p => ({ ...p, isOpen: false }))}
        invoiceId={paymentModal.invoiceId}
        paymentUrl={paymentModal.paymentUrl}
        description={paymentModal.description}
        amount={paymentModal.amount}
        finalAmount={paymentModal.finalAmount}
      />
    </article>
  );
}
