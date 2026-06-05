import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { NextRequest } from 'next/server';
import { getOrCreateRoom, broadcastToRoom } from '@/lib/noteCollaboration';
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

    const room = await getOrCreateRoom(noteId, async () => {
      const note = await prisma.note.findUnique({ where: { id: noteId } });
      return note?.content ?? '';
    });

    const userName = user.name ?? user.email ?? 'Unknown';
    room.presence.set(user.id, {
      userId: user.id,
      userName,
      line,
      updatedAt: Date.now(),
    });

    broadcastToRoom(
      noteId,
      { type: 'presence', data: { userId: user.id, userName, line } },
      user.id,
    );

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

    const room = await getOrCreateRoom(noteId, async () => {
      const note = await prisma.note.findUnique({ where: { id: noteId } });
      return note?.content ?? '';
    });

    let newContent: string | null = null;

    if (baseRevision === room.revision) {
      newContent = applyPatch(room.content, patch);
    } else if (baseRevision < room.revision) {
      // Try fuzzy OT: apply the patch on top of current content
      newContent = applyPatch(room.content, patch);
    }

    if (newContent === null) {
      // Patch failed — tell client to hard-resync
      return Response.json({
        ok: false,
        content: room.content,
        revision: room.revision,
      });
    }

    // Only update if content actually changed
    if (newContent !== room.content) {
      // Compute the effective patch from current content to new content for broadcasting
      const effectivePatch = computeDiff(room.content, newContent);
      room.content = newContent;
      room.revision += 1;

      broadcastToRoom(
        noteId,
        {
          type: 'content',
          data: {
            revision: room.revision,
            content: room.content,
            patch: effectivePatch,
            authorId: user.id,
          },
        },
        user.id,
      );
    }

    return Response.json({ ok: true, revision: room.revision });
  }

  return Response.json({ error: 'Unknown type' }, { status: 400 });
}
