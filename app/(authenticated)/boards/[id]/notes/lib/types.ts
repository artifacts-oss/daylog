import { Prisma } from "@/prisma/generated/client";

export type NoteWithBoards = Prisma.NoteGetPayload<{
    include: { boards: true };
}>;
