import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShoppingBag, Palette, Pin, Zap, Crown, Sparkles, Star } from "lucide-react";
import type { KarmaShopItem } from "@shared/schema";

const ICON_MAP: Record<string, typeof Palette> = {
  Palette,
  Pin,
  Zap,
  Crown,
  Sparkles,
};

export default function KarmaShop() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<KarmaShopItem[]>({
    queryKey: ["/api/karma-shop/items"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemKey: string) => {
      const res = await apiRequest("POST", "/api/karma-shop/purchase", { itemKey });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Berhasil", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/karma-shop/items"] });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const karma = user?.reputation ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[700px] mx-auto px-4 py-6 mobile-feed-padding">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-karma-shop-title">Toko Karma</h1>
            <p className="text-xs text-muted-foreground">Tukarkan karma dengan item spesial</p>
          </div>
        </div>

        {user && (
          <Card className="p-4 mb-6" data-testid="card-karma-balance">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Karma</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-karma-balance">
                  {karma >= 0 ? "+" : ""}{karma}
                </p>
              </div>
            </div>
          </Card>
        )}

        {!user && (
          <Card className="p-6 text-center mb-6">
            <p className="text-muted-foreground text-sm" data-testid="text-login-prompt">Masuk untuk membeli item dari Toko Karma</p>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(items || []).map((item) => {
              const Icon = ICON_MAP[item.icon] || Sparkles;
              const canAfford = karma >= item.cost;
              return (
                <Card key={item.key} className="p-4 flex flex-col gap-3" data-testid={`card-item-${item.key}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-foreground" data-testid={`text-item-name-${item.key}`}>{item.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-sm font-bold text-yellow-500" data-testid={`text-item-cost-${item.key}`}>
                      {item.cost} karma
                    </span>
                    {user ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            disabled={!canAfford || purchaseMutation.isPending}
                            data-testid={`button-buy-${item.key}`}
                          >
                            {canAfford ? "Beli" : "Karma kurang"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Konfirmasi Pembelian</AlertDialogTitle>
                            <AlertDialogDescription>
                              Beli <strong>{item.name}</strong> seharga <strong>{item.cost} karma</strong>? Saldo kamu akan berkurang.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-purchase">Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => purchaseMutation.mutate(item.key)}
                              data-testid="button-confirm-purchase"
                            >
                              Beli Sekarang
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button size="sm" disabled data-testid={`button-buy-${item.key}`}>
                        Beli
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
