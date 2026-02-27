import { Header } from "@/components/Header";
import { Flame } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Flame className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-sm text-muted-foreground mb-6">This page doesn't exist or has already expired.</p>
        <Link href="/" data-testid="link-home-404">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
