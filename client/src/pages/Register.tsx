import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, ArrowLeft, Loader2, CheckCircle, Lock, User } from "lucide-react";
import { Link } from "wouter";

type Step = "email" | "otp" | "account";

const STEPS: Step[] = ["email", "otp", "account"];

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

  const currentStepIndex = STEPS.indexOf(step);

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="bg-card rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gradient tracking-tight" data-testid="text-logo">
              CTRXL48
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {step === "email" && "Masukkan email untuk verifikasi"}
              {step === "otp" && "Masukkan kode verifikasi dari email"}
              {step === "account" && "Lengkapi data akunmu"}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6" data-testid="progress-steps">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i <= currentStepIndex
                    ? "bg-primary scale-110"
                    : "bg-muted"
                }`}
                data-testid={`step-dot-${s}`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md text-sm text-destructive mb-4" data-testid="text-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@contoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    data-testid="input-email"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Kami akan mengirim kode verifikasi ke email ini</p>
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full"
                data-testid="button-send-otp"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </span>
                ) : "Kirim Kode Verifikasi"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              {otpSent && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-md text-sm text-green-600 dark:text-green-400" data-testid="text-otp-sent">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Kode verifikasi dikirim ke {email}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">Kode Verifikasi</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Masukkan kode 6 digit"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center tracking-widest text-lg font-mono"
                  autoComplete="one-time-code"
                  data-testid="input-otp"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !otpCode || otpCode.length < 4}
                className="w-full"
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
                data-testid="button-back-email"
              >
                <ArrowLeft className="w-3 h-3" />
                Ganti email
              </button>
            </form>
          )}

          {step === "account" && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-md text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Email: <strong>{email}</strong></span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Nama Pengguna</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Pilih nama pengguna"
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
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="new-password"
                    data-testid="input-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Konfirmasi Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ulangi kata sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="new-password"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !username || !password || !confirmPassword}
                className="w-full"
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
                data-testid="button-back-otp"
              >
                <ArrowLeft className="w-3 h-3" />
                Kembali
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border text-center">
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
    </div>
  );
}
