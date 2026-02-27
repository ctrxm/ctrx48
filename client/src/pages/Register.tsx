import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, AlertCircle, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Link } from "wouter";

type Step = "email" | "otp" | "account";

export default function Register() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Email wajib diisi");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/send-otp", { email });
      setOtpSent(true);
      setStep("otp");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Gagal mengirim kode OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (step === "otp") {
      if (!otpCode || otpCode.length < 4) {
        setError("Masukkan kode verifikasi yang valid");
        return;
      }
      setLoading(true);
      try {
        await apiRequest("POST", "/api/auth/verify-otp", { email, code: otpCode });
        setStep("account");
      } catch (err: any) {
        setError(err.message?.replace(/^\d+:\s*/, "") || "Kode verifikasi tidak valid");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (username.length < 3) {
      setError("Nama pengguna minimal 3 karakter");
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
      await apiRequest("POST", "/api/auth/register-email", {
        email,
        code: otpCode,
        username,
        password,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/send-otp", { email });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Gagal mengirim ulang kode");
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
              <p className="text-sm text-muted-foreground mt-1">
                {step === "email" && "Masukkan email untuk verifikasi"}
                {step === "otp" && "Masukkan kode verifikasi dari email"}
                {step === "account" && "Lengkapi data akunmu"}
              </p>
            </div>

            <div className="flex items-center gap-2 mb-5">
              {["email", "otp", "account"].map((s, i) => (
                <div key={s} className="flex-1 flex items-center gap-1">
                  <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                    ["email", "otp", "account"].indexOf(step) >= i
                      ? "bg-primary"
                      : "bg-muted"
                  }`} />
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive mb-4" data-testid="text-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {step === "email" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
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
                  <p className="text-[11px] text-muted-foreground">Kami akan mengirim kode verifikasi ke email ini</p>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-10"
                  data-testid="button-send-otp"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengirim...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Kirim Kode Verifikasi
                    </span>
                  )}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                {otpSent && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 dark:text-green-400" data-testid="text-otp-sent">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Kode verifikasi dikirim ke {email}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm">Kode Verifikasi</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Masukkan kode 6 digit"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-10 text-center tracking-widest text-lg font-mono"
                    autoComplete="one-time-code"
                    data-testid="input-otp"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !otpCode || otpCode.length < 4}
                  className="w-full h-10"
                  data-testid="button-verify-otp"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memverifikasi...
                    </span>
                  ) : "Verifikasi & Lanjutkan"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                    data-testid="button-resend-otp"
                  >
                    {loading ? "Mengirim ulang..." : "Kirim ulang kode"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(""); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Ganti email
                </button>
              </form>
            )}

            {step === "account" && (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Email: <strong>{email}</strong></span>
                </div>
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
                  disabled={loading || !username || !password || !confirmPassword}
                  className="w-full h-10"
                  data-testid="button-register"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Membuat akun...
                    </span>
                  ) : "Daftar"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("otp"); setError(""); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Kembali
                </button>
              </form>
            )}

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
