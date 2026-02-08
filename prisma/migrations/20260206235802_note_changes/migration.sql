-- CreateTable
CREATE TABLE "NoteChange" (
    "id" SERIAL NOT NULL,
    "noteId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "diffPatch" TEXT NOT NULL,
    "previousContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeComment" (
    "id" SERIAL NOT NULL,
    "changeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoteChange" ADD CONSTRAINT "NoteChange_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteChange" ADD CONSTRAINT "NoteChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeComment" ADD CONSTRAINT "ChangeComment_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "NoteChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeComment" ADD CONSTRAINT "ChangeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
