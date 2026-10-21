import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAiUserPrompt,
  isAiAction,
  isAiEnabled,
  parseChatCompletionStream,
  streamAiText,
} from './ai';

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect(stream: AsyncGenerator<string>): Promise<string> {
  let result = '';
  for await (const chunk of stream) result += chunk;
  return result;
}

const delta = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

describe('ai helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('wraps the note and appends the action instruction', () => {
    const prompt = buildAiUserPrompt('summarize', '# Title');
    expect(prompt.startsWith('<note>\n# Title\n</note>\n\n')).toBe(true);
    expect(prompt).toContain('Summary');
  });

  it('uses the user instruction for custom actions', () => {
    expect(buildAiUserPrompt('custom', 'Hi', '  translate  ')).toBe(
      '<note>\nHi\n</note>\n\ntranslate',
    );
  });

  it('validates actions', () => {
    expect(isAiAction('improve')).toBe(true);
    expect(isAiAction('drop tables')).toBe(false);
    expect(isAiAction(undefined)).toBe(false);
  });

  it('is enabled by either provider', () => {
    vi.stubEnv('AI_BASE_URL', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(isAiEnabled()).toBe(false);
    vi.stubEnv('AI_BASE_URL', 'http://localhost:8080/v1');
    expect(isAiEnabled()).toBe(true);
    vi.stubEnv('AI_BASE_URL', '');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    expect(isAiEnabled()).toBe(true);
  });

  it('parses SSE chunks split at arbitrary boundaries', async () => {
    const raw = `: keep-alive\n\n${delta('Hel')}data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n${delta('lo')}data: [DONE]\n\n${delta('ignored')}`;
    const parts = [raw.slice(0, 7), raw.slice(7, 40), raw.slice(40, 41), raw.slice(41)];
    expect(await collect(parseChatCompletionStream(sseBody(parts)))).toBe('Hello');
  });

  it('parses a final line without trailing newline', async () => {
    const raw = delta('a').trimEnd();
    expect(await collect(parseChatCompletionStream(sseBody([raw])))).toBe('a');
  });

  it('streams from an OpenAI-compatible server', async () => {
    vi.stubEnv('AI_BASE_URL', 'http://localhost:8080/v1/');
    vi.stubEnv('AI_API_KEY', 'local-key');
    vi.stubEnv('AI_MODEL', 'qwen');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(sseBody([delta('Hi'), 'data: [DONE]\n\n'])));
    vi.stubGlobal('fetch', fetchMock);

    const text = await collect(
      streamAiText('summarize', 'note', undefined, new AbortController().signal),
    );

    expect(text).toBe('Hi');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer local-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('qwen');
    expect(body.stream).toBe(true);
    expect(body.messages[1].content).toContain('<note>\nnote\n</note>');
  });

  it('throws when the OpenAI-compatible server fails', async () => {
    vi.stubEnv('AI_BASE_URL', 'http://localhost:11434/v1');
    vi.stubEnv('AI_API_KEY', '');
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      collect(streamAiText('continue', 'x', undefined, new AbortController().signal)),
    ).rejects.toThrow('status 500');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
