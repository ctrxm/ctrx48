const BAYAR_API_BASE = "https://bayar.gg/api";
const BAYAR_API_KEY = process.env.BAYAR_API_KEY;

export interface BayarPaymentResult {
  invoice_id: string;
  amount: number;
  unique_code: number;
  final_amount: number;
  payment_url: string;
  expires_at: string;
  status: string;
  payment_method: string;
}

export interface BayarCheckResult {
  invoice_id: string;
  status: string;
  amount: string;
  final_amount: string;
  paid_at: string | null;
  paid_reff_num: string | null;
  expires_at: string;
}

export async function createBayarPayment(
  amount: number,
  description: string,
  callbackUrl?: string
): Promise<BayarPaymentResult> {
  if (!BAYAR_API_KEY) {
    throw new Error("BAYAR_API_KEY not configured");
  }

  const body: any = {
    amount,
    description,
    payment_method: "gopay_qris",
  };

  if (callbackUrl) {
    body.callback_url = callbackUrl;
  }

  const res = await fetch(`${BAYAR_API_BASE}/create-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": BAYAR_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to create payment");
  }

  return data.data;
}

export async function checkBayarPayment(invoiceId: string): Promise<BayarCheckResult> {
  if (!BAYAR_API_KEY) {
    throw new Error("BAYAR_API_KEY not configured");
  }

  const res = await fetch(
    `${BAYAR_API_BASE}/check-payment?invoice=${encodeURIComponent(invoiceId)}`,
    {
      headers: {
        "X-API-Key": BAYAR_API_KEY,
      },
    }
  );

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to check payment");
  }

  return data;
}
