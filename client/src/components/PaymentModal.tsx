import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, Loader2, QrCode } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  paymentUrl: string;
  description: string;
  amount: number;
  finalAmount: number;
}

export function PaymentModal({ isOpen, onClose, invoiceId, paymentUrl, description, amount, finalAmount }: PaymentModalProps) {
  const [isPaid, setIsPaid] = useState(false);

  const { data } = useQuery<{ status: string }>({
    queryKey: ["/api/payments/check", invoiceId],
    enabled: isOpen && !isPaid && !!invoiceId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data?.status === "paid") {
      setIsPaid(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/history"] });
    }
  }, [data]);

  useEffect(() => {
    if (!isOpen) {
      setIsPaid(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="payment-modal">
      <div className="bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-brand p-4">
          <h2 className="text-white font-bold text-lg">Pembayaran QRIS</h2>
          <p className="text-white/80 text-sm">{description}</p>
        </div>

        <div className="p-6">
          {isPaid ? (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">Pembayaran Berhasil!</h3>
              <p className="text-sm text-muted-foreground mb-4">Terima kasih, pembayaran kamu sudah diterima.</p>
              <Button onClick={onClose} className="w-full" data-testid="button-payment-done">
                Selesai
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-accent/50 rounded-lg px-4 py-3 mb-3">
                  <QrCode className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Total Bayar</p>
                    <p className="text-lg font-bold text-foreground">Rp {finalAmount.toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Klik tombol di bawah untuk membuka halaman pembayaran QRIS
                </p>
              </div>

              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" data-testid="link-payment-url">
                <Button className="w-full gap-2 mb-3" size="lg">
                  <ExternalLink className="w-4 h-4" />
                  Bayar Sekarang
                </Button>
              </a>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Menunggu pembayaran...
              </div>

              <Button variant="ghost" onClick={onClose} className="w-full mt-3 text-xs" data-testid="button-payment-cancel">
                Batal
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
