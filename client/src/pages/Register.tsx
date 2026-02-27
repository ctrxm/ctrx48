import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, AlertCircle, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Step = "method" | "email" | "otp" | "details" | "simple";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("method");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleSimpleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(username, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    if (!email) {
      setError("Enter your email");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/send-otp", { email });
      setOtpSent(true);
      setStep("otp");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register-email", {
        username,
        password,
        email,
        code: otpCode,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Registration failed");
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
              <h1 className="text-xl font-bold text-foreground">Create Account</h1>
              <p className="text-sm text-muted-foreground mt-1">Join CTRXL48. Choose wisely.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive mb-4" data-testid="text-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {step === "method" && (
              <div className="space-y-3">
                <Button
                  className="w-full h-11 gap-2"
                  onClick={() => setStep("email")}
                  data-testid="button-email-signup"
                >
                  <Mail className="w-4 h-4" />
                  Sign Up with Email
                </Button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">or</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => setStep("simple")}
                  data-testid="button-simple-signup"
                >
                  Quick Sign Up (no email)
                </Button>
              </div>
            )}

            {step === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                    data-testid="input-email"
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={loading || !email}
                  className="w-full h-10 gap-2"
                  data-testid="button-send-otp"
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => { setStep("method"); setError(""); }}
                >
                  Back
                </Button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-primary">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Code sent to {email}</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Verification Code</Label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-10 text-center text-lg tracking-widest font-mono"
                    maxLength={6}
                    data-testid="input-otp"
                  />
                </div>
                <Button
                  onClick={() => { if (otpCode.length === 6) setStep("details"); }}
                  disabled={otpCode.length !== 6}
                  className="w-full h-10 gap-2"
                  data-testid="button-verify-otp"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <button
                  onClick={handleSendOtp}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  Didn't receive it? Resend code
                </button>
              </div>
            )}

            {step === "details" && (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Username</Label>
                  <Input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-10"
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Password</Label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                    autoComplete="new-password"
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
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
                  data-testid="button-submit"
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            )}

            {step === "simple" && (
              <form onSubmit={handleSimpleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Username</Label>
                  <Input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-10"
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Password</Label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                    autoComplete="new-password"
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
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
                  data-testid="button-submit"
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => { setStep("method"); setError(""); }}
                >
                  Back
                </Button>
              </form>
            )}

            <div className="mt-5 pt-5 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" data-testid="link-login">
                  <span className="text-primary hover:underline cursor-pointer font-medium">
                    Log In
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
