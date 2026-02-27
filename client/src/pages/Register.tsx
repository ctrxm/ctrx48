import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (username.length < 3) {
      setError("Nama pengguna minimal 3 karakter");
      return;
    }
    if (!email) {
      setError("Email wajib diisi");
      return;
    }
    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter");
      return;
    }
    if (password !== confirmPassword) {
      setError("Kata sandi tidak cocok");
      return;
    }
    setLoading(true);
    try {
      await register(username, password, email);
      setLocation("/");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Pendaftaran gagal");
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
              <h1 className="text-xl font-bold text-foreground">Buat Akun</h1>
              <p className="text-sm text-muted-foreground mt-1">Bergabung dengan CTRXL48. Pilih dengan bijak.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive mb-4" data-testid="text-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm">Nama Pengguna</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Pilih nama pengguna"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10"
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10"
                  autoComplete="new-password"
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm">Konfirmasi Kata Sandi</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10"
                  autoComplete="new-password"
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !username || !email || !password || !confirmPassword}
                className="w-full h-10"
                data-testid="button-register"
              >
                {loading ? "Membuat akun..." : "Daftar"}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/login" data-testid="link-login">
                  <span className="text-primary hover:underline cursor-pointer font-medium">
                    Masuk
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
