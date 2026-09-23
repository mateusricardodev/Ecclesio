-- Modelo de autorização de responsável enviado pelo organizador de cada evento
-- (antes era um PDF fixo, igual para todos os eventos).
ALTER TABLE "Event" ADD COLUMN "authorizationFormUrl" TEXT;
