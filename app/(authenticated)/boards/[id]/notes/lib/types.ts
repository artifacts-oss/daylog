import { Prisma } from '@/prisma/generated/client';

export type NoteWithBoards = Prisma.NoteGetPayload<{
  include: { boards: true };
}>;

export type NoteChangeWithUser = Prisma.NoteChangeGetPayload<{
  include: {
    user: true;
    comments: {
      include: {
        user: true;
      };
    };
  };
}>;

export type ChangeCommentWithUser = Prisma.ChangeCommentGetPayload<{
  include: { user: true };
}>;
