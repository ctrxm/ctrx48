import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Lock, User } from "lucide-react";
import { Link } from "wouter";
import logoIcon from "@assets/logo-icon.png";

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
      setError(err.message?.replace(/^\d+:\s*/, "") || "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="bg-card rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <img src={logoIcon} alt="CTRXL48" className="w-12 h-12 object-contain mx-auto mb-3" data-testid="img-login-logo" />
            <h1 className="text-2xl font-extrabold text-gradient tracking-tight" data-testid="text-logo">
              CTRXL48
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Masuk ke akunmu</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md text-sm text-destructive" data-testid="text-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Nama Pengguna</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan nama pengguna"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Kata Sandi</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full"
              data-testid="button-submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sedang masuk...
                </span>
              ) : "Masuk"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link href="/register" data-testid="link-register">
                <span className="text-primary hover:underline cursor-pointer font-medium">
                  Daftar
                </span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
