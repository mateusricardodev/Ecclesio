-- AlterTable
ALTER TABLE "User" ADD COLUMN "hasPassword" BOOLEAN NOT NULL DEFAULT true;

-- Contas cuja senha é aleatória: contas-sombra e contas criadas pelo login com
-- Google (lançado em 2026-10-07). Contas antigas que só vincularam o Google
-- continuam com a senha que a pessoa escolheu.
UPDATE "User" SET "hasPassword" = false
WHERE "isShadow" = true
   OR ("googleId" IS NOT NULL AND "createdAt" >= '2026-10-07');
