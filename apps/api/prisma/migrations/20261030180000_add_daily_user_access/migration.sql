CREATE TABLE "daily_user_accesses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "profileType" "ProfileType" NOT NULL,
    "loginCount" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_user_accesses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_user_accesses_loginCount_check" CHECK ("loginCount" > 0)
);
CREATE UNIQUE INDEX "daily_user_accesses_userId_day_key" ON "daily_user_accesses"("userId", "day");
CREATE INDEX "daily_user_accesses_day_profileType_idx" ON "daily_user_accesses"("day", "profileType");
ALTER TABLE "daily_user_accesses" ADD CONSTRAINT "daily_user_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
