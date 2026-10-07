// Buy us a coffee: amount checks, Razorpay order creation and signature verification.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseCoffee } from "../src/routes/coffee.js";
import { createOrder, verifyPayment } from "../src/lib/razorpay.js";

test("parseCoffee takes whole rupees between ₹10 and ₹1,00,000", () => {
  assert.equal(parseCoffee({ amount: 49 }).rupees, 49);
  assert.equal(parseCoffee({ amount: "199" }).rupees, 199);
  assert.throws(() => parseCoffee({ amount: 9 }), /smallest coffee is ₹10/);
  assert.throws(() => parseCoffee({ amount: 100_001 }), /largest amount/);
  assert.throws(() => parseCoffee({ amount: 49.5 }), /whole rupees/);
  assert.throws(() => parseCoffee({ amount: 49, email: "nope" }), /email/);
  assert.deepEqual(parseCoffee({ amount: 49, name: "  Kirti  ", email: "K@Example.com", message: " Love it " }), { rupees: 49, name: "Kirti", email: "k@example.com", message: "Love it" });
});

test("only Razorpay's real signature confirms a payment", () => {
  const sig = createHmac("sha256", "secret").update("order_1|pay_1").digest("hex");
  assert.equal(verifyPayment("order_1", "pay_1", sig, "secret"), true);
  assert.equal(verifyPayment("order_1", "pay_2", sig, "secret"), false);
  assert.equal(verifyPayment("order_1", "pay_1", sig, "other"), false);
  assert.equal(verifyPayment("order_1", "pay_1", "", "secret"), false);
});

test("orders are created on Razorpay in paise with basic auth", async () => {
  const realFetch = globalThis.fetch;
  let seen: { url: string; init: RequestInit } | null = null;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url: String(url), init };
    return Response.json({ id: "order_test", amount: 4900, currency: "INR", status: "created" });
  }) as typeof fetch;
  process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
  process.env.RAZORPAY_KEY_SECRET = "s3cret";
  try {
    const order = await createOrder(4900, "coffee_1", { purpose: "test" });
    assert.deepEqual(order, { id: "order_test", amount: 4900, currency: "INR" });
    assert.equal(seen!.url, "https://api.razorpay.com/v1/orders");
    assert.equal((seen!.init.headers as Record<string, string>).authorization, `Basic ${Buffer.from("rzp_test_abc:s3cret").toString("base64")}`);
    assert.equal(JSON.parse(String(seen!.init.body)).amount, 4900);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  }
  await assert.rejects(createOrder(4900, "x", {}), /aren't set up/);
});
