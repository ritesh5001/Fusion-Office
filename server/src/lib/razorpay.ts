import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";

/**
 * Razorpay for "Buy us a coffee". On when RAZORPAY_KEY_ID and
 * RAZORPAY_KEY_SECRET are set (test keys start rzp_test_, live keys rzp_live_).
 * The server decides the amount when it creates the order, and a payment only
 * counts once Razorpay's signature for it checks out.
 */
const API = "https://api.razorpay.com/v1";

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID?.trim() || null;
const secret = () => process.env.RAZORPAY_KEY_SECRET?.trim() || null;
export const razorpayEnabled = () => !!(razorpayKeyId() && secret());

/** Whole rupees people can give: ₹49 suggested, anything from ₹10 to ₹1,00,000. */
export const COFFEE = { suggested: 49, min: 10, max: 100_000 } as const;

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Creates an order for `amountPaise` (₹1 = 100 paise). */
export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<RazorpayOrder> {
  if (!razorpayEnabled()) throw new HttpError(503, "Payments aren't set up on this server yet.");
  const auth = Buffer.from(`${razorpayKeyId()}:${secret()}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "Couldn't reach Razorpay. Please try again.");
  }
  if (!res.ok) {
    console.error("[razorpay] order failed", res.status, (await res.text()).slice(0, 300));
    throw new HttpError(502, "Razorpay couldn't start the payment. Please try again.");
  }
  const order = (await res.json()) as RazorpayOrder;
  return { id: order.id, amount: order.amount, currency: order.currency };
}

/** Razorpay's checkout signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyPayment(orderId: string, paymentId: string, signature: string, key = secret()): boolean {
  if (!key || !orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", key).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
