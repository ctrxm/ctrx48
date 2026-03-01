import { Link } from "wouter";
import { useState } from "react";
import { type PostWithUser } from "@shared/schema";
import { VoteButton } from "./VoteButton";
import { PaymentModal } from "./PaymentModal";
import { PollDisplay } from "./PollDisplay";
import { ReactionBar } from "./ReactionBar";
import { Lock, Skull, Flame, MessageCircle, AlertTriangle, Timer, ExternalLink, Bookmark, BookmarkCheck, Tag, Users, Crown, BadgeCheck, Rocket, Heart, Ghost, Pin, LinkIcon, Share2, Zap, Flag, Award, Copy, Trophy, Loader2 } from "lucide-react";
import { UserHoverCard } from "./UserHoverCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getGlowStyle, hasCustomGlow } from "@/lib/usernameGlow";
import { SiWhatsapp, SiX, SiTelegram } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useMutation, useQuery } from "@tanstack/react-query";
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

  const [optimisticBookmark, setOptimisticBookmark] = useState<boolean | null>(null);
  const isBookmarked = optimisticBookmark !== null ? optimisticBookmark : post.isBookmarked;
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [selectedAwardId, setSelectedAwardId] = useState<number | null>(null);

  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (post.isBookmarked) {
        return apiRequest("DELETE", `/api/bookmarks/${post.id}`);
      }
      return apiRequest("POST", "/api/bookmarks", { postId: post.id });
    },
    onMutate: () => {
      setOptimisticBookmark(!post.isBookmarked);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
    onError: () => {
      setOptimisticBookmark(null);
    },
    onSettled: () => {
      setTimeout(() => setOptimisticBookmark(null), 500);
    },
  });

  const postUrl = `${window.location.origin}/post/${post.id}`;
  const shareText = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(postUrl);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({ title: "Link disalin!", description: "Link postingan berhasil disalin ke clipboard" });
    } catch {}
  };

  const reportMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reports", { postId: post.id, reason: "Konten tidak pantas" }),
    onSuccess: () => {
      toast({ title: "Dilaporkan", description: "Laporan berhasil dikirim" });
    },
    onError: (e: any) => {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    },
  });

  const awardsQuery = useQuery<Array<{ id: number; name: string; icon: string; cost: number; color: string; description: string }>>({
    queryKey: ["/api/awards"],
    enabled: awardDialogOpen,
  });

  const giveAwardMutation = useMutation({
    mutationFn: (awardId: number) => apiRequest("POST", "/api/awards/give", { postId: post.id, awardId }),
    onSuccess: () => {
      toast({ title: "Award diberikan!", description: "Award berhasil diberikan ke postingan ini" });
      setAwardDialogOpen(false);
      setSelectedAwardId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id] });
    },
    onError: (e: any) => {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
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
                  <span className="inline-flex items-center gap-1 hover:underline cursor-pointer">
                    <span
                      className={`text-sm font-semibold inline-flex items-center gap-0.5 ${post.isPremiumUsername ? (hasCustomGlow(post.usernameGlow) ? "" : "username-glow") : "text-foreground"}`}
                      style={post.isPremiumUsername ? getGlowStyle(post.usernameGlow) : undefined}
                    >
                      <span className="text-muted-foreground font-normal text-xs" style={post.isPremiumUsername && hasCustomGlow(post.usernameGlow) ? { WebkitTextFillColor: 'initial', backgroundClip: 'initial', WebkitBackgroundClip: 'initial', background: 'none' } : undefined}>u/</span>
                      {post.username}
                    </span>
                    {post.isVerifiedUser && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" data-testid={`badge-verified-${post.id}`} />}
                    {post.isPremiumUser && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" data-testid={`badge-premium-${post.id}`} />}
                    {post.customFlair && (
                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full" data-testid={`flair-custom-${post.id}`}>
                        {post.customFlair}
                      </span>
                    )}
                    {post.userLevel !== undefined && post.userLevel > 0 && (
                      <span className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full" data-testid={`badge-level-${post.id}`}>
                        Lv.{post.userLevel}
                      </span>
                    )}
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

        <div className="flex items-center gap-1.5 flex-wrap pt-2 -ml-1">
          <VoteButton score={post.score} userVote={post.userVote} postId={post.id} />

          <Link href={`/post/${post.id}`}>
            <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-500 px-3 py-2 rounded-full transition-all duration-150 hover:bg-blue-500/10 active:scale-95" data-testid={`button-comments-${post.id}`}>
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{post.commentCount}</span>
            </button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green-500 px-3 py-2 rounded-full transition-all duration-150 hover:bg-green-500/10 active:scale-95"
                data-testid={`button-share-${post.id}`}
              >
                <Share2 className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`https://wa.me/?text=${shareText}%20${shareUrl}`, "_blank")} data-testid={`share-whatsapp-${post.id}`}>
                <SiWhatsapp className="w-4 h-4 text-green-500" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, "_blank")} data-testid={`share-twitter-${post.id}`}>
                <SiX className="w-4 h-4" />
                Twitter / X
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`https://t.me/share/url?url=${shareUrl}&text=${shareText}`, "_blank")} data-testid={`share-telegram-${post.id}`}>
                <SiTelegram className="w-4 h-4 text-blue-500" />
                Telegram
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleCopyLink} data-testid={`share-copy-${post.id}`}>
                <Copy className="w-4 h-4" />
                Salin Link
              </DropdownMenuItem>
              {user && user.id !== post.userId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onClick={() => reportMutation.mutate()} data-testid={`button-report-${post.id}`}>
                    <Flag className="w-4 h-4" />
                    Laporkan
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <button
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-full transition-all duration-150 active:scale-95 ${
                isBookmarked ? "text-primary bg-primary/15" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              }`}
              onClick={() => bookmarkMutation.mutate()}
              data-testid={`button-bookmark-${post.id}`}
            >
              {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </button>
          )}

          {user && !isDead && user.id === post.userId && (
            <button
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-500 px-3 py-2 rounded-full transition-all duration-150 hover:bg-orange-500/10 active:scale-95"
              onClick={handleBoost}
              data-testid={`button-boost-${post.id}`}
            >
              <Zap className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Boost</span>
            </button>
          )}

          {user && user.id !== post.userId && (
            <button
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-pink-500 px-3 py-2 rounded-full transition-all duration-150 hover:bg-pink-500/10 active:scale-95"
              onClick={handleTip}
              data-testid={`button-tip-${post.id}`}
            >
              <Heart className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Tip</span>
            </button>
          )}

          {user && user.id !== post.userId && (
            <button
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-yellow-500 px-3 py-2 rounded-full transition-all duration-150 hover:bg-yellow-500/10 active:scale-95"
              onClick={() => setAwardDialogOpen(true)}
              data-testid={`button-award-${post.id}`}
            >
              <Trophy className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Award</span>
            </button>
          )}

          {(post.tipTotal ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-pink-500 bg-pink-500/10 px-2.5 py-1 rounded-full font-medium" data-testid={`badge-tips-${post.id}`}>
              <Heart className="w-3.5 h-3.5" />
              Rp {(post.tipTotal ?? 0).toLocaleString("id-ID")}
            </span>
          )}

          <div className="flex-1" />

          {!isDead && timeLeft && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${getTimerColor(post.expiresAt)}`}
              data-testid={`timer-${post.id}`}
            >
              <Timer className="w-3.5 h-3.5" />
              {timeLeft}
            </span>
          )}

          {post.isPinned && (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium bg-primary/10 px-2.5 py-1 rounded-full" data-testid={`badge-pinned-${post.id}`}>
              <Pin className="w-3.5 h-3.5" />
              Disematkan
            </span>
          )}

          {isDead && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full" data-testid={`badge-dead-${post.id}`}>
              <Skull className="w-3.5 h-3.5" />
              Kedaluwarsa
            </span>
          )}

          {post.isLocked && (
            <span className="inline-flex items-center gap-1 text-[11px] text-destructive bg-destructive/10 px-2.5 py-1 rounded-full" data-testid={`badge-locked-${post.id}`}>
              <Lock className="w-3.5 h-3.5" />
              Dikunci
            </span>
          )}

          {isChaos && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-500/10 dark:text-amber-400 px-2.5 py-1 rounded-full font-semibold" data-testid={`badge-chaos-${post.id}`}>
              <Flame className="w-3.5 h-3.5" />
              Kacau
            </span>
          )}

          {isHot && !isChaos && (
            <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 bg-orange-500/10 dark:text-orange-400 px-2.5 py-1 rounded-full font-semibold">
              <Flame className="w-3.5 h-3.5" />
              Panas
            </span>
          )}
        </div>

        {post.awards && post.awards.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1.5 flex-wrap" data-testid={`awards-${post.id}`}>
            {post.awards.map((award, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: award.color + "15", color: award.color }} data-testid={`award-${post.id}-${i}`}>
                {award.icon} {award.count > 1 && `×${award.count}`}
              </span>
            ))}
          </div>
        )}

        {post.bounty && post.bounty.status === "active" && (
          <div className="flex items-center gap-1.5 pt-1.5" data-testid={`bounty-${post.id}`}>
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
              <Award className="w-3.5 h-3.5" />
              Bounty Rp {post.bounty.amount.toLocaleString("id-ID")}
            </span>
          </div>
        )}

        {(post.reactions && post.reactions.length > 0) || user ? (
          <div className="pt-1.5">
            <ReactionBar postId={post.id} reactions={post.reactions} />
          </div>
        ) : null}
      </div>

      <Dialog open={awardDialogOpen} onOpenChange={(open) => { setAwardDialogOpen(open); if (!open) setSelectedAwardId(null); }}>
        <DialogContent className="sm:max-w-md" data-testid={`dialog-award-${post.id}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Berikan Award
            </DialogTitle>
            <DialogDescription>
              Pilih award untuk postingan ini. Biaya diambil dari karma kamu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {awardsQuery.isLoading && (
              <div className="flex items-center justify-center py-8" data-testid="loading-awards">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {awardsQuery.data?.map((award) => (
              <button
                key={award.id}
                className={`flex items-center gap-3 p-3 rounded-md text-left transition-all duration-150 ${
                  selectedAwardId === award.id
                    ? "bg-yellow-500/15 ring-1 ring-yellow-500/50"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedAwardId(award.id)}
                data-testid={`award-option-${award.id}`}
              >
                <span className="text-2xl shrink-0 w-10 h-10 flex items-center justify-center rounded-md" style={{ backgroundColor: (award.color || "#f59e0b") + "15" }}>
                  {award.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{award.name}</p>
                  {award.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{award.description}</p>
                  )}
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full shrink-0">
                  {award.cost} karma
                </span>
              </button>
            ))}
            {awardsQuery.data?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada award tersedia.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAwardDialogOpen(false)} data-testid="button-cancel-award">
              Batal
            </Button>
            <Button
              disabled={!selectedAwardId || giveAwardMutation.isPending}
              onClick={() => selectedAwardId && giveAwardMutation.mutate(selectedAwardId)}
              data-testid="button-confirm-award"
            >
              {giveAwardMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Berikan Award
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
