export const dynamic = 'force-dynamic';
// Extend Vercel serverless function timeout to reduce SSE reconnect frequency
export const maxDuration = 300;

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { NextRequest } from 'next/server';
import {
  getOrInitRoom,
  getAllPresence,
  removePresence,
  publishEvent,
  formatSSE,
  eventsChannel,
  loadNoteRoomContent,
  type CollabEvent,
} from '@/lib/noteCollaboration';
import { createSubscriber } from '@/lib/redis';

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

  const sessionToken = req.cookies.get('session')?.value;
  const { content, revision } = await getOrInitRoom(noteId, () =>
    loadNoteRoomContent(noteId, sessionToken),
  );
  const presence = await getAllPresence(noteId);

  // Each SSE connection gets its own Redis subscriber connection.
  const subscriber = createSubscriber();
  const pendingSSE: string[] = [];
  let streamController: ReadableStreamDefaultController | null = null;

  // Set up the message handler before subscribing to avoid missing events
  // that arrive between subscribe() and the ReadableStream start() call.
  subscriber.on('message', (_channel, rawMessage) => {
    try {
      const event = JSON.parse(rawMessage) as CollabEvent;
      const sseStr = formatSSE(event.type, event.data);
      if (streamController) {
        try {
          streamController.enqueue(sseStr);
        } catch {
          // Stream closed; cleanup will fire via cancel()
        }
      } else {
        pendingSSE.push(sseStr);
      }
    } catch {
      // Ignore malformed Redis messages
    }
  });

  await subscriber.subscribe(eventsChannel(noteId));

  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const cleanup = async () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    try {
      await subscriber.unsubscribe();
      subscriber.quit();
    } catch {
      // Ignore errors on teardown
    }
    await removePresence(noteId, user.id);
    await publishEvent(noteId, { type: 'leave', data: { userId: user.id } });
  };

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;

      // Drain any events that arrived before start() was called
      for (const msg of pendingSSE.splice(0)) {
        try {
          controller.enqueue(msg);
        } catch {
          // ignore
        }
      }

      // Send initial state (exclude self from presence)
      const presenceWithoutSelf = Object.fromEntries(
        Object.entries(presence).filter(([uid]) => parseInt(uid) !== user.id),
      );
      controller.enqueue(
        formatSSE('init', { revision, content, presence: presenceWithoutSelf }),
      );

      // Keep-alive ping every 30 s; also detects dead connections
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(formatSSE('ping', {}));
        } catch {
          void cleanup();
        }
      }, 30_000);
    },
    cancel() {
      return cleanup();
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
