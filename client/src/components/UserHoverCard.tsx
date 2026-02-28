import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { type UserProfile } from "@shared/schema";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, Crown, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export function UserHoverCard({ username, children }: { username: string; children: ReactNode }) {
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/users", username],
    staleTime: 60000,
    enabled: !!username,
  });

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild data-testid={`hover-trigger-user-${username}`}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-3" data-testid={`hover-card-user-${username}`}>
        {isLoading ? (
          <div className="flex items-center gap-3 animate-pulse" data-testid="hover-card-loading">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-2.5 w-16 bg-muted rounded" />
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10" data-testid={`hover-avatar-${username}`}>
                <AvatarImage src={profile.avatarUrl || undefined} alt={profile.username} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate" data-testid={`hover-username-${username}`}>
                    {profile.displayName || profile.username}
                  </span>
                  {profile.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" data-testid={`hover-verified-${username}`} />}
                  {profile.isPremium && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" data-testid={`hover-premium-${username}`} />}
                </div>
                <span className={`text-xs ${profile.isPremiumUsername ? "username-glow" : "text-muted-foreground"}`} data-testid={`hover-handle-${username}`}>
                  u/{profile.username}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1" data-testid={`hover-reputation-${username}`}>
                <span className="text-muted-foreground">Reputasi:</span>
                <span className={`font-semibold ${profile.reputation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {profile.reputation}
                </span>
              </div>
              <div className="text-muted-foreground" data-testid={`hover-joined-${username}`}>
                Bergabung {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: false, locale: idLocale })} lalu
              </div>
            </div>

            {profile.badges && profile.badges.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs" data-testid={`hover-achievement-${username}`}>
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-muted-foreground">{profile.badges[0].name}</span>
              </div>
            )}

            {profile.bio && (
              <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`hover-bio-${username}`}>
                {profile.bio}
              </p>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground" data-testid="hover-card-not-found">
            Pengguna tidak ditemukan
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
