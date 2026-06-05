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
