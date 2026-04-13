-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "password" TEXT,
    "expiresAt" TIMESTAMP(3),
    "oneTime" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareView" (
    "id" SERIAL NOT NULL,
    "shareId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Share_entityId_entityType_idx" ON "Share"("entityId", "entityType");

-- CreateIndex
CREATE INDEX "ShareView_shareId_idx" ON "ShareView"("shareId");

-- CreateIndex
CREATE INDEX "ShareView_viewerId_idx" ON "ShareView"("viewerId");

-- AddForeignKey
ALTER TABLE "ShareView" ADD CONSTRAINT "ShareView_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;
