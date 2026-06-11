'use client';

import { Note } from '@/prisma/generated/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { computeDiff, applyPatch } from '@/utils/diff';
import Editor from './Editor';

export type PresenceEntry = {
  userId: number;
  userName: string;
  line: number;
  color: string;
};

const USER_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

function getUserColor(userId: number): string {
  return USER_COLORS[userId % USER_COLORS.length];
}

type CollabEditorProps = {
  note: Note;
  isOwner?: boolean;
  canDeleteHistory?: boolean;
  currentUserId: number;
  currentUserName: string;
  enableCollab: boolean;
};

type CollabState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING';

export default function CollabEditor({
  note,
  isOwner,
  canDeleteHistory,
  currentUserId,
  enableCollab,
}: CollabEditorProps) {
  const [remoteContent, setRemoteContent] = useState<string | null>(null);
  const [presenceMap, setPresenceMap] = useState<Map<number, PresenceEntry>>(
    new Map(),
  );
  const [collabState, setCollabState] = useState<CollabState>('DISCONNECTED');

  // collabStateRef mirrors collabState so callbacks can read it without stale closures
  const collabStateRef = useRef<CollabState>('DISCONNECTED');
  const revisionRef = useRef<number>(0);
  // lastSyncedContentRef: the content both sides last agreed on (used as diff base)
  const lastSyncedContentRef = useRef<string>(note.content ?? '');
  // localContentRef: the user's current local content (updated on every keystroke)
  const localContentRef = useRef<string>(note.content ?? '');
  const reconnectAttempts = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLineRef = useRef<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const updateCollabState = useCallback((state: CollabState) => {
    collabStateRef.current = state;
    setCollabState(state);
  }, []);

  // Send the accumulated local diff to the server.
  // lastSyncedContentRef is updated BEFORE the fetch (optimistic) so that
  // subsequent keystrokes compute diffs from the right base even when the
  // server hasn't responded yet.
  const flushPatch = useCallback((keepalive = false) => {
    if (collabStateRef.current !== 'CONNECTED') return;
    const newContent = localContentRef.current;
    const patch = computeDiff(lastSyncedContentRef.current, newContent);
    if (!patch) return;

    const baseRevision = revisionRef.current;
    lastSyncedContentRef.current = newContent; // optimistic update

    fetch(`/api/v1/notes/${note.id}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'content', baseRevision, patch }),
      keepalive,
    })
      .then((r) => r.json())
      .then((data: { ok: boolean; revision?: number; content?: string }) => {
        if (data.ok && data.revision !== undefined) {
          revisionRef.current = data.revision;
        } else if (!data.ok && data.content !== undefined) {
          // Server couldn't merge: reset to authoritative content
          lastSyncedContentRef.current = data.content;
          localContentRef.current = data.content;
          if (data.revision !== undefined) revisionRef.current = data.revision;
          setRemoteContent(data.content);
        }
      })
      .catch(() => {});
  }, [note.id]);

  // Debounce patch sends: batch keystrokes within 100 ms into a single diff
  const schedulePatch = useCallback(() => {
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    patchTimerRef.current = setTimeout(() => {
      patchTimerRef.current = null;
      flushPatch();
    }, 100);
  }, [flushPatch]);

  // Stable callback passed to Editor — does NOT depend on collabState so
  // Editor's saveContent is never unnecessarily recreated on state transitions.
  const handleContentChange = useCallback(
    (newContent: string) => {
      localContentRef.current = newContent;
      if (collabStateRef.current !== 'CONNECTED') return;
      schedulePatch();
    },
    [schedulePatch],
  );

  // Debounced presence: send the latest cursor line after 300 ms of stillness
  const handleCursorLineChange = useCallback(
    (line: number) => {
      if (collabStateRef.current !== 'CONNECTED') return;
      pendingLineRef.current = line;
      if (presenceTimerRef.current) return; // already scheduled; latest line in ref
      presenceTimerRef.current = setTimeout(() => {
        presenceTimerRef.current = null;
        const lineToSend = pendingLineRef.current;
        if (lineToSend === null) return;
        pendingLineRef.current = null;
        fetch(`/api/v1/notes/${note.id}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'presence', line: lineToSend }),
        }).catch(() => {});
      }, 300);
    },
    [note.id],
  );

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    updateCollabState('CONNECTING');
    const es = new EventSource(`/api/v1/notes/${note.id}/stream`);
    esRef.current = es;

    es.addEventListener('init', (e) => {
      const data = JSON.parse(e.data) as {
        revision: number;
        content: string;
        presence: Record<
          string,
          { userId: number; userName: string; line: number }
        >;
      };
      revisionRef.current = data.revision;

      // If server content differs from local (e.g. first connect when another
      // user already edited, or reconnect after a disconnect), merge the
      // server's changes on top of any local edits made during connecting.
      if (data.content !== localContentRef.current) {
        const remotePatch = computeDiff(
          lastSyncedContentRef.current,
          data.content,
        );
        const merged =
          applyPatch(localContentRef.current, remotePatch) ?? data.content;
        localContentRef.current = merged;
        setRemoteContent(merged);
      }

      lastSyncedContentRef.current = data.content;
      reconnectAttempts.current = 0;
      updateCollabState('CONNECTED');

      // Flush any edits the user accumulated while connecting
      if (localContentRef.current !== data.content) {
        schedulePatch();
      }

      const newPresence = new Map<number, PresenceEntry>();
      for (const entry of Object.values(data.presence)) {
        if (entry.userId !== currentUserId) {
          newPresence.set(entry.userId, {
            ...entry,
            color: getUserColor(entry.userId),
          });
        }
      }
      setPresenceMap(newPresence);
    });

    es.addEventListener('content', (e) => {
      const data = JSON.parse(e.data) as {
        revision: number;
        content: string;
        patch: string;
        authorId: number;
      };
      if (data.authorId === currentUserId) return;

      revisionRef.current = data.revision;

      // Three-way merge: rebase the remote change on top of local edits
      const remotePatch = computeDiff(
        lastSyncedContentRef.current,
        data.content,
      );
      const merged =
        applyPatch(localContentRef.current, remotePatch) ?? data.content;

      lastSyncedContentRef.current = data.content;
      localContentRef.current = merged;
      setRemoteContent(merged);
    });

    es.addEventListener('presence', (e) => {
      const data = JSON.parse(e.data) as {
        userId: number;
        userName: string;
        line: number;
      };
      if (data.userId === currentUserId) return;
      setPresenceMap((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { ...data, color: getUserColor(data.userId) });
        return next;
      });
    });

    es.addEventListener('leave', (e) => {
      const data = JSON.parse(e.data) as { userId: number };
      setPresenceMap((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      updateCollabState('RECONNECTING');
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
      reconnectAttempts.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [note.id, currentUserId, updateCollabState, schedulePatch]);

  useEffect(() => {
    if (!enableCollab) return;
    const handleBeforeUnload = () => flushPatch(true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enableCollab, flushPatch]);

  useEffect(() => {
    if (!enableCollab) return;
    connect();
    return () => {
      // Flush any buffered keystrokes before the SSE connection closes
      if (patchTimerRef.current) {
        clearTimeout(patchTimerRef.current);
        patchTimerRef.current = null;
        flushPatch();
      }
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    };
  }, [enableCollab, connect, flushPatch]);

  const presenceEntries = Array.from(presenceMap.values());

  return (
    <Editor
      note={note}
      isOwner={isOwner}
      canDeleteHistory={canDeleteHistory}
      currentUserId={currentUserId}
      remoteContent={enableCollab ? remoteContent : null}
      onContentChange={enableCollab ? handleContentChange : undefined}
      onCursorLineChange={enableCollab ? handleCursorLineChange : undefined}
      presenceUsers={enableCollab && collabState === 'CONNECTED' ? presenceEntries : undefined}
    />
  );
}
