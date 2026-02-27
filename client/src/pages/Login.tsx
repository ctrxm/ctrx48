import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skull, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Header />
      <main className="max-w-sm mx-auto px-4 pt-24">
        <div className="text-center mb-8">
          <Skull className="w-10 h-10 text-red-800 mx-auto mb-4" />
          <h1 className="text-lg font-mono font-bold text-neutral-200 tracking-wider">
            {isRegister ? "JOIN THE RITUAL" : "ENTER"}
          </h1>
          <p className="text-[11px] font-mono text-neutral-600 mt-2">
            {isRegister ? "Choose your identity. No going back." : "Welcome back to the chaos."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-red-950/30 border border-red-900/30 text-xs font-mono text-red-400" data-testid="text-error">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <Input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-10 bg-[#111111] border-neutral-800 text-neutral-200 placeholder:text-neutral-600 font-mono text-sm focus:border-red-900/50 focus:ring-0"
            autoComplete="username"
            data-testid="input-username"
          />
          <Input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 bg-[#111111] border-neutral-800 text-neutral-200 placeholder:text-neutral-600 font-mono text-sm focus:border-red-900/50 focus:ring-0"
            autoComplete="current-password"
            data-testid="input-password"
          />

          <Button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-10 bg-red-900/50 hover:bg-red-900/70 border border-red-800/40 text-red-100 font-mono text-sm tracking-wider disabled:opacity-30"
            data-testid="button-submit"
          >
            {loading ? "..." : isRegister ? "CREATE IDENTITY" : "ENTER"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            className="text-[11px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors"
            data-testid="button-toggle-auth"
          >
            {isRegister ? "Already have an identity? Enter." : "New here? Create an identity."}
          </button>
        </div>
      </main>
    </div>
  );
}
