ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "clientMessageId" VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS "messages_senderId_clientMessageId_key" ON "messages"("senderId", "clientMessageId");
