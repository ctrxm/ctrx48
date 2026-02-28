import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PaymentModal } from "@/components/PaymentModal";
import { Link } from "wouter";
import {
  ArrowLeft, AtSign, Crown, Sparkles, Tag, Search, ShoppingCart, Star
} from "lucide-react";

type ReservedUsername = {
  id: string;
  username: string;
  price: number;
  category: string;
  isAvailable: boolean;
  createdAt: string;
};

const CATEGORY_STYLES: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  premium: { label: "Premium", color: "text-purple-500 bg-purple-500/10", icon: Crown },
  brand: { label: "Brand", color: "text-blue-500 bg-blue-500/10", icon: Star },
  short: { label: "Pendek", color: "text-amber-500 bg-amber-500/10", icon: Sparkles },
  rare: { label: "Langka", color: "text-pink-500 bg-pink-500/10", icon: Tag },
};

export default function UsernameMarket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean; invoiceId: string; paymentUrl: string; description: string; amount: number; finalAmount: number;
  }>({ isOpen: false, invoiceId: "", paymentUrl: "", description: "", amount: 0, finalAmount: 0 });

  const { data: usernames, isLoading } = useQuery<ReservedUsername[]>({
    queryKey: ["/api/reserved-usernames"],
  });

  const buyMutation = useMutation({
    mutationFn: async ({ username, reservedId }: { username: string; reservedId: string }) => {
      const res = await apiRequest("POST", "/api/payments/buy-username", { username, reservedId });
      return res.json();
    },
    onSuccess: (data) => {
      setPaymentModal({
        isOpen: true,
        invoiceId: data.invoiceId,
        paymentUrl: data.paymentUrl,
        description: `Beli Username: ${data.payment?.metadata?.targetUsername || ""}`,
        amount: data.payment?.amount || 0,
        finalAmount: data.finalAmount || data.payment?.amount || 0,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const filtered = usernames?.filter(u =>
    u.isAvailable && u.username.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[640px] mx-auto px-4 py-6 mobile-feed-padding">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-primary/20">
            <AtSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Toko Username</h1>
            <p className="text-sm text-muted-foreground">Beli username premium dan eksklusif</p>
          </div>
        </div>

        <Card className="p-4 mb-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/10">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Username Premium</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Beli username unik dan dapatkan efek glow di seluruh forum. Username pendek (≤3 karakter) juga tersedia sebagai premium.
              </p>
            </div>
          </div>
        </Card>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-username"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-usernames">
            <AtSign className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "Tidak ada username yang cocok" : "Belum ada username premium tersedia"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.premium;
              const CatIcon = catStyle.icon;
              return (
                <Card key={item.id} className="p-4" data-testid={`card-username-${item.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <AtSign className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground username-glow" data-testid={`text-username-${item.id}`}>
                            u/{item.username}
                          </span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${catStyle.color} border-0`}>
                            <CatIcon className="w-2.5 h-2.5 mr-0.5" />
                            {catStyle.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rp {item.price.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                    {user ? (
                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={() => buyMutation.mutate({ username: item.username, reservedId: item.id })}
                        disabled={buyMutation.isPending}
                        data-testid={`button-buy-${item.id}`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Beli
                      </Button>
                    ) : (
                      <Link href="/login">
                        <Button size="sm" variant="outline" className="shrink-0" data-testid={`button-login-buy-${item.id}`}>
                          Masuk
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
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
