export const dynamic = 'force-dynamic';

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { NextRequest } from 'next/server';
import {
  getOrCreateRoom,
  broadcastToRoom,
  deleteRoom,
  formatSSE,
  getRoomPresence,
  loadNoteRoomContent,
} from '@/lib/noteCollaboration';
import { randomUUID } from 'crypto';

async function hasNoteAccess(noteId: number, userId: number): Promise<boolean> {
  const asOwner = await prisma.note.findFirst({
    where: { id: noteId, boards: { userId } },
  });
  if (asOwner) return true;

  const asRecipient = await prisma.share.findFirst({
    where: {
      entityType: 'NOTE',
      entityId: noteId,
      recipients: { some: { userId } },
    },
  });
  return !!asRecipient;
}

export async function GET(
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

  const canAccess = await hasNoteAccess(noteId, user.id);
  if (!canAccess) {
    return Response.json({ error: 'Not allowed' }, { status: 403 });
  }

  const userName = user.name ?? user.email ?? 'Unknown';

  const sessionToken = req.cookies.get('session')?.value;
  const room = await getOrCreateRoom(noteId, () =>
    loadNoteRoomContent(noteId, sessionToken),
  );

  const connectionId = randomUUID();
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      room.connections.set(connectionId, {
        id: connectionId,
        userId: user.id,
        userName,
        controller,
      });

      // Send initial state
      controller.enqueue(
        formatSSE('init', {
          revision: room.revision,
          content: room.content,
          presence: getRoomPresence(room),
        }),
      );

      // Keep-alive ping every 30 seconds; also detects dead connections
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(formatSSE('ping', {}));
        } catch {
          // Client disconnected without a clean close — evict it now
          if (pingInterval) clearInterval(pingInterval);
          room.connections.delete(connectionId);
          room.presence.delete(user.id);
          broadcastToRoom(noteId, { type: 'leave', data: { userId: user.id } });
          if (room.connections.size === 0) deleteRoom(noteId);
        }
      }, 30_000);
    },
    cancel() {
      if (pingInterval) clearInterval(pingInterval);
      room.connections.delete(connectionId);
      room.presence.delete(user.id);
      broadcastToRoom(noteId, { type: 'leave', data: { userId: user.id } });
      if (room.connections.size === 0) deleteRoom(noteId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
