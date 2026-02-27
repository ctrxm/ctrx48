import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Shield, Users, AlertTriangle, Plus } from "lucide-react";

export function SidebarWidget() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="bg-gradient-brand h-8 animate-gradient" />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground tracking-tight">CTRXL48</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Forum di mana postingan akan hancur sendiri dalam 48 jam.
            Vote punya konsekuensi. Tidak bisa diedit. Tanpa ampun.
          </p>

          <div className="grid grid-cols-2 gap-3 text-center mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Kedaluwarsa</p>
              <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                48 jam
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aturan</p>
              <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Tanpa Edit
              </p>
            </div>
          </div>

          {user ? (
            <Link href="/new" data-testid="sidebar-create-post">
              <Button className="w-full h-9 text-sm gap-1.5">
                <Plus className="w-4 h-4" />
                Buat Postingan
              </Button>
            </Link>
          ) : (
            <Link href="/login" data-testid="sidebar-login">
              <Button className="w-full h-9 text-sm">
                Gabung CTRXL48
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Aturan Forum
        </h3>
        <ol className="space-y-2 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary font-bold">1.</span>
            Postingan kedaluwarsa setelah 48 jam
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">2.</span>
            Tidak bisa mengedit postingan atau komentar
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">3.</span>
            Skor di bawah -50 akan disembunyikan
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">4.</span>
            Skor di bawah -500 akan dikunci otomatis
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">5.</span>
            Reputasi di bawah -300 = Musuh Publik
          </li>
        </ol>
      </div>
    </div>
  );
}
