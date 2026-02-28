import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut, Shield, Plus, User, ChevronDown, Bell, Moon, Sun,
  Home, TrendingUp, Users, Bookmark, Crown, Flame, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import logoIcon from "@assets/logo-icon.png";

export function Header() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const [chaosMode, setChaosMode] = useState(() =>
    document.documentElement.classList.contains("chaos")
  );

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };

  const toggleChaosMode = () => {
    const next = !chaosMode;
    setChaosMode(next);
    if (next) {
      document.documentElement.classList.add("chaos");
    } else {
      document.documentElement.classList.remove("chaos");
    }
    localStorage.setItem("chaosMode", next ? "on" : "off");
  };

  const canUseChaos = user && ((user.reputation ?? 0) >= 100 || (user as any).isPremium);

  const unreadCount = notifCount?.count ?? 0;

  const desktopNavItems = [
    { href: "/", label: "Beranda", icon: Home, active: location === "/" || location === "/trending" },
    { href: "/groups", label: "Grup", icon: Users, active: location.startsWith("/groups") },
    { href: "/leaderboard", label: "Peringkat", icon: Trophy, active: location === "/leaderboard" },
    ...(user ? [{ href: "/bookmarks", label: "Tersimpan", icon: Bookmark, active: location === "/bookmarks" }] : []),
    ...(user ? [{
      href: "/notifications", label: "Notifikasi", icon: Bell, active: location === "/notifications",
      badge: unreadCount
    }] : []),
  ];

  const mobileBottomTabs = [
    { href: "/", label: "Beranda", icon: Home, active: location === "/" || location === "/trending" },
    { href: "/trending", label: "Trending", icon: TrendingUp, active: location === "/trending" },
    { href: "/new", label: "Buat", icon: Plus, active: location === "/new", isCreate: true },
    { href: "/leaderboard", label: "Peringkat", icon: Trophy, active: location === "/leaderboard" },
    ...(user
      ? [{ href: `/u/${user.username}`, label: "Profil", icon: User, active: location.startsWith("/u/") }]
      : [{ href: "/login", label: "Masuk", icon: User, active: location === "/login" }]
    ),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50" data-testid="header">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2.5 cursor-pointer shrink-0">
              <img src={logoIcon} alt="CTRXL48" className="w-7 h-7 object-contain" data-testid="img-logo" />
              <span className="font-extrabold text-lg hidden sm:inline tracking-tight text-gradient">
                CTRXL48
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {desktopNavItems.map((item) => (
              <Link key={item.href} href={item.href} data-testid={`nav-${item.label.toLowerCase()}`}>
                <Button
                  variant={item.active ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-sm relative"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {"badge" in item && (item as any).badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1" data-testid="badge-notif-count-desktop">
                      {(item as any).badge > 9 ? "9+" : (item as any).badge}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <>
                <Link href="/notifications" className="md:hidden" data-testid="link-notifications-mobile">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1" data-testid="badge-notif-count">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>

                <Link href="/new" className="hidden md:inline-flex" data-testid="link-new-post">
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Buat Postingan
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 px-2" data-testid="button-user-menu">
                      {(user as any).avatarUrl ? (
                        <img src={(user as any).avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold uppercase">
                          {user.username[0]}
                        </div>
                      )}
                      <span className="hidden sm:inline text-foreground max-w-[100px] truncate text-sm">{user.username}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold">{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.reputation >= 0 ? "+" : ""}{user.reputation} karma
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation(`/u/${user.username}`)} data-testid="menu-profile">
                      <User className="w-4 h-4 mr-2" />
                      Profil Saya
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/bookmarks")} data-testid="menu-bookmarks">
                      <Bookmark className="w-4 h-4 mr-2" />
                      Tersimpan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/premium")} data-testid="menu-premium">
                      <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                      Premium
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem onClick={() => setLocation("/admin")} data-testid="menu-admin">
                        <Shield className="w-4 h-4 mr-2" />
                        Panel Admin
                      </DropdownMenuItem>
                    )}
                    {canUseChaos && (
                      <DropdownMenuItem onClick={toggleChaosMode} data-testid="menu-chaos">
                        <Flame className="w-4 h-4 mr-2 text-red-500" />
                        {chaosMode ? "Matikan Chaos" : "Mode Chaos"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" data-testid="link-login">
                  <Button variant="ghost" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register" data-testid="link-register">
                  <Button size="sm">
                    Daftar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom" data-testid="bottom-nav">
        <div className="flex items-center justify-around h-14 px-2">
          {mobileBottomTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}>
                <button className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-1" data-testid={`button-bottom-nav-${tab.label.toLowerCase()}`}>
                  {tab.isCreate ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center -mt-4 shadow-lg">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <Icon className={`w-5 h-5 ${tab.active ? "text-foreground" : "text-muted-foreground"}`} />
                  )}
                  <span className={`text-[10px] leading-tight ${tab.isCreate ? "mt-0.5" : ""} ${tab.active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {tab.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
