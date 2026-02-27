import { Header } from "@/components/Header";
import { Flame } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center py-32 text-center px-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mb-6 shadow-lg shadow-primary/25 animate-float">
          <Flame className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gradient mb-2">404</h1>
        <p className="text-sm text-muted-foreground mb-6">Halaman ini tidak ada atau sudah kedaluwarsa.</p>
        <Link href="/" data-testid="link-home-404">
          <Button>Kembali ke Beranda</Button>
        </Link>
      </div>
    </div>
  );
}
