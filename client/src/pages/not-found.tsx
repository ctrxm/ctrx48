import { Header } from "@/components/Header";
import { Skull } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Header />
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Skull className="w-16 h-16 text-neutral-800 mb-6" />
        <h1 className="text-lg font-mono font-bold text-neutral-400 tracking-wider mb-2">404</h1>
        <p className="text-sm font-mono text-neutral-600 mb-6">Nothing here. Just the void.</p>
        <Link href="/" data-testid="link-home-404">
          <span className="text-xs font-mono text-red-700 hover:text-red-500 cursor-pointer transition-colors">
            RETURN TO CHAOS
          </span>
        </Link>
      </div>
    </div>
  );
}
