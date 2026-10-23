-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('personal', 'business');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'BUSINESS', 'ADMIN');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "profileType" "ProfileType" NOT NULL DEFAULT 'personal',
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "avatar" VARCHAR(500),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorHandle" VARCHAR(100) NOT NULL,
    "authorAvatar" VARCHAR(500),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "location" VARCHAR(200),
    "content" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'following',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaUrl" VARCHAR(500),
    "productName" VARCHAR(200),
    "productPrice" DOUBLE PRECISION,
    "productBadge" VARCHAR(50),
    "productStock" VARCHAR(100),
    "productDetails" TEXT,
    "productImage" VARCHAR(500),
    "likes" INTEGER NOT NULL DEFAULT 0,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "store" VARCHAR(200) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Disponible',
    "image" VARCHAR(500),
    "contactPhone" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "clientMessageId" VARCHAR(100),
    "productId" TEXT,
    "productName" VARCHAR(200),
    "productImage" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_requesterId_addresseeId_key" ON "friendships"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");

-- CreateIndex
CREATE INDEX "posts_category_idx" ON "posts"("category");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_district_idx" ON "products"("district");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "messages_senderId_recipientId_createdAt_idx" ON "messages"("senderId", "recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_createdAt_idx" ON "messages"("recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "messages_senderId_clientMessageId_key" ON "messages"("senderId", "clientMessageId");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
