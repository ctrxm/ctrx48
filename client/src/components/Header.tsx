import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Skull, LogOut, Shield, Plus, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  return (
    <header className="border-b border-neutral-800/60 bg-[#0a0a0a] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2 cursor-pointer group">
            <Skull className="w-5 h-5 text-red-700 group-hover:text-red-500 transition-colors" />
            <span className="font-mono text-sm font-bold tracking-widest text-neutral-300 group-hover:text-white transition-colors">
              RITUAL48
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/new" data-testid="link-new-post">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-neutral-700 bg-transparent hover:bg-red-950/30 hover:border-red-800/50 text-neutral-400 hover:text-red-400 text-xs font-mono"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  POST
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-neutral-500">{user.username}</span>
                <span className={`tabular-nums ${user.reputation < 0 ? "text-red-500" : "text-neutral-600"}`}>
                  [{user.reputation}]
                </span>
              </div>
              {user.role === "admin" && (
                <Link href="/admin" data-testid="link-admin">
                  <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-red-400 hover:bg-red-950/20">
                    <Shield className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-neutral-500 hover:text-red-400 hover:bg-red-950/20"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Link href="/login" data-testid="link-login">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-neutral-700 bg-transparent hover:bg-red-950/30 hover:border-red-800/50 text-neutral-400 hover:text-red-400 text-xs font-mono"
              >
                ENTER
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
