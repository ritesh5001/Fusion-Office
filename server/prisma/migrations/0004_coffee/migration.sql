-- "Buy us a coffee" payments (Razorpay).
CREATE TABLE "Coffee" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "name" TEXT,
    "email" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Coffee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coffee_orderId_key" ON "Coffee"("orderId");
CREATE UNIQUE INDEX "Coffee_paymentId_key" ON "Coffee"("paymentId");
CREATE INDEX "Coffee_status_createdAt_idx" ON "Coffee"("status", "createdAt");
