import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, Loader2, QrCode, X } from "lucide-react";

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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="payment-modal">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:mx-4 overflow-hidden animate-slide-up sm:animate-fade-in">
        <div className="bg-gradient-brand p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            data-testid="button-payment-close"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-white font-bold text-lg">Pembayaran QRIS</h2>
          <p className="text-white/80 text-sm mt-0.5">{description}</p>
        </div>

        <div className="p-6">
          {isPaid ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Pembayaran Berhasil!</h3>
              <p className="text-sm text-muted-foreground mb-5">Terima kasih, pembayaran kamu sudah diterima.</p>
              <Button onClick={onClose} className="w-full h-11 rounded-xl" data-testid="button-payment-done">
                Selesai
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-3 bg-muted/50 rounded-xl px-5 py-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Total Bayar</p>
                    <p className="text-xl font-bold text-foreground">Rp {finalAmount.toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Klik tombol di bawah untuk membuka halaman pembayaran QRIS
                </p>
              </div>

              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" data-testid="link-payment-url">
                <Button className="w-full gap-2 mb-3 h-11 rounded-xl" size="lg">
                  <ExternalLink className="w-4 h-4" />
                  Bayar Sekarang
                </Button>
              </a>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Menunggu pembayaran...
              </div>

              <Button variant="ghost" onClick={onClose} className="w-full mt-2 text-xs rounded-xl" data-testid="button-payment-cancel">
                Batal
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
