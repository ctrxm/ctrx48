import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import {
  Flame, LogOut, Shield, Plus, Search, Menu, X, User,
  ChevronDown, Bell, Moon, Sun, Home, TrendingUp, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border/50" data-testid="header">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-3">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2 cursor-pointer shrink-0 group">
            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base hidden sm:inline tracking-tight text-gradient">
              CTRXL48
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          <Link href="/" data-testid="nav-home">
            <Button variant={location === "/" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs gap-1.5">
              <Home className="w-3.5 h-3.5" />
              Beranda
            </Button>
          </Link>
          <Link href="/trending" data-testid="nav-trending">
            <Button variant={location === "/trending" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Trending
            </Button>
          </Link>
          <Link href="/groups" data-testid="nav-groups">
            <Button variant={location === "/groups" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Grup
            </Button>
          </Link>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={toggleDarkMode}
            data-testid="button-theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {user ? (
            <>
              <Link href="/new" data-testid="link-new-post">
                <Button size="sm" className="h-8 gap-1.5 text-xs hidden sm:flex">
                  <Plus className="w-3.5 h-3.5" />
                  Buat Postingan
                </Button>
                <Button size="sm" className="h-8 w-8 p-0 sm:hidden">
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs px-2" data-testid="button-user-menu">
                    {(user as any).avatarUrl ? (
                      <img src={(user as any).avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold uppercase">
                        {user.username[0]}
                      </div>
                    )}
                    <span className="hidden sm:inline text-foreground max-w-[100px] truncate">{user.username}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.reputation >= 0 ? "+" : ""}{user.reputation} karma
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation(`/u/${user.username}`)} data-testid="menu-profile">
                    <User className="w-4 h-4 mr-2" />
                    Profil Saya
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => setLocation("/admin")} data-testid="menu-admin">
                      <Shield className="w-4 h-4 mr-2" />
                      Panel Admin
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
            <div className="flex items-center gap-2">
              <Link href="/login" data-testid="link-login">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Masuk
                </Button>
              </Link>
              <Link href="/register" data-testid="link-register">
                <Button size="sm" className="h-8 text-xs">
                  Daftar
                </Button>
              </Link>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card p-3 space-y-1">
          <Link href="/" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start h-10 text-sm gap-2">
              <Home className="w-4 h-4" />
              Beranda
            </Button>
          </Link>
          <Link href="/trending" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start h-10 text-sm gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </Button>
          </Link>
          <Link href="/groups" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start h-10 text-sm gap-2">
              <Users className="w-4 h-4" />
              Grup
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}
