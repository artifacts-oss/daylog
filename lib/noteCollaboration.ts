import { prisma } from '@/prisma/client';
import { encodeHex } from '@/utils/crypto';
import {
  decryptField,
  getSessionEncryptionKey,
  isEncrypted,
} from '@/utils/encryption';

export interface CollabConnection {
  id: string;
  userId: number;
  userName: string;
  controller: ReadableStreamDefaultController;
}

export interface CollabPresence {
  userId: number;
  userName: string;
  line: number;
  updatedAt: number;
}

export interface CollabRoom {
  content: string;
  revision: number;
  connections: Map<string, CollabConnection>;
  presence: Map<number, CollabPresence>;
  initPromise: Promise<string>;
}

export type CollabEventType = 'init' | 'content' | 'presence' | 'leave' | 'ping';

export interface CollabEvent {
  type: CollabEventType;
  data: Record<string, unknown>;
}

const g = globalThis as typeof globalThis & { __noteRooms?: Map<number, CollabRoom> };
if (!g.__noteRooms) g.__noteRooms = new Map();
const noteRooms = g.__noteRooms;

/**
 * Loads the plaintext content of a note for a collaboration room. Rooms always
 * operate on plaintext: clients type and diff plaintext, and persistence back
 * to the DB (with encryption) happens through the updateNote server action.
 *
 * If the note is stored encrypted, the content is decrypted with the session
 * key of the connecting user (the owner). If that is not available (e.g. a
 * share recipient connects first), it falls back to the share snapshot, which
 * is kept in plaintext.
 */
export async function loadNoteRoomContent(
  noteId: number,
  sessionToken?: string | null,
): Promise<string> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  const content = note?.content ?? '';
  if (!isEncrypted(content)) return content;

  if (sessionToken) {
    const key = await getSessionEncryptionKey(encodeHex(sessionToken));
    if (key) {
      try {
        return decryptField(content, key);
      } catch {
        // fall through to the snapshot fallback
      }
    }
  }

  const share = await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: noteId, snapshot: { not: null } },
    orderBy: { canEdit: 'desc' },
    select: { snapshot: true },
  });
  if (share?.snapshot) {
    try {
      const snap = JSON.parse(share.snapshot) as { content?: string };
      if (typeof snap.content === 'string') return snap.content;
    } catch {
      // ignore malformed snapshot
    }
  }

  return content;
}

export async function getOrCreateRoom(
  noteId: number,
  contentLoader: () => Promise<string>,
): Promise<CollabRoom> {
  if (noteRooms.has(noteId)) {
    const room = noteRooms.get(noteId)!;
    await room.initPromise;
    return room;
  }

  const initPromise = contentLoader();
  const room: CollabRoom = {
    content: '',
    revision: 0,
    connections: new Map(),
    presence: new Map(),
    initPromise,
  };
  noteRooms.set(noteId, room);

  room.content = await initPromise;
  return room;
}

export function broadcastToRoom(
  noteId: number,
  event: CollabEvent,
  excludeUserId?: number,
): void {
  const room = noteRooms.get(noteId);
  if (!room) return;

  const message = formatSSE(event.type, event.data);
  for (const conn of room.connections.values()) {
    if (excludeUserId !== undefined && conn.userId === excludeUserId) continue;
    try {
      conn.controller.enqueue(message);
    } catch {
      // Connection is closed; will be cleaned up on abort
    }
  }
}

export function formatSSE(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function getRoomPresence(room: CollabRoom): Record<number, CollabPresence> {
  return Object.fromEntries(room.presence.entries());
}

export function deleteRoom(noteId: number): void {
  noteRooms.delete(noteId);
}
