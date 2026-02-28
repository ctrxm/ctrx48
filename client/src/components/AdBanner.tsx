import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import type { Ad } from "@shared/schema";

type AdBannerProps = {
  placement: "feed" | "header" | "post_detail";
  className?: string;
};

export function AdBanner({ placement, className = "" }: AdBannerProps) {
  const { data: ads } = useQuery<Ad[]>({
    queryKey: ["/api/ads?placement=" + placement],
    staleTime: 60000,
  });

  if (!ads || ads.length === 0) return null;

  const ad = ads[Math.floor(Math.random() * ads.length)];

  if (placement === "header") {
    return (
      <a
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full bg-card rounded-xl overflow-hidden hover:opacity-90 transition-opacity ${className}`}
        data-testid={`ad-banner-header-${ad.id}`}
      >
        <div className="relative">
          <img src={ad.imageUrl} alt={ad.title} className="w-full h-20 sm:h-24 object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex items-end justify-between">
            <p className="text-xs font-medium text-white truncate">{ad.title}</p>
            <span className="shrink-0 text-[8px] font-semibold text-white/70 bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Iklan
            </span>
          </div>
        </div>
      </a>
    );
  }

  if (placement === "feed") {
    return (
      <a
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block bg-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/20 transition-colors ${className}`}
        data-testid={`ad-banner-feed-${ad.id}`}
      >
        <div className="flex items-center gap-3 p-3">
          <img src={ad.imageUrl} alt={ad.title} className="w-20 h-14 object-cover rounded-lg shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[8px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Iklan
              </span>
            </div>
            <p className="text-sm font-medium text-foreground line-clamp-1">{ad.title}</p>
            <p className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
              <ExternalLink className="w-2.5 h-2.5" />
              Selengkapnya
            </p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={ad.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/20 transition-colors ${className}`}
      data-testid={`ad-banner-detail-${ad.id}`}
    >
      <img src={ad.imageUrl} alt={ad.title} className="w-full h-28 object-cover" />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground line-clamp-1">{ad.title}</p>
          <span className="shrink-0 text-[8px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Iklan
          </span>
        </div>
      </div>
    </a>
  );
}
