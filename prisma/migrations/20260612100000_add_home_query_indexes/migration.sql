-- CreateIndex
CREATE INDEX "Board_userId_createdAt_idx" ON "Board"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Board_userId_updatedAt_idx" ON "Board"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Note_boardsId_createdAt_idx" ON "Note"("boardsId", "createdAt");
