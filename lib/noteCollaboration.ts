import { prisma } from '@/prisma/client';
import { encodeHex } from '@/utils/crypto';
import {
  decryptField,
  getSessionEncryptionKey,
  isEncrypted,
} from '@/utils/encryption';
import { redis } from './redis';

export interface CollabPresence {
  userId: number;
  userName: string;
  line: number;
  updatedAt: number;
}

export type CollabEventType = 'init' | 'content' | 'presence' | 'leave' | 'ping';

export interface CollabEvent {
  type: CollabEventType;
  data: Record<string, unknown>;
}

const ROOM_TTL_S = 7 * 24 * 60 * 60; // 7 days
const PRESENCE_TTL_S = 24 * 60 * 60; // 1 day

export const eventsChannel = (noteId: number) => `collab:events:${noteId}`;
const roomKey = (noteId: number) => `collab:room:${noteId}`;
const presenceKey = (noteId: number) => `collab:presence:${noteId}`;

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

/**
 * Returns the current room state from Redis, loading from the DB via
 * contentLoader if the key does not exist yet. Uses HSETNX so concurrent
 * connections racing to initialize the same room are safe.
 */
export async function getOrInitRoom(
  noteId: number,
  contentLoader: () => Promise<string>,
): Promise<{ content: string; revision: number }> {
  const key = roomKey(noteId);
  const existing = await redis.hgetall(key);

  if (existing && Object.keys(existing).length > 0) {
    return {
      content: existing.content ?? '',
      revision: parseInt(existing.revision ?? '0', 10),
    };
  }

  const content = await contentLoader();
  const won = await redis.hsetnx(key, 'content', content);
  if (won) {
    await redis.hset(key, 'revision', '0');
    await redis.expire(key, ROOM_TTL_S);
    return { content, revision: 0 };
  }

  // Another instance initialised the room first — read their state.
  const final = await redis.hgetall(key);
  return {
    content: final.content ?? content,
    revision: parseInt(final.revision ?? '0', 10),
  };
}

export async function getRoomState(
  noteId: number,
): Promise<{ content: string; revision: number } | null> {
  const data = await redis.hgetall(roomKey(noteId));
  if (!data || Object.keys(data).length === 0) return null;
  return {
    content: data.content ?? '',
    revision: parseInt(data.revision ?? '0', 10),
  };
}

export async function updateRoomContent(
  noteId: number,
  content: string,
  revision: number,
): Promise<void> {
  const key = roomKey(noteId);
  await redis.hset(key, 'content', content, 'revision', String(revision));
  await redis.expire(key, ROOM_TTL_S);
}

export async function setPresence(
  noteId: number,
  userId: number,
  userName: string,
  line: number,
): Promise<void> {
  const key = presenceKey(noteId);
  const entry: CollabPresence = { userId, userName, line, updatedAt: Date.now() };
  await redis.hset(key, String(userId), JSON.stringify(entry));
  await redis.expire(key, PRESENCE_TTL_S);
}

export async function removePresence(noteId: number, userId: number): Promise<void> {
  await redis.hdel(presenceKey(noteId), String(userId));
}

export async function getAllPresence(
  noteId: number,
): Promise<Record<string, CollabPresence>> {
  const data = await redis.hgetall(presenceKey(noteId));
  if (!data) return {};
  const result: Record<string, CollabPresence> = {};
  for (const [uid, json] of Object.entries(data)) {
    try {
      result[uid] = JSON.parse(json) as CollabPresence;
    } catch {
      // skip malformed entry
    }
  }
  return result;
}

export async function publishEvent(noteId: number, event: CollabEvent): Promise<void> {
  await redis.publish(eventsChannel(noteId), JSON.stringify(event));
}

export function formatSSE(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
