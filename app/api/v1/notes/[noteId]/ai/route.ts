import { getCurrentSession } from '@/app/login/lib/actions';
import { NextRequest } from 'next/server';
import { hasEditAccess } from '@/lib/noteCollaboration';
import {
  AI_MAX_INPUT_CHARS,
  AI_MAX_INSTRUCTION_CHARS,
  isAiAction,
  isAiEnabled,
  streamAiText,
} from '@/lib/ai';
import { aiRateLimiter, getRateLimitHeaders } from '@/utils/rateLimit';
import { parseId } from '@/utils/parseId';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  if (!isAiEnabled()) {
    return Response.json({ error: 'AI is not configured' }, { status: 404 });
  }

  const { user } = await getCurrentSession(req);
  if (!user) {
    return Response.json({ error: 'Not allowed' }, { status: 401 });
  }

  const { noteId: noteIdStr } = await params;
  const noteId = parseId(noteIdStr);
  if (Number.isNaN(noteId)) {
    return Response.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  if (!(await hasEditAccess(noteId, user.id))) {
    return Response.json({ error: 'Not allowed' }, { status: 403 });
  }

  const limit = aiRateLimiter.isAllowed(`ai:${user.id}`);
  if (!limit.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(limit.resetTime, limit.remaining) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, text, instruction } = (body ?? {}) as Record<string, unknown>;
  if (
    !isAiAction(action) ||
    typeof text !== 'string' ||
    (instruction !== undefined && typeof instruction !== 'string') ||
    (action === 'custom' && !instruction?.trim())
  ) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (
    text.length > AI_MAX_INPUT_CHARS ||
    (instruction?.length ?? 0) > AI_MAX_INSTRUCTION_CHARS
  ) {
    return Response.json({ error: 'Input too large' }, { status: 413 });
  }

  // Client sends the live editor text (it may include unsaved or decrypted content).
  const abort = new AbortController();
  const chunks = streamAiText(action, text, instruction, abort.signal);
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        console.error('AI stream error:', error);
        controller.error(error);
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
