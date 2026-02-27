import { useState } from "react";
import { Header } from "@/components/Header";
import { PaymentModal } from "@/components/PaymentModal";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle, BadgeCheck, Clock, Zap, Shield, Star } from "lucide-react";
import { Link } from "wouter";

export default function Premium() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    invoiceId: string;
    paymentUrl: string;
    description: string;
    amount: number;
    finalAmount: number;
  }>({ isOpen: false, invoiceId: "", paymentUrl: "", description: "", amount: 0, finalAmount: 0 });
  const [loading, setLoading] = useState<string | null>(null);

  const handlePremium = async () => {
    if (!user) return;
    setLoading("premium");
    try {
      const res = await apiRequest("POST", "/api/payments/premium");
      const data = await res.json();
      setPaymentModal({
        isOpen: true,
        invoiceId: data.invoiceId,
        paymentUrl: data.paymentUrl,
        description: "CTRXL48 Premium 30 Hari",
        amount: 25000,
        finalAmount: data.finalAmount,
      });
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setLoading(null);
  };

  const handleVerified = async () => {
    if (!user) return;
    setLoading("verified");
    try {
      const res = await apiRequest("POST", "/api/payments/verified");
      const data = await res.json();
      setPaymentModal({
        isOpen: true,
        invoiceId: data.invoiceId,
        paymentUrl: data.paymentUrl,
        description: "CTRXL48 Badge Terverifikasi",
        amount: 50000,
        finalAmount: data.finalAmount,
      });
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setLoading(null);
  };

  const isPremium = (user as any)?.isPremium;
  const isVerified = (user as any)?.isVerified;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 mobile-feed-padding">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gradient mb-2" data-testid="text-premium-title">Premium</h1>
          <p className="text-muted-foreground">Tingkatkan pengalaman CTRXL48 kamu</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card rounded-2xl overflow-hidden shadow-lg" data-testid="card-premium">
            <div className="bg-gradient-to-br from-purple-600 to-pink-500 p-6">
              <div className="flex items-center gap-2.5 mb-1">
                <Crown className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Premium</h2>
              </div>
              <p className="text-white/80 text-sm">Rp 25.000 / 30 hari</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3.5 mb-6">
                <li className="flex items-start gap-3 text-sm">
                  <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">Postingan bertahan <strong>7 hari</strong> (bukan 48 jam)</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Star className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">Badge <strong>Premium</strong> di profil & postingan</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">Flair khusus dan prioritas di feed</span>
                </li>
              </ul>

              {isPremium ? (
                <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-3 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Kamu sudah Premium!</span>
                </div>
              ) : (
                <Button
                  className="w-full h-11 gap-2 rounded-xl"
                  onClick={handlePremium}
                  disabled={loading === "premium" || !user}
                  data-testid="button-buy-premium"
                >
                  <Crown className="w-4 h-4" />
                  {loading === "premium" ? "Memproses..." : "Langganan Premium"}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl overflow-hidden shadow-lg" data-testid="card-verified">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-6">
              <div className="flex items-center gap-2.5 mb-1">
                <BadgeCheck className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Terverifikasi</h2>
              </div>
              <p className="text-white/80 text-sm">Rp 50.000 (sekali bayar)</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3.5 mb-6">
                <li className="flex items-start gap-3 text-sm">
                  <BadgeCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">Badge <strong>centang biru</strong> di username</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">Tanda kepercayaan dan kredibilitas</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Star className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">Tampil beda di setiap postingan</span>
                </li>
              </ul>

              {isVerified ? (
                <div className="flex items-center gap-2 text-blue-500 bg-blue-500/10 px-4 py-3 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Kamu sudah Terverifikasi!</span>
                </div>
              ) : (
                <Button
                  className="w-full h-11 gap-2 rounded-xl"
                  variant="outline"
                  onClick={handleVerified}
                  disabled={loading === "verified" || !user}
                  data-testid="button-buy-verified"
                >
                  <BadgeCheck className="w-4 h-4" />
                  {loading === "verified" ? "Memproses..." : "Dapatkan Badge Terverifikasi"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {!user && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-sm mb-3">Kamu harus masuk untuk membeli.</p>
            <Link href="/login">
              <Button variant="outline" className="rounded-xl" data-testid="link-login-premium">Masuk</Button>
            </Link>
          </div>
        )}
      </main>

      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(p => ({ ...p, isOpen: false }))}
        invoiceId={paymentModal.invoiceId}
        paymentUrl={paymentModal.paymentUrl}
        description={paymentModal.description}
        amount={paymentModal.amount}
        finalAmount={paymentModal.finalAmount}
      />
    </div>
  );
}
