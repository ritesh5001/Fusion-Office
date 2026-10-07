import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dbEnabled, prisma } from "../lib/db.js";
import { HttpError } from "../lib/http.js";
import { coffeeThanks, sendMail } from "../lib/mail.js";
import { COFFEE, createOrder, razorpayKeyId, verifyPayment } from "../lib/razorpay.js";

/**
 * "Buy us a coffee": create a Razorpay order for the amount someone chose,
 * then confirm the payment with Razorpay's signature. Rate limits, the origin
 * check and the human check are in app.ts.
 */
export const coffee = Router();

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "") || null;

/** Validates what someone typed. Whole rupees only. */
export function parseCoffee(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const rupees = Number(b.amount);
  if (!Number.isInteger(rupees)) throw new HttpError(400, "Please enter the amount in whole rupees.");
  if (rupees < COFFEE.min) throw new HttpError(400, `The smallest coffee is ₹${COFFEE.min}.`);
  if (rupees > COFFEE.max) throw new HttpError(400, `The largest amount is ₹${COFFEE.max.toLocaleString("en-IN")}.`);
  const email = text(b.email, 254)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) throw new HttpError(400, "That email address doesn't look right.");
  return { rupees, name: text(b.name, 80), email, message: typeof b.message === "string" ? b.message.trim().slice(0, 500) || null : null };
}

coffee.post("/order", async (req, res, next) => {
  try {
    if (!dbEnabled) throw new HttpError(503, "Payments aren't available right now.");
    const c = parseCoffee(req.body);
    const order = await createOrder(c.rupees * 100, `coffee_${randomUUID().slice(0, 18)}`, { purpose: "Buy us a coffee", ...(c.name ? { name: c.name } : {}) });
    await prisma.coffee.create({ data: { orderId: order.id, amount: order.amount, currency: order.currency, name: c.name, email: c.email, message: c.message } });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpayKeyId() });
  } catch (err) {
    next(err);
  }
});

coffee.post("/verify", async (req, res, next) => {
  try {
    if (!dbEnabled) throw new HttpError(503, "Payments aren't available right now.");
    const b = (req.body ?? {}) as Record<string, unknown>;
    const orderId = typeof b.orderId === "string" ? b.orderId : "";
    const paymentId = typeof b.paymentId === "string" ? b.paymentId : "";
    const signature = typeof b.signature === "string" ? b.signature : "";
    if (!verifyPayment(orderId, paymentId, signature)) throw new HttpError(400, "We couldn't confirm this payment. If money left your account, Razorpay refunds it automatically.");
    const row = await prisma.coffee.findUnique({ where: { orderId } });
    if (!row) throw new HttpError(404, "Payment not found.");
    // Verifying twice (a retry) is fine; only the first marks it paid and sends the email.
    if (row.status !== "paid") {
      await prisma.coffee.update({ where: { orderId }, data: { status: "paid", paymentId, paidAt: new Date() } });
      if (row.email) void sendMail(coffeeThanks(row.name, row.email, row.amount / 100, paymentId));
    }
    res.json({ ok: true, amount: row.amount, name: row.name });
  } catch (err) {
    next(err);
  }
});
