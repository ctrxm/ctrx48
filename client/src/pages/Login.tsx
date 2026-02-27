import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-4 pt-12 sm:pt-20">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-card-border rounded-xl p-6 sm:p-8 animate-fade-in hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/25 animate-float">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">Log in to CTRXL48</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive" data-testid="text-error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10"
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10"
                  autoComplete="current-password"
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full h-10"
                data-testid="button-submit"
              >
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                New to CTRXL48?{" "}
                <Link href="/register" data-testid="link-register">
                  <span className="text-primary hover:underline cursor-pointer font-medium">
                    Sign Up
                  </span>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
