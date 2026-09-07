-- Pesquisa de satisfação pós-evento.
-- `feedbackItems` guarda a lista de itens avaliados (JSON de strings); NULL
-- significa "usar a lista padrão" definida no código.
ALTER TABLE "Event" ADD COLUMN "feedbackItems" TEXT;
ALTER TABLE "Event" ADD COLUMN "feedbackOpen" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EventFeedback" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrationId" TEXT,
    "respondentName" TEXT,
    "ratings" TEXT NOT NULL,
    "improvements" TEXT,
    "negatives" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);

-- Uma resposta por inscrição. Respostas anônimas (link público genérico) ficam
-- com registrationId NULL e não conflitam entre si no índice único do Postgres.
CREATE UNIQUE INDEX "EventFeedback_registrationId_key" ON "EventFeedback"("registrationId");
CREATE INDEX "EventFeedback_eventId_idx" ON "EventFeedback"("eventId");

ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_registrationId_fkey"
    FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
