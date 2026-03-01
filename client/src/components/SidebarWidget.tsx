import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Clock, Shield, Users, AlertTriangle, Plus, Crown, ExternalLink, TrendingUp, Hash } from "lucide-react";
import type { Ad } from "@shared/schema";
import logoIcon from "@assets/logo-icon.png";

export function SidebarWidget() {
  const { user } = useAuth();
  const { data: adsList } = useQuery<Ad[]>({
    queryKey: ["/api/ads?placement=sidebar"],
    staleTime: 60000,
  });

  const { data: trendingTags } = useQuery<{ tag: string; count: number }[]>({
    queryKey: ["/api/tags/trending"],
    staleTime: 60000,
  });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl overflow-hidden">
        <div className="bg-gradient-brand p-4 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <img src={logoIcon} alt="CTRXL48" className="w-7 h-7 object-contain" data-testid="img-sidebar-logo" />
            <h2 className="text-lg font-bold text-white tracking-tight" data-testid="text-sidebar-brand">CTRXL48</h2>
          </div>
          <p className="text-xs text-white/75 mt-1 leading-relaxed">
            Forum di mana postingan akan hancur sendiri dalam 48 jam.
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Vote punya konsekuensi. Tidak bisa diedit. Tanpa ampun.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-semibold text-foreground">48 jam</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Kedaluwarsa</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <AlertTriangle className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-semibold text-foreground">Tanpa Edit</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Aturan</p>
            </div>
          </div>

          {user ? (
            <div className="space-y-2">
              <Link href="/new" data-testid="sidebar-create-post">
                <Button className="w-full text-sm gap-1.5">
                  <Plus className="w-4 h-4" />
                  Buat Postingan
                </Button>
              </Link>
              <Link href="/premium" data-testid="sidebar-premium">
                <Button variant="outline" className="w-full text-sm gap-1.5">
                  <Crown className="w-4 h-4" />
                  Jadi Premium
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/login" data-testid="sidebar-login">
              <Button className="w-full text-sm">
                Masuk ke CTRXL48
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Aturan Forum
        </h3>
        <ol className="space-y-2.5 text-xs text-muted-foreground">
          <li className="flex gap-2.5 items-start">
            <span className="text-primary font-bold shrink-0">1.</span>
            <span>Postingan kedaluwarsa setelah 48 jam</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span className="text-primary font-bold shrink-0">2.</span>
            <span>Tidak bisa mengedit postingan atau komentar</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span className="text-primary font-bold shrink-0">3.</span>
            <span>Skor di bawah -50 akan disembunyikan</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span className="text-primary font-bold shrink-0">4.</span>
            <span>Skor di bawah -500 akan dikunci otomatis</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span className="text-primary font-bold shrink-0">5.</span>
            <span>Reputasi di bawah -300 = Musuh Publik</span>
          </li>
        </ol>
      </div>

      {trendingTags && trendingTags.length > 0 && (
        <div className="bg-card rounded-xl p-4" data-testid="sidebar-trending">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Trending
          </h3>
          <div className="space-y-2">
            {trendingTags.slice(0, 5).map((item, index) => (
              <Link
                key={item.tag}
                href="/tags"
                className="flex items-center gap-2.5 group hover-elevate rounded-md px-2 py-1.5 -mx-2"
                data-testid={`trending-tag-${index}`}
              >
                <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-sm text-foreground truncate">{item.tag}</span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{item.count} post</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {adsList && adsList.length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden" data-testid="sidebar-ads">
          {adsList.map((ad) => (
            <a
              key={ad.id}
              href={ad.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover-elevate"
              data-testid={`ad-${ad.id}`}
            >
              <img src={ad.imageUrl} alt={ad.title} className="w-full h-32 object-cover" />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{ad.title}</p>
                  <span className="shrink-0 text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Iklan
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
