-- Carteira do organizador + taxa de serviço da plataforma.
--
-- Modelo: todo pagamento online cai na conta da plataforma; o valor da
-- inscrição vira crédito no razão do organizador e a taxa fica com a
-- plataforma. O organizador resgata o saldo via PayoutRequest.

-- Status possíveis de um pedido de resgate.
CREATE TYPE "PayoutStatus" AS ENUM ('requested', 'processing', 'paid', 'rejected');

-- Separação do valor cobrado: quanto é do organizador e quanto é da taxa.
ALTER TABLE "Payment" ADD COLUMN "baseAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "feeAmount"  DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Backfill: pagamentos anteriores à taxa foram cobrados integralmente em nome
-- do organizador, então o valor cheio é a base e a taxa é zero.
UPDATE "Payment" SET "baseAmount" = "amount";

-- Override da taxa por evento (NULL = usa o padrão global).
ALTER TABLE "Event" ADD COLUMN "feePercent" DECIMAL(65,30);
ALTER TABLE "Event" ADD COLUMN "feeFixed"   DECIMAL(65,30);

-- Conta de recebimento do organizador.
ALTER TABLE "User" ADD COLUMN "pixKey"            TEXT;
ALTER TABLE "User" ADD COLUMN "pixKeyType"        TEXT;
ALTER TABLE "User" ADD COLUMN "pixHolderName"     TEXT;
ALTER TABLE "User" ADD COLUMN "pixHolderDocument" TEXT;

CREATE TABLE "PayoutRequest" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "amount"            DECIMAL(65,30) NOT NULL,
    "status"            "PayoutStatus" NOT NULL DEFAULT 'requested',
    "pixKey"            TEXT NOT NULL,
    "pixKeyType"        TEXT NOT NULL,
    "pixHolderName"     TEXT NOT NULL,
    "pixHolderDocument" TEXT NOT NULL,
    "notes"             TEXT,
    "receiptUrl"        TEXT,
    "processedBy"       TEXT,
    "processedAt"       TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerEntry" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "eventId"     TEXT,
    "paymentId"   TEXT,
    "payoutId"    TEXT,
    "type"        TEXT NOT NULL,
    "amount"      DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- É esta constraint, e não a checagem de status no service, que garante que um
-- webhook duplicado do Mercado Pago não credite o organizador duas vezes.
CREATE UNIQUE INDEX "LedgerEntry_paymentId_key" ON "LedgerEntry"("paymentId");
CREATE INDEX "LedgerEntry_userId_availableAt_idx" ON "LedgerEntry"("userId", "availableAt");
CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");
CREATE INDEX "PayoutRequest_status_createdAt_idx" ON "PayoutRequest"("status", "createdAt");
CREATE INDEX "PayoutRequest_userId_createdAt_idx" ON "PayoutRequest"("userId", "createdAt");

ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "PayoutRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
