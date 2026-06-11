import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { NextRequest } from 'next/server';
import {
  getOrInitRoom,
  updateRoomContent,
  setPresence,
  publishEvent,
  loadNoteRoomContent,
} from '@/lib/noteCollaboration';
import { computeDiff, applyPatch } from '@/utils/diff';

const MAX_PATCH_SIZE = 64 * 1024; // 64 KB

async function hasEditAccess(noteId: number, userId: number): Promise<boolean> {
  const asOwner = await prisma.note.findFirst({
    where: { id: noteId, boards: { userId } },
  });
  if (asOwner) return true;

  const asEditRecipient = await prisma.share.findFirst({
    where: {
      entityType: 'NOTE',
      entityId: noteId,
      canEdit: true,
      scope: 'SPECIFIC',
      recipients: { some: { userId } },
    },
  });
  return !!asEditRecipient;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const { user } = await getCurrentSession(req);
  if (!user) {
    return Response.json({ error: 'Not allowed' }, { status: 401 });
  }

  const { noteId: noteIdStr } = await params;
  const noteId = parseInt(noteIdStr);
  if (isNaN(noteId)) {
    return Response.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { type } = body as Record<string, unknown>;

  if (type === 'presence') {
    // Any viewer can send presence
    const { line } = body as { line: unknown };
    if (typeof line !== 'number') {
      return Response.json({ error: 'Invalid line' }, { status: 400 });
    }

    const userName = user.name ?? user.email ?? 'Unknown';
    await setPresence(noteId, user.id, userName, line);
    await publishEvent(noteId, {
      type: 'presence',
      data: { userId: user.id, userName, line },
    });

    return Response.json({ ok: true });
  }

  if (type === 'content') {
    const canEdit = await hasEditAccess(noteId, user.id);
    if (!canEdit) {
      return Response.json({ error: 'Not allowed' }, { status: 403 });
    }

    const { baseRevision, patch } = body as {
      baseRevision: unknown;
      patch: unknown;
    };

    if (typeof baseRevision !== 'number' || typeof patch !== 'string') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (patch.length > MAX_PATCH_SIZE) {
      return Response.json({ error: 'Patch too large' }, { status: 413 });
    }

    const sessionToken = req.cookies.get('session')?.value;
    const { content, revision } = await getOrInitRoom(noteId, () =>
      loadNoteRoomContent(noteId, sessionToken),
    );

    let newContent: string | null = null;
    if (baseRevision === revision || baseRevision < revision) {
      newContent = applyPatch(content, patch);
    }

    if (newContent === null) {
      // Patch failed — tell client to hard-resync
      return Response.json({ ok: false, content, revision });
    }

    if (newContent !== content) {
      const effectivePatch = computeDiff(content, newContent);
      const newRevision = revision + 1;

      await updateRoomContent(noteId, newContent, newRevision);
      await publishEvent(noteId, {
        type: 'content',
        data: {
          revision: newRevision,
          content: newContent,
          patch: effectivePatch,
          authorId: user.id,
        },
      });

      return Response.json({ ok: true, revision: newRevision });
    }

    return Response.json({ ok: true, revision });
  }

  return Response.json({ error: 'Unknown type' }, { status: 400 });
}
